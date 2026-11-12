-- Pandoc Lua süzgeci: kitap Markdown'ını web sayfasına çevirir.
--  ```latex     → MathML ile ayrık formül
--  program kodu → sözdizimi vurgulu <pre class="program">
--  ```bash      → <pre class="kabuk">
--  diğer kod    → <pre class="cikti">
local ANAHTAR = {}
for w in ([[program birim kullan arayüz uygulama değişken sabit tip başla bitir eğer ise değilse
  için her kadar iken tekrarla olana dek kez kır devam dön fonksiyon prosedür sınıf kayıt kurucu
  yıkıcı miras sanal ezer ve veya değil mod div böl doğru yanlış boş dene yakala sonunda fırlat
  değerine göre adımda artan azalan içindeki türünde dizi tamsayı ondalık metin mantıksal liste
  sözlük tensör herhangi yada kendi]]):gmatch('%S+') do ANAHTAR[w] = true end

local function esc(s)
  return (s:gsub('[&<>"]', { ['&'] = '&amp;', ['<'] = '&lt;', ['>'] = '&gt;', ['"'] = '&quot;' }))
end
local function span(c, s) return '<span class="' .. c .. '">' .. esc(s) .. '</span>' end
local function harf_mi(c) return c:match('^[%w_]$') ~= nil or #c > 1 end

local function vurgula(kod)
  local k = {}
  for _, cp in utf8.codes(kod) do k[#k + 1] = utf8.char(cp) end
  local out, i, n = {}, 1, #k
  local function al(a, b) return table.concat(k, '', a, b) end
  while i <= n do
    local c = k[i]
    if c == '{' then
      local j = i
      while j <= n and k[j] ~= '}' do j = j + 1 end
      out[#out + 1] = span('yy', al(i, math.min(j, n))); i = j + 1
    elseif c == '/' and k[i + 1] == '/' then
      local j = i
      while j <= n and k[j] ~= '\n' do j = j + 1 end
      out[#out + 1] = span('yy', al(i, j - 1)); i = j
    elseif c == '(' and k[i + 1] == '*' then
      local j = i + 2
      while j < n and not (k[j] == '*' and k[j + 1] == ')') do j = j + 1 end
      out[#out + 1] = span('yy', al(i, math.min(j + 1, n))); i = j + 2
    elseif c == "'" and not (i > 1 and (harf_mi(k[i - 1]) or k[i - 1] == ')' or k[i - 1] == ']')) then
      local j = i + 1
      while j <= n and k[j] ~= "'" and k[j] ~= '\n' do j = j + 1 end
      out[#out + 1] = span('ym', al(i, math.min(j, n))); i = j + 1
    elseif c:match('%d') then
      local j = i
      while j + 1 <= n and k[j + 1]:match('[%d%.]') do j = j + 1 end
      out[#out + 1] = span('ys', al(i, j)); i = j + 1
    elseif harf_mi(c) then
      local j = i
      while j + 1 <= n and harf_mi(k[j + 1]) do j = j + 1 end
      local w = al(i, j)
      if ANAHTAR[w] then out[#out + 1] = span('ya', w) else out[#out + 1] = esc(w) end
      i = j + 1
    else
      out[#out + 1] = esc(c); i = i + 1
    end
  end
  return table.concat(out)
end

local function blok(sinif, ic, etiket)
  return pandoc.RawBlock('html', '<div class="kod ' .. sinif .. '"><span class="kod-etiket">' .. etiket ..
    '</span><button type="button" class="kopyala" aria-label="Kodu kopyala">Kopyala</button><pre><code>' .. ic .. '</code></pre></div>')
end

function CodeBlock(cb)
  local dil = cb.classes[1]
  if dil == 'latex' then return pandoc.Para({ pandoc.Math('DisplayMath', cb.text) }) end
  local metin = cb.text:gsub('%s+$', '')
  if dil == 'pascal' or metin:match('^program ') or metin:match('^birim ') then
    return blok('program', vurgula(metin), 'Yöntem')
  end
  if dil == 'bash' then return blok('kabuk', esc(metin), 'Terminal') end
  return blok('cikti', esc(metin), 'Çıktı')
end

function Table(t)
  return { pandoc.RawBlock('html', '<div class="tablo">'), t, pandoc.RawBlock('html', '</div>') }
end
