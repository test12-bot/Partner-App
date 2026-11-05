/* =========================================================
   HIGHWAY — تفاصيل الإحصائيات (hw-stats.js)
   أي بطاقة رقم عليها data-stat="key" تصبح قابلة للضغط، وتفتح ورقة سفلية بتفاصيل أشمل.
   كل تطبيق يعرّف window.statDetail(key) ويعيد: { title, value, unit, sub, rows:[[label, value]], list:[{t, s, v, tag}], empty }
   ========================================================= */
(function () {
  var g = window, E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function css() {
    if (document.getElementById('hwStatsCss')) return;
    var st = document.createElement('style'); st.id = 'hwStatsCss';
    st.textContent =
      '[data-stat]{cursor:pointer;position:relative;transition:transform .15s ease,box-shadow .2s ease}' +
      '[data-stat]:active{transform:scale(.97)}' +
      '[data-stat]::after{content:"";position:absolute;top:14px;inset-inline-end:14px;width:7px;height:7px;border-inline-start:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);opacity:.35}' +
      '.hs-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;background:#25CED1;color:#0E3A3B;border-radius:22px;padding:16px 18px;margin:4px 0 14px;box-shadow:inset 0 0 0 2px rgba(232,239,68,.7)}' +
      '.hs-hero small{display:block;font-weight:700;opacity:.8}.hs-hero b{font-size:34px;line-height:1.1;font-weight:800}.hs-hero em{font-style:normal;font-weight:700;font-size:14px;margin-inline-start:4px}' +
      '.hs-sub{font-size:12.5px;font-weight:700;opacity:.8;text-align:end}' +
      '.hs-rows{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}' +
      '.hs-rows div{background:rgba(14,58,59,.05);border-radius:14px;padding:10px 12px}.hs-rows small{display:block;font-size:12px;opacity:.7}.hs-rows b{font-size:16px}' +
      '.hs-h{margin:6px 0 8px;font-size:14px;font-weight:800}' +
      '.hs-list{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;max-height:46vh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding-bottom:4px}' +
      '.hs-it[data-oid]{cursor:pointer}.hs-it{display:flex;align-items:center;gap:10px;min-width:0;background:rgba(14,58,59,.04);border-radius:14px;padding:10px 12px}.hs-it .hs-r{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}.hs-it .hs-c{direction:ltr;unicode-bidi:isolate;font-weight:700}' +
      '.hs-it>div:first-child{flex:1;min-width:0}.hs-it b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hs-it small{display:block;font-size:12px;opacity:.65}' +
      '.hs-it strong{font-size:15px;white-space:nowrap}.hs-tag{font-size:11px;font-weight:800;border-radius:99px;padding:2px 8px;background:#E8EF44;color:#0E3A3B;white-space:nowrap}' +
      '.hs-tag.t{background:#25CED1}.hs-tag.a{background:#E8EF44}.hs-tag:not(.t):not(.a):not(.d):not(.r){background:#EF0000;color:#fff}.hs-tag.d{background:#0E3A3B;color:#F5EDE3}.hs-tag.r{background:#F6C2BE}' +
      '.hs-empty{text-align:center;padding:18px;opacity:.65;font-weight:700}' +
      '[data-theme=dark] .hs-rows div,[data-theme=dark] .hs-it{background:rgba(255,255,255,.06)}';
    document.head.appendChild(st);
  }
  function sheet() {
    var m = document.getElementById('hsSheet');
    if (!m) {
      m = document.createElement('div'); m.id = 'hsSheet'; m.className = 'modal';
      m.innerHTML = '<div class="modal-card glass" id="hsBody"></div>';
      m.addEventListener('click', function (e) { if (e.target === m) close(); });
      document.body.appendChild(m);
    }
    return m;
  }
  function close() { var m = document.getElementById('hsSheet'); if (m) m.classList.remove('show'); }
  function open(d) {
    if (!d) return; css();
    var m = sheet(), h = '<div class="sh-head"><div><small>التفاصيل</small><h3>' + E(d.title) + '</h3></div></div>';
    if (d.value != null) h += '<div class="hs-hero"><div><small>' + E(d.title) + '</small><b>' + E(d.value) + '</b>' + (d.unit ? '<em>' + E(d.unit) + '</em>' : '') + '</div>' + (d.sub ? '<div class="hs-sub">' + E(d.sub) + '</div>' : '') + '</div>';
    if (d.rows && d.rows.length) h += '<div class="hs-rows">' + d.rows.map(function (r) { return '<div><small>' + E(r[0]) + '</small><b>' + E(r[1]) + '</b></div>'; }).join('') + '</div>';
    if (d.list) h += '<div class="hs-h">' + E(d.listTitle || 'التفاصيل') + ' (' + d.list.length + ')</div>' +
      (d.list.length ? '<div class="hs-list">' + d.list.map(function (x) {
        return '<div class="hs-it"' + (x.id ? ' data-oid="' + E(x.id) + '" role="button" tabindex="0"' : '') + '><div><b>' + E(x.t) + '</b>' + (x.c || x.s ? '<small>' + (x.c ? '<span class="hs-c">' + E(x.c) + '</span>' + (x.s ? ' · ' : '') : '') + E(x.s || '') + '</small>' : '') + '</div>' +
          (x.tag || x.v != null ? '<div class="hs-r">' + (x.tag ? '<span class="hs-tag ' + (x.tc || '') + '">' + E(x.tag) + '</span>' : '') + (x.v != null ? '<strong>' + E(x.v) + '</strong>' : '') + '</div>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="hs-empty">' + E(d.empty || 'لا توجد بيانات في هذه الفترة') + '</div>');
    h += '<button type="button" class="submit-btn" style="margin-top:14px" onclick="HWStats.close()"><span class="btn-label">تم</span></button>';
    document.getElementById('hsBody').innerHTML = h; m.classList.add('show');
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-stat]'); if (!el || typeof g.statDetail !== 'function') return;
    e.preventDefault(); e.stopPropagation();
    try { open(g.statDetail(el.dataset.stat)); } catch (x) { console.error(x); }
  }, true);
  /* أدوات مساعدة لصياغة القوائم */
  /* حالة الطلب بكلمات واضحة: أين الطلب الآن بالضبط */
  function stLabel(o) { return o.status === 'delivered' ? ['تم التسليم', 'd'] : o.status === 'cancelled' ? ['ملغي', 'r'] : o.status === 'picked' ? ['في طريقه للعميل', 't'] : o.status === 'accepted' ? ['الكابتن متجه للمطعم', 'a'] : ['بانتظار كابتن', '']; }
  /* سطر الطلب: اسم المتجر بخط واضح، وتحته رقم الطلب المختصر (ترتيبه في اليوم) والعميل والوقت */
  function shortNo(c) { var m = /^ORD#\d{6}-\d{4}-(\d{3})$/.exec(c || ''); return m ? '#' + m[1] : (c || ''); }
  function orderItem(o, v) { var s = stLabel(o); return { id: o.id, t: o.storeName || o.from || '—', c: shortNo(o.code), s: (o.customer && o.customer.name ? o.customer.name + ' · ' : '') + (g.HWOrders ? HWOrders.ago(o.updatedAt || o.createdAt) : ''), tag: s[0], tc: s[1], v: v }; }
  /* الضغط على طلب في القائمة يفتح تفاصيله */
  document.addEventListener('click', function (e) {
    var it = e.target.closest && e.target.closest('.hs-it[data-oid]'); if (!it) return;
    var id = it.dataset.oid, fn = g.openOrderSheet || g.openJob || g.openTrack; if (!fn) return;
    close(); setTimeout(function () { fn(id); }, 200);
  });
  g.HWStats = { open: open, close: close, orderItem: orderItem, css: css };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();
})();
