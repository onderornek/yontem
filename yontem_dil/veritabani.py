"""Yöntem Veritabanı birimi — SQL veritabanlarına tek bir arayüzle erişim.

JavaScript sürümüyle (js/src/calisma/veritabani.ts, js/src/vt_dugum.ts) aynı arayüzü, aynı tip dönüşümlerini
ve hata iletilerini sağlar. SQLite Python'un standart kitaplığıyla çalışır. PostgreSQL için 'pg8000', MySQL için
'pymysql' paketi gerekir (ikisi de saf Python'dur): pip install pg8000 pymysql
"""
import os
import re

from .hatalar import YontemHatasi
from .pencere import _yf


def _hata(m):
    raise YontemHatasi(m)


def _tur_adi(v):
    from .yorumlayici import tur_adi
    return tur_adi(v)


def _vt_hata(e):
    _hata('Veritabanı hatası: ' + str(e).split('\n')[0])


def adres_coz(adres):
    m = re.match(r'^([a-zA-Z]+):(.*)$', adres, re.S)
    if not m:
        _hata("Veritabanı adresi 'tür:hedef' biçiminde olmalı (ör. 'sqlite:veri.db', "
              "'postgres://kullanıcı:parola@sunucu/veritabanı')")
    t = m.group(1).lower()
    tur = {'sqlite': 'sqlite', 'postgres': 'postgres', 'postgresql': 'postgres', 'mysql': 'mysql', 'mariadb': 'mysql'}.get(t)
    if not tur:
        _hata(f"Bilinmeyen veritabanı türü: '{m.group(1)}' (sqlite, postgres, mysql)")
    if tur == 'sqlite':
        h = m.group(2)
        if not h:
            _hata("SQLite için dosya adı gerekli: 'sqlite:veri.db' (bellekte geçici veritabanı için 'sqlite::bellek:')")
        return tur, (':memory:' if h in (':bellek:', ':memory:') else h)
    if not m.group(2).startswith('//'):
        _hata(f"Adres '{t}://kullanıcı:parola@sunucu/veritabanı' biçiminde olmalı")
    return tur, adres


def yer_tutucular(sql, cevir):
    """'?' yer tutucularını çevirir; metin sabitleri, tırnaklı adlar ve yorumların içindekilere dokunmaz.
    cevir(None) düz metin parçalarını da dönüştürebilir (ör. '%' → '%%')."""
    out, n, i = [], 0, 0
    while i < len(sql):
        c = sql[i]
        if c in '\'"`':
            j = i + 1
            while j < len(sql):
                if sql[j] == c:
                    if sql[j + 1:j + 2] == c:
                        j += 2
                        continue
                    break
                j += 1
            out.append(cevir(None, sql[i:j + 1]))
            i = j + 1
        elif sql.startswith('--', i):
            j = sql.find('\n', i)
            s = len(sql) if j < 0 else j
            out.append(cevir(None, sql[i:s]))
            i = s
        elif sql.startswith('/*', i):
            j = sql.find('*/', i + 2)
            s = len(sql) if j < 0 else j + 2
            out.append(cevir(None, sql[i:s]))
            i = s
        elif c == '?':
            n += 1
            out.append(cevir(n, None))
            i += 1
        else:
            out.append(cevir(None, c))
            i += 1
    return ''.join(out)


# ---------------------------------------------------------------- sürücüler
class _Sqlite:
    def __init__(self, hedef):
        import sqlite3
        self.c = sqlite3.connect(hedef if hedef == ':memory:' else os.path.abspath(hedef), isolation_level=None)

    def calistir(self, sql, p):
        once = self.c.total_changes
        cur = self.c.execute(sql, [int(x) if type(x) is bool else x for x in p])
        adlar = [d[0] for d in cur.description] if cur.description else []
        satirlar = [[(a, v.hex() if isinstance(v, (bytes, bytearray)) else v) for a, v in zip(adlar, s)] for s in cur.fetchall()] if adlar else []
        # aynı adlı sütunlarda son değer geçerlidir (JavaScript sürümüyle aynı)
        return satirlar, self.c.total_changes - once

    def son_kimlik(self):
        return self.c.execute('SELECT last_insert_rowid()').fetchone()[0]

    def kapat(self):
        self.c.close()


class _Postgres:
    def __init__(self, hedef):
        try:
            import pg8000.native
        except ImportError:
            raise RuntimeError("PostgreSQL için 'pg8000' paketi gerekli: pip install pg8000")
        from urllib.parse import urlparse, unquote
        u = urlparse(hedef)
        self.c = pg8000.native.Connection(user=unquote(u.username or ''), password=unquote(u.password) if u.password else None,
                                          host=u.hostname or 'localhost', port=u.port or 5432,
                                          database=unquote(u.path.lstrip('/')) or None, timeout=15)
        # tarih, saat, json, uuid gibi tipler sunucunun yazdığı metin olarak kalsın
        for oid in (1082, 1083, 1114, 1184, 1266, 1186, 114, 3802, 2950, 17):
            self.c.register_in_adapter(oid, lambda v: v)

    def calistir(self, sql, p):
        import decimal
        adlar = {}
        metin = yer_tutucular(sql, lambda n, parca: f':p{n}' if n else parca)
        satirlar = self.c.run(metin, **{f'p{i + 1}': v for i, v in enumerate(p)})
        sutunlar = [s['name'] for s in (self.c.columns or [])]

        def cevir(v):
            if v is None or type(v) in (bool, int, float, str):
                return v
            if isinstance(v, decimal.Decimal):
                return float(v)
            return str(v)
        if sutunlar:
            return [[(a, cevir(v)) for a, v in zip(sutunlar, s)] for s in (satirlar or [])], 0
        return [], max(self.c.row_count or 0, 0)

    def son_kimlik(self):
        raise RuntimeError("PostgreSQL'de SonKimlik yoktur; INSERT … RETURNING kullanın")

    def kapat(self):
        self.c.close()


class _Mysql:
    def __init__(self, hedef):
        try:
            import pymysql
        except ImportError:
            raise RuntimeError("MySQL için 'pymysql' paketi gerekli: pip install pymysql")
        from urllib.parse import urlparse, unquote
        u = urlparse(hedef)
        # yalnızca gönderme çeviricileri: değerler sunucudan metin olarak gelir, sütun tipine göre burada çevrilir
        from pymysql.converters import encoders
        self.c = pymysql.connect(host=u.hostname or 'localhost', port=u.port or 3306, user=unquote(u.username or ''),
                                 password=unquote(u.password or ''), database=unquote(u.path.lstrip('/')) or None,
                                 charset='utf8mb4', autocommit=True, connect_timeout=15, conv=dict(encoders))
        self.kimlik = 0

    def calistir(self, sql, p):
        metin = yer_tutucular(sql, lambda n, parca: '%s' if n else parca.replace('%', '%%'))
        with self.c.cursor() as cur:
            n = cur.execute(metin, [('1' if x else '0') if type(x) is bool else x for x in p] if p else None) if p else cur.execute(sql)
            if cur.description:
                TAM, ONDALIK = {1, 2, 3, 8, 9, 13}, {0, 4, 5, 246}

                def cevir(v, tip):
                    if v is None:
                        return None
                    s = v.decode('utf-8') if isinstance(v, (bytes, bytearray)) else str(v)
                    return int(s) if tip in TAM else float(s) if tip in ONDALIK else s
                d = cur.description
                return [[(d[i][0], cevir(v, d[i][1])) for i, v in enumerate(s)] for s in cur.fetchall()], 0
            if cur.lastrowid:
                self.kimlik = cur.lastrowid
            return [], n or 0

    def son_kimlik(self):
        return self.kimlik

    def kapat(self):
        self.c.close()


_SURUCULER = {'sqlite': _Sqlite, 'postgres': _Postgres, 'mysql': _Mysql}


class Baglanti:
    TUR_ADI = 'Bağlantı'

    def __init__(self, surucu, tur):
        self.s = surucu
        self.tur = tur
        self.acik = True

    def _calistir(self, ad, sql, p):
        if not self.acik:
            _hata('Bağlantı kapalı')
        if type(sql) is not str:
            _hata(f"'{ad}' SQL metni bekler, {_tur_adi(sql)} verildi")
        if not sql.strip():
            _hata(f"'{ad}': SQL metni boş")
        if p is None:
            p = []
        elif type(p) is not list:
            _hata(f"'{ad}': parametreler liste olmalı, {_tur_adi(p)} verildi")
        for i, x in enumerate(p):
            if not (x is None or type(x) in (int, float, str, bool)):
                _hata(f"'{ad}': {i + 1}. parametre {_tur_adi(x)} olamaz (tamsayı, ondalık, metin, mantıksal ya da boş olmalı)")
        try:
            return self.s.calistir(sql, p)
        except YontemHatasi:
            raise
        except Exception as e:
            _vt_hata(e)

    def k_al(self, ad, y):
        if ad == 'tur':
            return self.tur
        if ad == 'acik':
            return self.acik
        if ad == 'calistir':
            return _yf('Çalıştır', 1, 2, lambda sql, p=None: self._calistir('Çalıştır', sql, p)[1])
        if ad == 'sorgula':
            return _yf('Sorgula', 1, 2, lambda sql, p=None: [dict(s) for s in self._calistir('Sorgula', sql, p)[0]])
        if ad == 'teksatir':
            def tek(sql, p=None):
                s = self._calistir('TekSatır', sql, p)[0]
                return dict(s[0]) if s else None
            return _yf('TekSatır', 1, 2, tek)
        if ad == 'tekdeger':
            def deger(sql, p=None):
                s = self._calistir('TekDeğer', sql, p)[0]
                return s[0][0][1] if s and s[0] else None
            return _yf('TekDeğer', 1, 2, deger)
        if ad == 'sonkimlik':
            def kimlik():
                if not self.acik:
                    _hata('Bağlantı kapalı')
                try:
                    return self.s.son_kimlik()
                except Exception as e:
                    _vt_hata(e)
            return _yf('SonKimlik', 0, 0, kimlik, True)
        if ad == 'islembaslat':
            return _yf('İşlemBaşlat', 0, 0, lambda: self._calistir('İşlemBaşlat', 'START TRANSACTION' if self.tur == 'mysql' else 'BEGIN', None) and None, True)
        if ad == 'onayla':
            return _yf('Onayla', 0, 0, lambda: self._calistir('Onayla', 'COMMIT', None) and None, True)
        if ad == 'gerial':
            return _yf('GeriAl', 0, 0, lambda: self._calistir('GeriAl', 'ROLLBACK', None) and None, True)
        if ad == 'kapat':
            def kapat():
                if self.acik:
                    self.acik = False
                    try:
                        self.s.kapat()
                    except Exception as e:
                        _vt_hata(e)
            return _yf('Kapat', 0, 0, kapat, True)
        _hata(f"Bağlantı nesnesinde '{ad}' üyesi yok")

    def k_ata(self, ad, v, y):
        _hata(f"Bağlantı nesnesinin '{ad}' üyesine atama yapılamaz")

    def __str__(self):
        return f"Bağlantı({self.tur}{'' if self.acik else ', kapalı'})"


def veritabani_modulu(y):
    from .sozcuk import katla
    U = {}

    def uye(ad, en_az, en_cok):
        def sar(f):
            U[katla(ad)] = _yf(ad, en_az, en_cok, f)
            return f
        return sar

    @uye('Bağlan', 1, 1)
    def _baglan(adres):
        if type(adres) is not str:
            _hata(f"'Bağlan' metin bekler, {_tur_adi(adres)} verildi")
        tur, hedef = adres_coz(adres)
        try:
            return Baglanti(_SURUCULER[tur](hedef), tur)
        except YontemHatasi:
            raise
        except Exception as e:
            _vt_hata(e)

    @uye('SqlAdı', 1, 1)
    def _sql_adi(ad):
        s = y.metne(ad)
        if not re.fullmatch(r'[^\W\d]\w*', s) or len(s) > 63:
            _hata(f"Geçersiz tablo ya da sütun adı: '{s}' (harfle başlamalı; harf, rakam ve alt çizgi içerebilir)")
        return '"' + s + '"'

    return U
