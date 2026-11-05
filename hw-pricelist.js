/* =========================================================
   HIGHWAY — قائمة أسعار التوصيل الرسمية (hw-pricelist.js)
   بدل ملفات PDF: قالب HIGHWAY الثابت يُملأ تلقائيًا ببيانات المتجر
   (الاسم، العنوان، الرقم) وأسعاره الخاصة، ثم يُطبع أو يُحفظ PDF من الجهاز.
   الصور والخطوط داخل مجلد pl/ بجانب التطبيق.
   HWPriceList.open(storeId)
   يعتمد على: hw-biz.js, hw-config.js
   ========================================================= */
(function (g) {
  'use strict';
  var REGIONS = [['salt', 'السلط', '01'], ['amman', 'عمان', '02']], PER_PAGE = 30;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* ترتيب أبجدي يتجاهل "ال" التعريف والهمزات */
  function key(n) { return String(n).replace(/[ً-ٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').split(/\s+/).map(function (w) { return w.length > 3 && w.indexOf('ال') === 0 ? w.slice(2) : w; }).join(' '); }
  function sorted(l) { return l.slice().sort(function (a, b) { var x = key(a.n), y = key(b.n); return x < y ? -1 : x > y ? 1 : 0; }); }
  function dmy() { var d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
  function today() { var d = new Date(), M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']; return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear(); }

  /* البيانات بنفس شكل القالب: كل صفحة 15 سطرًا، العمود الأيمن ثم الأيسر */
  function data(sid) {
    var s = g.HWBiz.storeById(sid) || {}, cfg = g.HW_CONFIG || {};
    var areas = REGIONS.map(function (r) {
      var l = sorted(g.HWBiz.priceList(sid, r[0]).filter(function (x) { return x && x.n; })), lists = [];
      for (var i = 0; i < l.length; i += PER_PAGE) {
        var ch = l.slice(i, i + PER_PAGE), rows = [];
        var nr = Math.ceil(ch.length / 2);              /* عمودان متوازنان: الأيمن ثم الأيسر */
        for (var k = 0; k < nr; k++) { var a = ch[k], b = ch[k + nr]; rows.push([a.n, a.p, b ? b.n : '', b ? b.p : '']); }
        lists.push({ no: r[2] + '-' + String(lists.length + 1).padStart(3, '0'), rows: rows });
      }
      return { title: r[1], lists: lists };
    }).filter(function (a) { return a.lists.length; });
    return { store: { name: s.nameEn || s.name || '', addr: s.addrEn || s.addr || '', phone: s.phone || '' }, date: today(), issued: dmy(), km: Number(cfg.kmPrice || 0.35).toFixed(2), areas: areas };
  }

  var CSS =
    '@font-face{font-family:NotoKufi;src:url(f/NotoKufiArabic.woff) format("woff");font-weight:100 900}' +
    '@font-face{font-family:Quicksand;src:url(f/Quicksand.woff) format("woff");font-weight:300 700}' +
    '@font-face{font-family:NotoSans;src:url(f/NotoSans.woff) format("woff");font-weight:100 900}' +
    ':root{--teal:#25ced1;--beige:#f3f0e7;--yellow:#e8ef44;--ink:#000}*{box-sizing:border-box}' +
    'html,body{margin:0;background:#cfd9d9;font-family:NotoKufi,sans-serif;direction:rtl}' +
    '#doc{padding:10px 0}.page{position:relative;width:595.5pt;height:842.25pt;overflow:hidden;background:#fff;margin:0 auto 14px;direction:rtl}' +
    '.abs{position:absolute}.full{position:absolute;left:0;top:0;width:595.5pt;height:842.25pt}' +
    '.lbl,.val{font-family:Quicksand;font-weight:700;color:var(--ink);white-space:nowrap;direction:ltr}' +
    '.area-title{position:absolute;left:0;width:595.5pt;text-align:center;top:452pt;font-family:NotoKufi;font-weight:700;font-size:104pt;line-height:1;color:#f3f0e7}' +
    '.area-sub{position:absolute;left:0;width:595.5pt;text-align:center;top:385pt;font-family:NotoKufi;font-weight:700;font-size:28.3pt;line-height:1;color:#f3f0e7}' +
    '.row{position:absolute;left:-38pt;width:633pt;height:31pt;background:var(--beige)}' +
    '.cell{position:absolute;top:0;height:31pt;line-height:31pt;font-family:NotoKufi;font-weight:400;font-size:16pt;color:var(--ink);white-space:nowrap}' +
    '.fee{font-family:NotoSans;font-weight:400;text-align:center;direction:ltr}' +
    '.hdr{position:absolute;left:-38pt;width:633pt;height:31pt;background:var(--yellow)}' +
    '.hdrtxt{position:absolute;top:0;height:31pt;line-height:31pt;font-family:NotoKufi;font-weight:700;font-size:16pt;color:var(--ink);white-space:nowrap}' +
    '.bar{position:absolute;left:22pt;top:804pt;width:555pt;height:113pt;background:var(--teal);border-radius:14pt 14pt 0 0}' +
    '.foot{position:absolute;left:0;width:595.5pt;top:812pt;text-align:center;font-family:Quicksand;font-weight:700;font-size:11.6pt;color:#f3f0e7;direction:ltr;white-space:nowrap}' +
    '.yellowbar{position:absolute;left:-38pt;width:633pt;height:31pt;background:var(--yellow);line-height:31pt;text-align:center;font-family:NotoKufi;font-size:16pt;color:var(--ink);white-space:nowrap}' +
    '.infobox{position:absolute;left:-10pt;width:253pt;height:58pt;background:var(--beige);line-height:21pt;padding:6pt 10pt 0 0;font-family:NotoKufi;font-size:16pt;text-align:right}' +
    '.kmbar{position:absolute;left:-15pt;width:258pt;height:31pt;background:var(--yellow);line-height:31pt;font-family:NotoKufi;font-weight:700;font-size:16pt;white-space:nowrap}' +
    '.issued{position:absolute;left:-10pt;width:253pt;text-align:right;padding-right:10pt;font-family:NotoKufi;font-size:9.5pt;color:#5b6b6b;white-space:nowrap}' +
    '.thanks{position:absolute;left:0;width:595.5pt;top:790pt;text-align:center;font-family:Quicksand;font-weight:700;font-size:12.1pt;color:var(--ink);letter-spacing:.5pt}' +
    '.pay{position:absolute;left:421pt;font-family:Quicksand;color:var(--ink);white-space:nowrap}' +
    '@media screen{#doc{zoom:var(--z,1)}}' +
    '@media print{html,body{background:none}#doc{padding:0}.page{margin:0;height:841.5pt;break-after:page}.page:last-child{break-after:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
    '@page{size:A4;margin:0}';

  /* نفس منطق القالب الأصلي (المقاسات بالنقاط من التصميم) */
  function build(D) {
    var TOP_ROW = 236, PITCH = 35.4, NOTE_H = 168, COL = { feeL: 64, areaL: 270, feeR: 363, areaR: 571 };
    var FOOT = 'Al-Salt,Al-balqa - +962791819432 - highway.delivery.jor@gmail.com', doc = document.getElementById('doc');
    function el(tag, cls, style, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (style) e.setAttribute('style', style); if (html !== undefined) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function newPage() { var p = el('section', 'page'); doc.appendChild(p); return p; }
    function img(p, src, x, y, w, h) { p.appendChild(el('img', 'abs', 'left:' + x + 'pt;top:' + y + 'pt;width:' + w + 'pt;height:' + h + 'pt')).src = src; }
    function full(p, src) { var b = el('img', 'full'); b.src = src; p.appendChild(b); }
    function head(p) { img(p, 'a/header-bg.jpg', 0, 0, 595.5, 118); img(p, 'a/h_3_0.jpg', 358.9, 14.03, 207.15, 80.6); }
    function table(list, rows) {
      var p = newPage(), L = D.store; head(p); img(p, 'a/h_3_1.jpg', 532.38, 72.38, 33.67, 21.47);
      p.appendChild(el('div', 'lbl abs', 'left:57pt;top:108pt;font-size:14pt', 'LIST #'));
      p.appendChild(el('div', 'val abs', 'left:153pt;top:108pt;font-size:14pt', esc(list.no)));
      p.appendChild(el('div', 'lbl abs', 'left:330pt;top:109pt;font-size:14pt', 'LISTED TO'));
      p.appendChild(el('div', 'lbl abs', 'left:57pt;top:140pt;font-size:10pt', 'LIST DATE'));
      p.appendChild(el('div', 'val abs', 'left:150pt;top:140pt;font-size:10pt', ': ' + esc(D.date)));
      p.appendChild(el('div', 'val abs', 'left:330pt;top:140pt;font-size:10pt;font-family:NotoKufi,Quicksand', esc(L.name)));
      p.appendChild(el('div', 'val abs', 'left:330pt;top:159pt;font-size:10pt;font-family:NotoKufi,Quicksand', esc(L.addr)));
      p.appendChild(el('div', 'val abs', 'left:330pt;top:178pt;font-size:10pt', esc(L.phone)));
      var h = el('div', 'hdr', 'top:201pt'); p.appendChild(h);
      [[57, 110, 'أجور التوصيل'], [189, 120, 'الـمـنـطـقـة'], [355, 110, 'أجور التوصيل'], [487, 120, 'الـمـنـطـقـة']].forEach(function (c) { h.appendChild(el('div', 'hdrtxt', 'left:' + c[0] + 'pt;width:' + c[1] + 'pt;text-align:center', c[2])); });
      rows.forEach(function (r, i) {
        var row = el('div', 'row', 'top:' + (TOP_ROW + i * PITCH) + 'pt');
        row.appendChild(el('div', 'cell', 'right:' + (595 - COL.areaR) + 'pt;left:auto', esc(r[0])));
        row.appendChild(el('div', 'cell fee', 'left:' + (COL.feeR) + 'pt;width:76pt', esc(r[1])));
        row.appendChild(el('div', 'cell', 'right:' + (595 - COL.areaL) + 'pt;left:auto', esc(r[2])));
        row.appendChild(el('div', 'cell fee', 'left:' + (COL.feeL) + 'pt;width:76pt', esc(r[3])));
        p.appendChild(row);
      });
      p.appendChild(el('div', 'bar')); p.appendChild(el('div', 'foot', '', esc(FOOT)));
      return p;
    }
    function note(p, top) {
      p.appendChild(el('div', 'yellowbar', 'top:' + top + 'pt', 'يتم تحديد أجور التوصيل بناءً على مناطق التوصيل المحددة.'));
      p.appendChild(el('div', 'infobox', 'top:' + (top + 41) + 'pt', 'تُحتسب أجور التوصيل للمناطق<br>غير المدرجة حسب الكيلومتر.'));
      var km = top + 105;
      p.appendChild(el('div', 'kmbar', 'top:' + km + 'pt', '<span class="abs" style="left:29pt;top:0;font-family:NotoSans;font-weight:700;direction:ltr">' + esc(D.km) + '</span><span class="abs" style="right:12pt;top:0;font-family:NotoKufi;font-weight:700">سـعـر الـكـيلومتر</span>'));
      p.appendChild(el('div', 'pay', 'top:' + (km + 8) + 'pt', '<div style="font-size:12.1pt;font-weight:700">PAYMENT METHOD</div><div style="font-size:9.5pt;font-weight:400;margin-top:4pt">CASH</div>'));
      p.appendChild(el('div', 'issued', 'top:' + (km + 40) + 'pt', 'صادرة إلكترونيًا من HIGHWAY · <span style="font-family:NotoSans;direction:ltr;unicode-bidi:embed">' + esc(D.issued) + '</span>'));
      p.appendChild(el('div', 'thanks', '', 'THANK YOU'));
    }
    full(newPage(), 'a/bg-cover.jpg');
    D.areas.forEach(function (area) {
      var ap = newPage(); full(ap, 'a/bg-area.jpg'); ap.appendChild(el('div', 'area-sub', '', 'التوصيل لمناطق')); ap.appendChild(el('div', 'area-title', '', esc(area.title)));
      area.lists.forEach(function (list, li) {
        var p = table(list, list.rows);
        if (li === area.lists.length - 1) {
          var t = TOP_ROW + list.rows.length * PITCH + 14;
          if (t + NOTE_H > 785) { var np = newPage(); head(np); np.appendChild(el('div', 'bar')); np.appendChild(el('div', 'foot', '', esc(FOOT))); note(np, 220); } else note(p, t);
        }
      });
    });
    full(newPage(), 'a/bg-social.jpg');
  }

  function html(D) {
    var base = new URL('pl/', location.href).href;
    return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="' + base + '"><title>' + esc('قائمة أسعار ' + D.store.name) + '</title><style>' + CSS + '</style></head><body><div id="doc"></div>' +
      '<script>(' + build.toString() + ')(' + JSON.stringify(D).replace(/</g, '\\u003c') + ');' +
      'function fit(){document.documentElement.style.setProperty("--z",Math.min(1,(innerWidth-16)/794).toFixed(3))}fit();addEventListener("resize",fit);<\/script></body></html>';
  }

  /* نافذة معاينة داخل التطبيق: إغلاق + طباعة/حفظ PDF */
  function css() {
    if (document.getElementById('hwPlCss')) return;
    var st = document.createElement('style'); st.id = 'hwPlCss';
    st.textContent = '.hw-pl{position:fixed;inset:0;z-index:5000;background:#0E3A3B;display:flex;flex-direction:column;opacity:0;transition:opacity .22s}.hw-pl.show{opacity:1}' +
      '.hw-pl-top{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;color:#F3F0E7}' +
      '.hw-pl-top b{flex:1;min-width:0;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.hw-pl-x{width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#F3F0E7;display:grid;place-items:center;flex:none}.hw-pl-x svg{width:18px;height:18px}' +
      '.hw-pl-go{height:40px;border:0;border-radius:999px;background:#E8EF44;color:#0E3A3B;font:inherit;font-weight:800;font-size:14px;padding:0 16px;display:inline-flex;align-items:center;gap:7px;flex:none}.hw-pl-go svg{width:17px;height:17px}.hw-pl-go:disabled{opacity:.5}' +
      '.hw-pl iframe{flex:1;width:100%;border:0;background:#cfd9d9;border-radius:18px 18px 0 0}';
    document.head.appendChild(st);
  }
  function open(sid) {
    var D = data(sid); css();
    if (!D.areas.length) { if (g.HWOrders) g.HWOrders.toast('لا توجد أسعار لهذا المتجر بعد'); return; }
    var m = document.createElement('div'); m.className = 'hw-pl'; m.setAttribute('role', 'dialog');
    m.innerHTML = '<div class="hw-pl-top"><button type="button" class="hw-pl-x" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      '<b>قائمة أسعار ' + esc(D.store.name) + '</b><button type="button" class="hw-pl-go" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2.5"/><path d="M7 14h10v7H7z"/></svg>طباعة / PDF</button></div><iframe title="قائمة الأسعار"></iframe>';
    document.body.appendChild(m);
    var fr = m.querySelector('iframe'), go = m.querySelector('.hw-pl-go');
    fr.onload = function () {
      var w = fr.contentWindow, d = w.document, imgs = [].slice.call(d.images);
      Promise.all([d.fonts ? d.fonts.ready : 0].concat(imgs.map(function (i) { return i.complete ? 0 : new Promise(function (r) { i.onload = i.onerror = r; }); }))).then(function () { go.disabled = false; });
    };
    fr.srcdoc = html(D);
    go.onclick = function () { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} };
    m.querySelector('.hw-pl-x').onclick = function () { m.classList.remove('show'); setTimeout(function () { m.remove(); }, 230); };
    requestAnimationFrame(function () { m.classList.add('show'); });
  }
  g.HWPriceList = { open: open, data: data };
})(window);
