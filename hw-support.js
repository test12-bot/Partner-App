/* =========================================================
   HIGHWAY — الدعم داخل التطبيقات (hw-support.js)
   محادثة واحدة مستمرة لكل حساب مع فريق HIGHWAY (عميل c، كابتن k، متجر s).
   - يمكن إرفاق رقم طلب بالرسالة (زر "مشكلة في هذا الطلب").
   - صور: تُصغَّر على الجهاز قبل الإرسال.
   - خارج ساعات الدعم يصل رد تلقائي بموعد الرد.
   - لوحة الإدارة: صندوق محادثات، غير المقروء أولًا، وإغلاق المحادثة عند حلّها.
   البيانات: support/<role-uid> = { role, uid, name, phone, img, status, lastAt, lastText, unU, unA, msgs: { id: {f:'u'|'a', t, o, img, at, auto} } }
   ========================================================= */
(function (g) {
  var col = null, opt = null, cur = null, open = false, seen = {}, primed = false, pendingOrder = '', draftImg = '';
  var ROLE = { c: 'عميل', k: 'كابتن', s: 'متجر' };
  var S = function (d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    x: S('<path d="M18 6 6 18M6 6l12 12"/>'), back: S('<path d="M9 18l6-6-6-6"/>'),
    send: S('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>'), cam: S('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3"/>'),
    bag: S('<path d="M6 3h12l2 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7l2-4Z"/><path d="M4 7h16"/>', 16), ok: S('<path d="M20 6 9 17l-5-5"/>', 18),
    chat: S('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/>', 40)
  };
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function day(t) { var d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return 'اليوم'; n.setDate(n.getDate() - 1); if (d.toDateString() === n.toDateString()) return 'أمس'; return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function msgs(th) { var m = th && th.msgs || {}; return Object.keys(m).map(function (k) { return Object.assign({ id: k }, m[k]); }).sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); }
  /* صورة صاحب المحادثة عند الإدارة: تُحسب من بياناته الحالية (شعار المتجر، صورة الكابتن) */
  function avOf(th) { return (opt.avatar && opt.avatar(th)) || (th && th.img) || 'art/av-hw.jpg'; }
  function isAdmin() { return opt && opt.role === 'a'; }
  function myId() { var u = opt.me(); return u ? opt.role + '-' + String(u.uid).replace(/[.#$\[\]\/]/g, '_') : ''; }
  function hours() { var s = g.HWBiz && HWBiz.setting ? HWBiz.setting('support') : {}, c = (g.HW_CONFIG || {}).supportHours || [9, 24]; return [s.from != null ? +s.from : c[0], s.to != null ? +s.to : c[1]]; }
  function inHours(t) { var h = new Date(t || Date.now()).getHours(), r = hours(); return r[1] > r[0] ? h >= r[0] && h < r[1] : h >= r[0] || h < r[1]; }
  function hLabel(h) { h = h % 24; return h === 0 ? '12 ليلًا' : h === 12 ? '12 ظهرًا' : h < 12 ? h + ' صباحًا' : (h - 12) + ' مساءً'; }
  function mid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  /* ---------- الإرسال ---------- */
  function send(thId, m) {
    var th = col.get(thId), now = Date.now(), k = mid(), w = {}, p = {};
    m.at = now; w['msgs/' + k] = m;
    var preview = m.t || (m.img ? 'صورة' : '');
    var base = { lastAt: now, lastText: preview.slice(0, 80), lastFrom: m.f };
    if (m.f === 'u') Object.assign(base, { unA: ((th && th.unA) || 0) + 1, status: 'open' }); else Object.assign(base, { unU: ((th && th.unU) || 0) + 1 });
    Object.assign(w, base); Object.assign(p, base, { msgs: Object.assign({}, th && th.msgs, (function () { var o = {}; o[k] = m; return o; })()) });
    if (!th) {
      var u = opt.me();
      col.create(Object.assign({ id: thId, role: opt.role, uid: String(u.uid), name: u.name || '', phone: u.phone || '', img: u.img && u.img.length < 200 ? u.img : '', status: 'open' }, p));
    } else col.patch(thId, p, false, w);
    /* خارج ساعات الدعم: رد تلقائي (مرة كل 6 ساعات على الأكثر) */
    if (m.f === 'u' && !inHours(now)) {
      var lastAuto = msgs(col.get(thId)).filter(function (x) { return x.auto; }).pop();
      if (!lastAuto || now - lastAuto.at > 6 * 3600e3) setTimeout(function () {
        var r = hours();
        send(thId, { f: 'a', auto: 1, t: 'شكرًا لتواصلك مع HIGHWAY. فريق الدعم متاح من ' + hLabel(r[0]) + ' حتى ' + hLabel(r[1]) + '، وسنرد على رسالتك فور بدء الدوام.' });
      }, 700);
    }
  }
  function markRead(thId) {
    var th = col.get(thId); if (!th) return;
    var f = isAdmin() ? 'unA' : 'unU'; if (th[f]) { var p = {}; p[f] = 0; col.patch(thId, p); }
  }

  /* ---------- الصورة: تصغير إلى 1024 بكسل قبل الإرسال ---------- */
  function shrink(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () {
        var im = new Image();
        im.onload = function () {
          var k = Math.min(1, 1024 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72));
        };
        im.onerror = rej; im.src = fr.result;
      };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }

  /* ---------- نافذة المحادثة (للطرفين) ---------- */
  function shell() {
    var m = document.getElementById('hwSup');
    if (m) return m;
    m = document.createElement('div'); m.id = 'hwSup'; m.className = 'hw-sup'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'الدعم');
    m.innerHTML = '<div class="sp-top"><button type="button" class="sp-x" data-sp="close" aria-label="رجوع">' + IC.back + '</button><img class="sp-av" alt="" width="40" height="40"><div class="sp-id"><b></b><small></small></div><span class="sp-act"></span></div>' +
      '<div class="sp-body" data-no-swipe></div>' +
      '<div class="sp-foot"><div class="sp-att"></div><div class="sp-row"><label class="sp-cam" aria-label="إرفاق صورة">' + IC.cam + '<input type="file" accept="image/*" hidden></label>' +
      '<textarea rows="1" placeholder="اكتب رسالتك…" aria-label="رسالتك"></textarea><button type="button" class="sp-send" data-sp="send" aria-label="إرسال">' + IC.send + '</button></div></div>';
    document.body.appendChild(m);
    var ta = m.querySelector('textarea');
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(hover:hover)').matches) { e.preventDefault(); submit(); } });
    m.querySelector('input[type=file]').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      shrink(f).then(function (d) { draftImg = d; foot(); }).catch(function () {});
    });
    m.addEventListener('click', function (e) {
      var b = e.target.closest('[data-sp]'); if (!b) return;
      var k = b.dataset.sp;
      if (k === 'close') close();
      else if (k === 'send') submit();
      else if (k === 'unorder') { pendingOrder = ''; foot(); }
      else if (k === 'unimg') { draftImg = ''; foot(); }
      else if (k === 'solve') { col.patch(cur, { status: 'closed' }); send(cur, { f: 'a', auto: 1, t: 'تم إغلاق المحادثة. إن احتجت أي شيء آخر اكتب لنا هنا في أي وقت.' }); paint(); }
      else if (k === 'call') { var th = col.get(cur); if (th && th.phone) location.href = 'tel:' + th.phone; }
      else if (k === 'img') b.classList.toggle('zoom');
    });
    return m;
  }
  function foot() {
    var m = shell(), a = m.querySelector('.sp-att');
    a.innerHTML = (pendingOrder ? '<span class="sp-chip">' + IC.bag + 'بخصوص الطلب <b dir="ltr">' + esc(pendingOrder) + '</b><button type="button" data-sp="unorder" aria-label="إزالة">' + S('<path d="M18 6 6 18M6 6l12 12"/>', 14) + '</button></span>' : '') +
      (draftImg ? '<span class="sp-chip im"><img src="' + draftImg + '" alt=""><button type="button" data-sp="unimg" aria-label="إزالة الصورة">' + S('<path d="M18 6 6 18M6 6l12 12"/>', 14) + '</button></span>' : '');
    a.hidden = !pendingOrder && !draftImg;
  }
  function submit() {
    var m = shell(), ta = m.querySelector('textarea'), t = ta.value.trim();
    if (!t && !draftImg) { ta.focus(); return; }
    var msg = { f: isAdmin() ? 'a' : 'u', t: t };
    if (pendingOrder) msg.o = pendingOrder;
    if (draftImg) msg.img = draftImg;
    send(cur, msg);
    ta.value = ''; ta.style.height = 'auto'; pendingOrder = ''; draftImg = ''; foot(); paint();
    try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) {}
  }
  function paint() {
    if (!open) return;
    var m = shell(), th = col.get(cur), list = msgs(th), body = m.querySelector('.sp-body');
    var top = m.querySelector('.sp-id'), act = m.querySelector('.sp-act');
    if (isAdmin()) {
      m.querySelector('.sp-av').src = avOf(th);
      top.querySelector('b').textContent = th ? th.name || '—' : '';
      top.querySelector('small').textContent = th ? ROLE[th.role] + (th.phone ? ' · ' + th.phone : '') + (th.status === 'closed' ? ' · مغلقة' : '') : '';
      act.innerHTML = (th && th.phone ? '<button type="button" class="sp-ab" data-sp="call" aria-label="اتصال">' + S('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>', 18) + '</button>' : '') +
        (th && th.status !== 'closed' ? '<button type="button" class="sp-ab solve" data-sp="solve">' + IC.ok + 'تم الحل</button>' : '');
    } else {
      var on = inHours(), r = hours();
      m.querySelector('.sp-av').src = 'art/av-hw.jpg';
      top.querySelector('b').textContent = 'دعم HIGHWAY';
      top.querySelector('small').innerHTML = on ? '<i class="sp-on"></i>متاح الآن · نرد عادة خلال دقائق' : 'خارج الدوام · نرد من ' + hLabel(r[0]);
      act.innerHTML = '';
    }
    var lastDay = '', h = '';
    if (!list.length) h = '<div class="sp-empty">' + IC.chat + '<b>' + (isAdmin() ? 'لا رسائل بعد' : 'كيف نقدر نساعدك؟') + '</b><small>' + (isAdmin() ? '' : 'اكتب سؤالك أو مشكلتك، ويمكنك إرفاق صورة. نرد عليك هنا مباشرة.') + '</small></div>';
    list.forEach(function (x) {
      var d = day(x.at); if (d !== lastDay) { h += '<div class="sp-day"><span>' + d + '</span></div>'; lastDay = d; }
      var mine = isAdmin() ? x.f === 'a' : x.f === 'u';
      h += '<div class="sp-m ' + (mine ? 'me' : 'them') + (x.auto ? ' auto' : '') + '">' +
        (x.o ? '<span class="sp-o">' + IC.bag + '<b dir="ltr">' + esc(x.o) + '</b></span>' : '') +
        (x.img ? '<img class="sp-img" src="' + esc(x.img) + '" alt="صورة مرفقة" data-sp="img">' : '') +
        (x.t ? '<p>' + esc(x.t).replace(/\n/g, '<br>') + '</p>' : '') + '<time>' + hm(x.at) + '</time></div>';
    });
    var atEnd = body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    body.innerHTML = h;
    if (atEnd || !body.dataset.p) { body.scrollTop = body.scrollHeight; body.dataset.p = 1; }
    markRead(cur);
  }
  function show(thId) {
    cur = thId; open = true;
    var m = shell(); m.querySelector('.sp-body').dataset.p = '';
    m.classList.add('show'); document.body.classList.add('sp-open'); foot(); paint();
    if (g.HWHead) HWHead.close();
  }
  function close() { open = false; var m = document.getElementById('hwSup'); if (m) m.classList.remove('show'); document.body.classList.remove('sp-open'); if (isAdmin() && opt.onChange) opt.onChange(); }

  /* ---------- صندوق الإدارة ---------- */
  var filter = 'open';
  function inbox(el) {
    if (!el) return;
    var all = col.list().filter(function (t) { return t && t.role; }).sort(function (a, b) { return (b.unA ? 1 : 0) - (a.unA ? 1 : 0) || (b.lastAt || 0) - (a.lastAt || 0); });
    var list = all.filter(function (t) { return filter === 'all' || (filter === 'open' ? t.status !== 'closed' : t.status === 'closed'); });
    var n = { open: all.filter(function (t) { return t.status !== 'closed'; }).length, closed: all.filter(function (t) { return t.status === 'closed'; }).length };
    el.innerHTML = '<div class="sp-tabs">' + [['open', 'مفتوحة'], ['closed', 'مغلقة'], ['all', 'الكل']].map(function (x) { return '<button type="button" class="sp-tab' + (filter === x[0] ? ' on' : '') + '" data-spf="' + x[0] + '">' + x[1] + (n[x[0]] != null ? ' <em>' + n[x[0]] + '</em>' : '') + '</button>'; }).join('') + '</div>' +
      (list.length ? '<div class="sp-inbox">' + list.map(function (t) {
        return '<button type="button" class="sp-th' + (t.unA ? ' un' : '') + '" data-spt="' + esc(t.id) + '"><img src="' + esc(avOf(t)) + '" alt="" width="46" height="46"><span class="sp-tt"><b>' + esc(t.name || '—') + '<em class="r-' + t.role + '">' + ROLE[t.role] + '</em></b><small>' + (t.lastFrom === 'a' ? 'أنت: ' : '') + esc(t.lastText || '') + '</small></span><span class="sp-tm"><time>' + (t.lastAt ? (day(t.lastAt) === 'اليوم' ? hm(t.lastAt) : day(t.lastAt)) : '') + '</time>' + (t.unA ? '<i>' + t.unA + '</i>' : '') + '</span></button>';
      }).join('') + '</div>' : '<div class="sp-empty">' + IC.chat + '<b>' + (filter === 'closed' ? 'لا محادثات مغلقة' : 'لا محادثات مفتوحة') + '</b><small>رسائل العملاء والمطاعم والكباتن تصل هنا مباشرة</small></div>');
    if (!el.dataset.w) {
      el.dataset.w = 1;
      el.addEventListener('click', function (e) {
        var f = e.target.closest('[data-spf]'); if (f) { filter = f.dataset.spf; inbox(el); return; }
        var t = e.target.closest('[data-spt]'); if (t) show(t.dataset.spt);
      });
    }
  }
  function unreadAdmin() { return col ? col.list().reduce(function (n, t) { return n + (t.status !== 'closed' && t.unA ? 1 : 0); }, 0) : 0; }

  /* ---------- تنبيه برسالة جديدة ---------- */
  function watch(list) {
    list.forEach(function (t) {
      var ms = msgs(t), lastIn = ms.filter(function (x) { return isAdmin() ? x.f === 'u' : x.f === 'a'; }).pop();
      if (!lastIn) return;
      if (primed && seen[t.id] !== lastIn.id && !(open && cur === t.id)) {
        if (g.HWNotify) { HWNotify.play(isAdmin() ? 'alert' : 'status'); HWNotify.notify(isAdmin() ? 'رسالة دعم من ' + (t.name || ROLE[t.role]) : 'رد من دعم HIGHWAY', lastIn.t || 'صورة', 'support:' + t.id); }
        if (g.HWOrders && HWOrders.toast) HWOrders.toast(isAdmin() ? 'رسالة دعم جديدة من ' + (t.name || '') : 'وصلك رد من دعم HIGHWAY');
      }
      seen[t.id] = lastIn.id;
    });
    primed = true;
  }

  g.HWSupport = {
    /* o = { role: 'c'|'k'|'s'|'a', me: function () { return {uid, name, phone, img}; }, onChange } */
    init: function (o) {
      opt = o; col = HWDB.col('support');
      if (!isAdmin()) { var id = myId(); if (id) col.scope([{ by: '$key', eq: id }]); }
      col.subscribe(function (list) {
        if (!isAdmin()) { var id = myId(); list = list.filter(function (t) { return t.id === id; }); }
        watch(list); paint(); if (opt.onChange) opt.onChange();
      });
    },
    /* حساب جديد سجّل الدخول: نحصر القراءة في محادثته */
    rescope: function () { if (col && !isAdmin()) { var id = myId(); if (id) col.scope([{ by: '$key', eq: id }]); } },
    /* open({order: 'ORD#…'}) للمستخدم، أو open('thread-id') للإدارة */
    open: function (x) {
      if (!col) return;
      if (isAdmin()) { if (typeof x === 'string') show(x); return; }
      if (!opt.me()) return;
      pendingOrder = x && x.order ? x.order : '';
      show(myId());
      setTimeout(function () { var ta = shell().querySelector('textarea'); if (ta && pendingOrder) ta.focus(); }, 350);
    },
    close: close,
    isOpen: function () { return open; },
    inbox: inbox,
    unread: function () { if (isAdmin()) return unreadAdmin(); var t = col && col.get(myId()); return t && t.unU || 0; },
    inHours: inHours
  };
})(window);
