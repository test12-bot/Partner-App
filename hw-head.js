/* =========================================================
   HIGHWAY — أعلى الشاشة في التطبيقات الأربعة (hw-head.js)
   جرس التنبيهات + صورة الحساب، والضغط على الصورة يفتح قائمة:
   الملف الشخصي · الدعم · المظهر واللغة · تسجيل الخروج
   كل تطبيق يستدعي HWHead.init مرة واحدة ثم HWHead.user عند الدخول.
   ========================================================= */
(function (g) {
  var S = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var IC = {
    bell: S('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    help: S('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.6A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"/>'),
    moon: S('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
    out: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'),
    sound: S('<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>')
  };
  var opt = {}, box = null, menu = null, me = null, feed = [], KEY = 'hw-ntf';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { try { feed = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(feed)) feed = []; } catch (e) { feed = []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(feed.slice(0, 40))); } catch (e) {} }
  function soundOff() { return g.HWNotify && !HWNotify.isUnlocked(); }
  function unread() { return feed.filter(function (n) { return !n.r; }).length; }
  function paintDot() {
    if (!box) return;
    var n = unread(), b = box.querySelector('.hd-bell');
    b.classList.toggle('has', n > 0 || soundOff());
    b.querySelector('em').textContent = n > 9 ? '9+' : n || '';
    b.setAttribute('aria-label', n ? 'التنبيهات، ' + n + ' جديدة' : 'التنبيهات');
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'الآن'; if (m < 60) return 'قبل ' + m + ' د';
    var h = Math.round(m / 60); if (h < 24) return 'قبل ' + h + ' س';
    var d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1);
  }

  function build() {
    if (box) return;
    box = document.createElement('div'); box.className = 'hd-act'; box.hidden = true;
    box.innerHTML = '<button type="button" class="hd-bell" aria-label="التنبيهات">' + IC.bell + '<em></em></button>' +
      '<button type="button" class="hd-av" aria-haspopup="menu" aria-expanded="false" aria-label="حسابي"><img alt="" width="40" height="40"></button>';
    menu = document.createElement('div'); menu.className = 'hd-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-hidden', 'true');
    box.appendChild(menu);
    box.querySelector('.hd-bell').addEventListener('click', function (e) { e.stopPropagation(); close(); openFeed(); });
    box.querySelector('.hd-av').addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-hd]'); if (!b) return;
      var k = b.dataset.hd; close();
      if (k === 'prefs') { if (g.HWPrefs) HWPrefs.open(); return; }
      var it = (opt.items || []).filter(function (x) { return x.k === k; })[0]; if (it && it.fn) it.fn();
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.hd-act')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    place(null);
  }
  function paintMenu() {
    var items = (opt.items || []).concat([{ k: 'prefs', t: 'المظهر واللغة', ic: IC.moon }]);
    if (opt.logout) items.push({ k: 'logout', t: 'تسجيل الخروج', ic: IC.out, danger: 1, fn: opt.logout });
    opt.items = items.filter(function (x, i, a) { return a.map(function (y) { return y.k; }).indexOf(x.k) === i; });
    menu.innerHTML = '<div class="hd-mh"><img alt="" width="44" height="44" src="' + esc(me && me.img || '') + '"><div><b>' + esc(me && me.name || '') + '</b><small>' + esc(me && me.role || '') + '</small></div></div>' +
      opt.items.map(function (x) { return '<button type="button" role="menuitem" class="hd-mi' + (x.danger ? ' dng' : '') + '" data-hd="' + x.k + '">' + (x.ic || (x.k === 'support' ? IC.help : IC.user)) + '<span>' + esc(x.t) + '</span></button>'; }).join('');
  }
  function toggle() { if (menu.classList.contains('open')) close(); else { paintMenu(); menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); box.querySelector('.hd-av').setAttribute('aria-expanded', 'true'); } }
  function close() { if (!menu) return; menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); box.querySelector('.hd-av').setAttribute('aria-expanded', 'false'); }

  /* لوحة التنبيهات: نافذة سفلية بنفس شكل باقي النوافذ */
  function openFeed() {
    var m = document.getElementById('hdFeed');
    if (!m) {
      m = document.createElement('div'); m.id = 'hdFeed'; m.className = 'modal';
      m.addEventListener('click', function (e) {
        if (e.target === m || e.target.closest('[data-x]')) { m.classList.remove('show'); return; }
        if (e.target.closest('[data-snd]')) { if (g.HWNotify) { HWNotify.unlock(); HWNotify.play('status'); } openFeed(); return; }
        var r = e.target.closest('[data-i]'); if (!r) return;
        var n = feed[+r.dataset.i]; m.classList.remove('show'); if (n && n.go && opt.go) opt.go(n.go);
      });
      document.body.appendChild(m);
    }
    var rows = feed.map(function (n, i) {
      return '<button type="button" class="hd-n' + (n.r ? '' : ' new') + '" data-i="' + i + '"><i></i><span><b>' + esc(n.t) + '</b>' + (n.s ? '<small>' + esc(n.s) + '</small>' : '') + '</span><time>' + ago(n.at) + '</time></button>';
    }).join('');
    m.innerHTML = '<div class="modal-card hd-feed"><div class="hd-fh"><h3>التنبيهات</h3><button type="button" class="hd-fx" data-x="1" aria-label="إغلاق">' + S('<path d="M18 6 6 18M6 6l12 12"/>') + '</button></div>' +
      (soundOff() ? '<button type="button" class="hd-snd" data-snd="1">' + IC.sound + '<span><b>فعّل صوت التنبيهات</b><small>حتى تسمع الطلبات الجديدة فور وصولها</small></span></button>' : '') +
      (rows ? '<div class="hd-list">' + rows + '</div>' : '<div class="hd-empty">' + IC.bell + '<b>لا توجد تنبيهات بعد</b><small>ستظهر هنا تحديثات الطلبات ورسائل الدعم</small></div>') + '</div>';
    m.classList.add('show');
    feed.forEach(function (n) { n.r = 1; }); save(); paintDot();
  }

  /* مكان المجموعة: داخل الهيدر عادةً، أو داخل عنصر آخر (مثل أعلى خريطة الكابتن) */
  function place(el) {
    if (!box) return;
    var host = el || document.querySelector('.app-header');
    if (host && box.parentNode !== host) host.appendChild(box);
  }

  g.HWHead = {
    init: function (o) {
      opt = o || {}; KEY = 'hw-ntf-' + (opt.app || 'app'); load();
      var go = function () { build(); paintDot(); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
      g.addEventListener('pointerdown', function () { setTimeout(paintDot, 60); }, { passive: true, once: true });
      setInterval(function () { if (box && !box.hidden) paintDot(); }, 30000);
    },
    /* u = {img, name, role} أو null عند الخروج */
    user: function (u) {
      build(); me = u; box.hidden = !u;
      if (u) { box.querySelector('.hd-av img').src = u.img || ''; paintMenu(); }
      paintDot();
    },
    place: place,
    close: close,
    /* تنبيه جديد في الجرس: t عنوان، s تفاصيل، go معرّف يفتحه التطبيق عند الضغط */
    push: function (t, s, go) {
      if (!t) return;
      var last = feed[0]; if (last && last.t === t && last.s === s && Date.now() - last.at < 4000) return;
      feed.unshift({ t: String(t), s: s ? String(s) : '', go: go || '', at: Date.now() }); feed = feed.slice(0, 40); save(); paintDot();
    },
    unread: unread,
    clear: function () { feed = []; save(); paintDot(); }
  };
})(window);
