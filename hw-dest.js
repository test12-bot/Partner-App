/* =========================================================
   HIGHWAY — اختيار وجهة الطلب من قائمة أسعار المتجر (hw-dest.js)
   يُستخدم في: الطلب اليدوي (الإدارة)، "اطلب الآن" (المتجر)، تعديل الوجهة لاحقًا،
   والكابتن عند التسليم إن كانت الوجهة غير محددة.
   HWDest.open({ sid, title, allowNone, onPick(area | null) })
   area = { n: اسم المنطقة, p: السعر كما في القائمة, fee: رقم الأجرة, region }
   ========================================================= */
(function (g) {
  var REG = [['salt', 'السلط'], ['amman', 'عمان']], st = null;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* بحث يتجاهل "ال" والهمزات والتاء المربوطة */
  function norm(t) { return String(t || '').replace(/[ً-ٟ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/(^|\s)ال/g, '$1').toLowerCase().trim(); }
  function list(sid, r) { return (g.HWBiz ? HWBiz.priceList(sid, r) : []).filter(function (x) { return x && x.n; }); }
  function fee(p) { return g.HWOrders && HWOrders.feeFrom ? HWOrders.feeFrom(p) : parseFloat(p) || 0; }
  function shell() {
    var m = document.getElementById('hwDest');
    if (m) return m;
    m = document.createElement('div'); m.id = 'hwDest'; m.className = 'modal hw-dest';
    m.innerHTML = '<div class="modal-card"><div class="dz-h"><div><small></small><h3></h3></div><button type="button" class="dz-x" data-dz="x" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="dz-s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" placeholder="ابحث عن المنطقة" aria-label="ابحث عن المنطقة" autocomplete="off"></div>' +
      '<div class="dz-reg"></div><div class="dz-list" data-no-swipe></div></div>';
    m.addEventListener('click', function (e) {
      if (e.target === m || e.target.closest('[data-dz="x"]')) { close(); return; }
      var r = e.target.closest('[data-reg]'); if (r) { st.region = r.dataset.reg; paint(); return; }
      var b = e.target.closest('[data-i]'); if (!b) return;
      var cb = st.onPick, i = b.dataset.i, area = null;
      if (i !== 'none') { var x = st.rows[+i]; area = { n: x.n, p: x.p, fee: fee(x.p), region: x.r }; }
      close(); if (cb) cb(area);
    });
    m.querySelector('input').addEventListener('input', paint);
    document.body.appendChild(m);
    return m;
  }
  function paint() {
    var m = shell(), q = norm(m.querySelector('input').value), regs = REG.filter(function (r) { return list(st.sid, r[0]).length; });
    if (regs.length && !regs.some(function (r) { return r[0] === st.region; })) st.region = regs[0][0];
    m.querySelector('.dz-reg').innerHTML = !q && regs.length > 1 ? regs.map(function (r) { return '<button type="button" class="' + (st.region === r[0] ? 'on' : '') + '" data-reg="' + r[0] + '">' + r[1] + '</button>'; }).join('') : '';
    /* أثناء البحث: كل المناطق من المنطقتين معًا */
    st.rows = [];
    (q ? regs : regs.filter(function (r) { return r[0] === st.region; })).forEach(function (r) { list(st.sid, r[0]).forEach(function (x) { if (!q || norm(x.n).indexOf(q) >= 0) st.rows.push({ n: x.n, p: x.p, r: r[0], rn: r[1] }); }); });
    var h = st.allowNone !== false ? '<button type="button" class="dz-it none" data-i="none"><span><b>وجهة غير محددة</b><small>يُحدد السعر لاحقًا</small></span><em>لاحقًا</em></button>' : '';
    h += st.rows.map(function (x, i) { return '<button type="button" class="dz-it" data-i="' + i + '"><span><b>' + esc(x.n) + '</b>' + (q && regs.length > 1 ? '<small>' + x.rn + '</small>' : '') + '</span><em dir="ltr">' + esc(x.p) + '</em></button>'; }).join('');
    if (!st.rows.length && q) h += '<div class="dz-empty">لا توجد منطقة بهذا الاسم. اختر "وجهة غير محددة" وحدد السعر لاحقًا</div>';
    if (!regs.length) h += '<div class="dz-empty">لا توجد قائمة أسعار لهذا المتجر بعد</div>';
    m.querySelector('.dz-list').innerHTML = h;
  }
  function close() { var m = document.getElementById('hwDest'); if (m) m.classList.remove('show'); }
  g.HWDest = {
    open: function (o) {
      st = Object.assign({ region: 'salt' }, o || {});
      var m = shell(); m.querySelector('small').textContent = o.sub || ''; m.querySelector('h3').textContent = o.title || 'إلى أين؟';
      m.querySelector('input').value = ''; paint(); m.classList.add('show');
      if (matchMedia('(hover:hover)').matches) setTimeout(function () { m.querySelector('input').focus(); }, 250);
    },
    close: close
  };
})(window);
