/* =========================================================
   HIGHWAY — سلوك واجهة مشترك (hw-ui.js)
   1) تصغير الشريط السفلي أثناء التمرير (مثل إنستغرام)
   2) المظهر: فاتح / داكن / حسب الجهاز (يُحفظ في hw-theme)
   3) نافذة "المظهر واللغة" (تُفتح من قائمة صورة الحساب أعلى الشاشة)
   4) سحب النوافذ السفلية للأسفل لإغلاقها (مثل iPhone)
   5) بطاقة انقطاع الاتصال برسمة بوكسي
   6) زر الرجوع في أندرويد: يغلق النافذة ثم يرجع شاشة ثم للرئيسية
   ========================================================= */
(function () {
  /* الهيدر يختفي عند النزول ويعود عند أول حركة للأعلى.
     لا يختفي في الصفحات القصيرة (كان يقفز مع أي حركة بسيطة)، ويبقى شريط الساعة بلون الهيدر دائمًا */
  var timer = null, last = window.scrollY, run = 0, root0 = document.documentElement;
  function hdrH() { var h = document.querySelector('.app-header'); if (h && h.offsetHeight) root0.style.setProperty('--hdr-h', h.offsetHeight + 'px'); }
  function room() { return root0.scrollHeight - window.innerHeight; }        // كم يمكن النزول في هذه الصفحة
  window.addEventListener('scroll', function () {
    var y = window.scrollY, dy = y - last, b = document.body, long = room() > 360;
    if (Math.abs(dy) > 3 && y > 20) b.classList.add('bar-mini');
    if (y < 120 || !long) { run = 0; b.classList.remove('hdr-hide'); }
    else if (dy > 0) { run = Math.max(0, run) + dy; if (run > 48) b.classList.add('hdr-hide'); }
    else if (dy < 0) { run = Math.min(0, run) + dy; if (run < -18) b.classList.remove('hdr-hide'); }
    last = y; clearTimeout(timer);
    timer = setTimeout(function () { b.classList.remove('bar-mini'); }, 260);
  }, { passive: true });
  function strip() { if (document.querySelector('.hw-sb')) return; var d = document.createElement('div'); d.className = 'hw-sb'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d); }
  window.addEventListener('resize', hdrH);
  document.addEventListener('DOMContentLoaded', function () { hdrH(); strip(); }); window.addEventListener('load', hdrH); setTimeout(hdrH, 1500);
  if (document.readyState !== 'loading') strip();
  window.HWUiHeader = hdrH;

  /* ---------- المظهر ---------- */
  var root = document.documentElement, mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function pref() { try { return localStorage.getItem('hw-theme') || 'light'; } catch (e) { return 'light'; } }
  function apply() {
    var p = pref(), dark = p === 'dark' || (p === 'auto' && mq && mq.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#0C1F20' : '#25CED1');
  }
  if (mq && mq.addEventListener) mq.addEventListener('change', apply);
  apply();

  /* ---------- نافذة المظهر واللغة ---------- */
  var THEMES = [['light', 'فاتح'], ['dark', 'داكن'], ['auto', 'حسب الجهاز']], LANGS = [['ar', 'العربية'], ['en', 'English']];
  function sheet() {
    var m = document.getElementById('hwPrefs');
    if (!m) {
      m = document.createElement('div'); m.id = 'hwPrefs'; m.className = 'modal';
      m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); });
      document.body.appendChild(m);
    }
    var lang = window.HWI18n ? HWI18n.lang : 'ar';
    m.innerHTML = '<div class="modal-card glass hw-prefs"><h3>المظهر واللغة</h3><small>المظهر</small><div class="hw-seg">' +
      THEMES.map(function (x) { return '<button type="button" data-theme-set="' + x[0] + '" class="' + (pref() === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') +
      '</div><small>اللغة</small><div class="hw-seg" data-no-tr>' + LANGS.map(function (x) { return '<button type="button" data-lang-set="' + x[0] + '" class="' + (lang === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') +
      '</div><button type="button" class="submit-btn" data-close="1"><span class="btn-label">تم</span></button></div>';
    m.classList.add('show');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-set],[data-lang-set],[data-close]');
    if (!b) return;
    if (b.dataset.close) { document.getElementById('hwPrefs').classList.remove('show'); return; }
    if (b.dataset.themeSet) { try { localStorage.setItem('hw-theme', b.dataset.themeSet); } catch (x) {} apply(); sheet(); return; }
    if (b.dataset.langSet && window.HWI18n && b.dataset.langSet !== HWI18n.lang) HWI18n.set(b.dataset.langSet);
  });
  window.HWPrefs = { open: sheet };
})();

/* ---------- سحب النافذة السفلية للأسفل لإغلاقها ----------
   يبدأ السحب من أعلى النافذة (منطقة المقبض) أو من أي مكان إن كان محتواها في الأعلى.
   الإغلاق = نفس الضغط على الخلفية، فتعمل دالة الإغلاق الخاصة بكل نافذة */
(function () {
  var card = null, modal = null, y0 = 0, t0 = 0, dy = 0, mode = '', fromTop = false;
  function reset(c) { c.style.transition = ''; c.style.transform = ''; }
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var c = e.target.closest && e.target.closest('.modal.show > .modal-card');
    if (!c || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.closest('.leaflet-container,[data-no-swipe]')) return;
    var r = c.getBoundingClientRect(); y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0;
    fromTop = y0 - r.top < 56; if (!fromTop && c.scrollTop > 0) return;
    card = c; modal = c.parentElement; mode = '';
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!card) return;
    dy = e.touches[0].clientY - y0;
    if (!mode) { if (Math.abs(dy) < 6) return; mode = dy > 0 && (fromTop || card.scrollTop <= 0) ? 'drag' : 'scroll'; }
    if (mode !== 'drag') { card = null; return; }
    if (e.cancelable) e.preventDefault();
    card.style.transition = 'none'; card.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
  }, { passive: false });
  function end() {
    if (!card) return; var c = card, m = modal; card = null;
    if (mode !== 'drag') return;
    var v = dy / Math.max(1, Date.now() - t0);
    c.style.transition = 'transform .22s ease-out';
    if (dy > 110 || (dy > 40 && v > .55)) {
      c.style.transform = 'translateY(105%)';
      setTimeout(function () { m.dispatchEvent(new MouseEvent('click', { bubbles: true })); setTimeout(function () { reset(c); }, 60); }, 200);
    } else { c.style.transform = 'translateY(0)'; setTimeout(function () { reset(c); }, 230); }
  }
  document.addEventListener('touchend', end); document.addEventListener('touchcancel', end);
})();

/* ---------- انقطاع الاتصال أو تعذر تحميل البيانات: بطاقة برسمة بوكسي بدل رسالة نصية ---------- */
(function () {
  var box = null, hideT = null, art = '';
  /* نحمّل الرسمة مسبقًا ونحتفظ بها في الذاكرة، لأنها ستُعرض حين لا يوجد إنترنت أصلًا */
  try { fetch('art/offline.svg').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) { if (t && t.indexOf('<svg') >= 0) { art = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t); if (box) box.querySelector('.hw-net-art').src = art; } }).catch(function () {}); } catch (e) {}
  function el() {
    if (box) return box;
    box = document.createElement('div'); box.className = 'hw-net'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<img class="hw-net-art" alt="" src="' + (art || 'art/offline.svg') + '"><div><b></b><small></small></div>';
    var st = document.createElement('style');
    st.textContent = '.hw-net{position:fixed;inset-inline:12px;bottom:calc(96px + env(safe-area-inset-bottom));z-index:3000;display:flex;align-items:center;gap:12px;background:#fff;color:#0E3A3B;border-radius:20px;padding:10px 14px 10px 10px;box-shadow:0 10px 30px rgba(14,58,59,.18);transform:translateY(140%);opacity:0;transition:transform .4s ease,opacity .4s ease;max-width:520px;margin:0 auto}' +
      '.hw-net.show{transform:none;opacity:1}.hw-net-art{display:block;height:clamp(58px,10vh,80px);width:auto;flex:none}.hw-net b{display:block;font-size:15px}.hw-net small{display:block;font-size:12.5px;opacity:.75;margin-top:2px}' +
      '[data-theme=dark] .hw-net{background:#16302F;color:#F5EDE3}@media (prefers-reduced-motion:reduce){.hw-net{transition:opacity .2s}}';
    document.head.appendChild(st); document.body.appendChild(box); return box;
  }
  function show(off) {
    var b = el(); clearTimeout(hideT);
    b.classList.toggle('ok', !off);
    b.querySelector('b').textContent = off ? 'لا يوجد اتصال بالإنترنت' : 'عاد الاتصال';
    var n = window.HWOrders && HWOrders.pending ? HWOrders.pending() : 0;
    b.querySelector('small').textContent = off ? (n ? 'ما قمت به محفوظ على جهازك (' + n + ') وسيُرسل تلقائيًا فور عودة الاتصال' : 'تحقق من الشبكة، وسنحاول مجددًا تلقائيًا') : (n ? 'جاري إرسال ما حُفظ…' : 'تم تحديث البيانات');
    requestAnimationFrame(function () { b.classList.add('show'); });
    if (!off) hideT = setTimeout(function () { b.classList.remove('show'); }, 2200);
  }
  var down = false;
  function off() { if (down) return; down = true; show(true); }
  function on() { if (!down) return; down = false; show(false); }
  window.addEventListener('offline', off); window.addEventListener('online', on);
  window.addEventListener('hw-neterr', off); window.addEventListener('hw-netok', on);
  window.addEventListener('hw-outbox', function () { if (down) show(true); });
  if (navigator.onLine === false) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', off); else off(); }
})();

/* ---------- زر الرجوع في أندرويد (وفي نسخة APK) ----------
   الرجوع يغلق أعلى نافذة مفتوحة، ثم يرجع شاشة واحدة، ثم يعود للرئيسية، وفقط من الرئيسية يخرج من التطبيق */
(function () {
  if (!window.history || !history.pushState) return;
  var armed = false;
  function arm() { try { history.pushState({ hwBack: 1 }, ''); armed = true; } catch (e) {} }
  function active() { var a = document.querySelector('.screen.active'); return a ? a.id : ''; }
  function vis(el) { return el && el.offsetParent !== null || (el && getComputedStyle(el).position === 'fixed' && getComputedStyle(el).display !== 'none'); }
  function closeTop() {
    var crop = document.querySelector('.hw-crop [data-x]'); if (crop) { crop.click(); return true; }
    var gl = document.querySelector('.hw-onb, #splash.onb-mode'); if (gl) return true;                       // شاشات التعريف: الرجوع لا يفعل شيئًا
    if (window.HWSupport && HWSupport.isOpen()) { HWSupport.close(); return true; }
    var mods = [].slice.call(document.querySelectorAll('.modal.show')).filter(vis);
    if (mods.length) {
      mods.sort(function (a, b) { return (+getComputedStyle(a).zIndex || 0) - (+getComputedStyle(b).zIndex || 0); });
      var m = mods[mods.length - 1]; m.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      if (m.classList.contains('show')) m.classList.remove('show');
      return true;
    }
    var lf = document.getElementById('locFull'); if (lf && lf.classList.contains('show') && typeof window.closeLoc === 'function') { window.closeLoc(); return true; }
    var sp = document.getElementById('splash'); if (sp && sp.classList.contains('login-mode') && !sp.classList.contains('hide') && typeof window.closeLogin === 'function') { window.closeLogin(); return true; }
    return false;
  }
  function backScreen() {
    var cur = active(); if (!cur) return false;
    var home = document.getElementById('screen-jobs') && !document.getElementById('screen-home') ? 'screen-jobs' : 'screen-home';
    if (typeof window.goBack === 'function') { window.goBack(); if (active() !== cur) return true; }
    if (cur !== home && typeof window.tabGo === 'function') { window.tabGo(home); return active() !== cur; }
    return false;
  }
  window.addEventListener('popstate', function () {
    if (!armed) return; armed = false;
    if (closeTop() || backScreen()) { arm(); return; }
    history.back();                                                     // من الرئيسية: خروج طبيعي
  });
  /* المتصفح يتجاهل سجل الرجوع الذي يُضاف قبل أول لمسة، لذلك نجهّزه عند أول تفاعل */
  var first = function () { if (!armed) arm(); };
  document.addEventListener('pointerdown', first, { capture: true });
  document.addEventListener('keydown', first, { capture: true });
})();

/* عامل الخدمة: حفظ ملفات التطبيق على الجهاز (فتح أسرع) + الإشعارات */
(function () {
  if (!('serviceWorker' in navigator) || !/^https:|^http:\/\/localhost/.test(location.href) || navigator.webdriver) return;
  window.addEventListener('load', function () { try { navigator.serviceWorker.register('sw.js'); } catch (e) {} });
})();
