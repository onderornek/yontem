-- Pandoc Lua süzgeci: Doc Markdown'ını kitap dizgisine çevirir.
--  ## Bölüm N — Başlık   → \chapter{Başlık}
--  ## Ek X — Başlık      → (ilk ekte \appendix) \chapter{Başlık}
--  ## Diğer              → \chapter*{Diğer} + içindekiler satırı
--  ### Başlık            → \section*{Başlık} + içindekiler satırı
--  ```latex              → ayrık matematik
--  program kodu          → sözdizimi vurgulu `yprogram` kutusu
--  diğer kod             → `ycikti` kutusu

local ek_basladi = false

local function latex(inlines)
  local s = pandoc.write(pandoc.Pandoc({ pandoc.Plain(inlines) }), 'latex')
  return (s:gsub('%s+$', ''))
end

-- "Bölüm 3 — " gibi bir öneki satır içi öğelerden ayıklar
local function oneki_at(inlines)
  local out, kesildi = pandoc.List(), false
  for _, el in ipairs(inlines) do
    if not kesildi then
      if el.t == 'Str' and (el.text == '—' or el.text:match('—$')) then
        kesildi = true
      end
    else
      out:insert(el)
    end
  end
  while #out > 0 and (out[1].t == 'Space' or out[1].t == 'SoftBreak') do out:remove(1) end
  return out
end

function Header(h)
  local metin = pandoc.utils.stringify(h.content)
  if h.level == 1 then return {} end
  if h.level == 2 then
    if metin:match('^Bölüm %d+ —') then
      local b = latex(oneki_at(h.content))
      return pandoc.RawBlock('latex', '\\chapter{' .. b .. '}')
    elseif metin:match('^Ek %u+ —') then
      local b = latex(oneki_at(h.content))
      local on = ''
      if not ek_basladi then ek_basladi = true; on = '\\appendix\n\\addtocontents{toc}{\\protect\\setcounter{tocdepth}{0}}\n' end
      return pandoc.RawBlock('latex', on .. '\\chapter{' .. b .. '}')
    else
      local b = latex(h.content)
      return pandoc.RawBlock('latex',
        '\\chapter*{' .. b .. '}\\addcontentsline{toc}{chapter}{' .. b .. '}\\markboth{' .. b .. '}{' .. b .. '}')
    end
  end
  if h.level == 3 then
    local b = latex(h.content)
    return pandoc.RawBlock('latex', '\\section*{' .. b .. '}\\addcontentsline{toc}{section}{' .. b .. '}')
  end
  local b = latex(h.content)
  return pandoc.RawBlock('latex', '\\subsection*{' .. b .. '}')
end

---------------------------------------------------------------- vurgulama
local ANAHTAR = {}
for w in ([[program birim kullan arayüz uygulama değişken sabit tip başla bitir eğer ise değilse
  için her kadar iken tekrarla olana dek kez kır devam dön fonksiyon prosedür sınıf kayıt kurucu
  yıkıcı miras sanal ezer ve veya değil mod div doğru yanlış boş dene yakala sonunda fırlat
  değerine göre azalarak içindeki türünde dizi tamsayı ondalık metin mantıksal liste
  sözlük tensör herhangi]]):gmatch('%S+') do ANAHTAR[w] = true end

local function kacis(s)
  return (s:gsub('[\\{}]', { ['\\'] = '\\yBS{}', ['{'] = '\\yLB{}', ['}'] = '\\yRB{}' }))
end

-- Tek parça metni stil makrosuyla sarar; satır sonlarında kapatıp yeniden açar.
local function sar(stil, s)
  local parcalar = {}
  for satir in (s .. '\n'):gmatch('(.-)\n') do
    if satir == '' then parcalar[#parcalar + 1] = '' else
      -- boşluklarda satır kırılabilsin diye her sözcük ayrı sarılır
      parcalar[#parcalar + 1] = satir:gsub('[^ ]+', function(w) return '\\' .. stil .. '{' .. kacis(w) .. '}' end)
    end
  end
  return table.concat(parcalar, '\n')
end

local function harf_mi(c)
  return c:match('^[%w_]$') ~= nil or #c > 1
end

local function vurgula(kod)
  local k = {}
  for _, cp in utf8.codes(kod) do k[#k + 1] = utf8.char(cp) end
  local out, i, n = {}, 1, #k
  local function al(a, b) return table.concat(k, '', a, b) end
  while i <= n do
    local c = k[i]
    if c == '{' then                                   -- { yorum }
      local j = i
      while j <= n and k[j] ~= '}' do j = j + 1 end
      out[#out + 1] = sar('yYorum', al(i, math.min(j, n))); i = j + 1
    elseif c == '/' and k[i + 1] == '/' then           -- // satır yorumu
      local j = i
      while j <= n and k[j] ~= '\n' do j = j + 1 end
      out[#out + 1] = sar('yYorum', al(i, j - 1)); i = j
    elseif c == '(' and k[i + 1] == '*' then           -- (* yorum *)
      local j = i + 2
      while j < n and not (k[j] == '*' and k[j + 1] == ')') do j = j + 1 end
      out[#out + 1] = sar('yYorum', al(i, math.min(j + 1, n))); i = j + 2
    elseif c == "'" and not (i > 1 and (harf_mi(k[i - 1]) or k[i - 1] == ')' or k[i - 1] == ']')) then
      local j = i + 1                                  -- 'metin' (10'a gibi ekler değil)
      while j <= n and k[j] ~= "'" and k[j] ~= '\n' do j = j + 1 end
      out[#out + 1] = sar('yMetin', al(i, math.min(j, n))); i = j + 1
    elseif harf_mi(c) and not c:match('%d') then       -- sözcük
      local j = i
      while j + 1 <= n and harf_mi(k[j + 1]) do j = j + 1 end
      local w = al(i, j)
      if ANAHTAR[w] then out[#out + 1] = '\\yAnahtar{' .. kacis(w) .. '}' else out[#out + 1] = kacis(w) end
      i = j + 1
    else
      out[#out + 1] = kacis(c); i = i + 1
    end
  end
  return table.concat(out)
end

local function matematik(s)
  s = s:gsub('\\operatorname{([^}]*)}', '\\mathop{\\text{\\upshape %1}}\\nolimits')
  return '\\begin{equation*}\n' .. s .. '\n\\end{equation*}'
end

function CodeBlock(cb)
  local dil = cb.classes[1]
  if dil == 'latex' then return pandoc.RawBlock('latex', matematik(cb.text)) end
  local metin = cb.text:gsub('%s+$', '')
  if dil == 'pascal' or metin:match('^program ') or metin:match('^birim ') then
    return pandoc.RawBlock('latex',
      '\\begin{yprogram}\n\\begin{Verbatim}[commandchars=\\\\\\{\\}]\n' .. vurgula(metin) ..
      '\n\\end{Verbatim}\n\\end{yprogram}')
  end
  return pandoc.RawBlock('latex', '\\begin{ycikti}\n\\begin{Verbatim}\n' .. metin .. '\n\\end{Verbatim}\n\\end{ycikti}')
end

---------------------------------------------------------------- Türkçe heceleme
-- Bu TeX kurulumunda Türkçe heceleme kalıpları yok; Türkçe'nin düzenli hece
-- kuralıyla (iki ünlü arasındaki son ünsüzden önce böl) yumuşak tire eklenir.
local UNLU = {}
for _, c in utf8.codes('aeıioöuüâîûAEIİOÖUÜÂÎÛ') do UNLU[c] = true end
local TURKCE = {}
for _, c in utf8.codes('abcçdefgğhıijklmnoöprsştuüvyzâîûABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZÂÎÛ') do TURKCE[c] = true end
local YUMUSAK = utf8.char(0xAD)

local function hecele(sozcuk)
  local k = {}
  for _, cp in utf8.codes(sozcuk) do
    if not TURKCE[cp] then return nil end
    k[#k + 1] = cp
  end
  if #k < 6 then return nil end
  local kir = {}
  local onceki = nil
  for i = 1, #k do
    if UNLU[k[i]] then
      if onceki then
        local ara = i - onceki - 1          -- aradaki ünsüz sayısı
        local nokta = (ara == 0) and i or (i - 1)
        if nokta - 1 >= 2 and #k - nokta + 1 >= 3 then kir[nokta] = true end
      end
      onceki = i
    end
  end
  local out = {}
  for i = 1, #k do
    if kir[i] then out[#out + 1] = YUMUSAK end
    out[#out + 1] = utf8.char(k[i])
  end
  return table.concat(out)
end

local function hecele_str(s)
  -- sözcüğü harf kümelerine ayır; kesme işaretli eklerde yalnızca gövdeyi hecele
  return (s:gsub('[%a\128-\255]+', function(w) return hecele(w) or w end))
end

local heceleyici = {
  Str = function(el) el.text = hecele_str(el.text); return el end,
  Code = function(el) return el end,
}

local function blok_hecele(b) return b:walk(heceleyici) end

-- Satır içi kod: özel karakterleri kaçır, uygun yerlerde satır kırılmasına izin ver
local KACIS = { ['\\'] = '\\textbackslash{}', ['{'] = '\\{', ['}'] = '\\}', ['$'] = '\\$', ['&'] = '\\&',
  ['#'] = '\\#', ['^'] = '\\^{}', ['_'] = '\\_', ['%'] = '\\%', ['~'] = '\\textasciitilde{}',
  ["'"] = '\\textquotesingle{}', ['`'] = '\\textasciigrave{}' }
local KIRILIR = { ['/'] = true, ['.'] = true, [','] = true, ['('] = true, ['['] = true, ['_'] = true, ['='] = true }
function satir_ici_kod(el)
  local out = {}
  for _, cp in utf8.codes(el.text) do
    local c = utf8.char(cp)
    out[#out + 1] = KACIS[c] or c
    if KIRILIR[c] then out[#out + 1] = '\\allowbreak{}' end
  end
  return pandoc.RawInline('latex', '\\texttt{' .. table.concat(out) .. '}')
end

return {
  { Para = blok_hecele, Plain = blok_hecele },
  { Header = Header, CodeBlock = CodeBlock, Code = satir_ici_kod },
}
