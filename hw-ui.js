/* =========================================================
   HIGHWAY — سلوك واجهة مشترك (hw-ui.js)
   1) تصغير الشريط السفلي أثناء التمرير (مثل إنستغرام)
   2) المظهر: فاتح / داكن / حسب الجهاز (يُحفظ في hw-theme)
   3) صف "المظهر واللغة" يُضاف تلقائيًا لصفحة "حسابي" في كل تطبيق
   ========================================================= */
(function () {
  var timer = null, last = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (Math.abs(y - last) > 3 && y > 20) document.body.classList.add('bar-mini');
    last = y; clearTimeout(timer);
    timer = setTimeout(function () { document.body.classList.remove('bar-mini'); }, 260);
  }, { passive: true });

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

  /* ---------- صف الإعدادات في صفحة الحساب ---------- */
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
  var THEMES = [['light', 'فاتح'], ['dark', 'داكن'], ['auto', 'حسب الجهاز']], LANGS = [['ar', 'العربية'], ['en', 'English']];
  function label() {
    var t = THEMES.filter(function (x) { return x[0] === pref(); })[0];
    return (t ? t[1] : 'فاتح') + ' · ' + (window.HWI18n && HWI18n.lang === 'en' ? 'English' : 'العربية');
  }
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
    var b = e.target.closest && e.target.closest('[data-theme-set],[data-lang-set],[data-close],#hwPrefRow');
    if (!b) return;
    if (b.id === 'hwPrefRow') { sheet(); return; }
    if (b.dataset.close) { document.getElementById('hwPrefs').classList.remove('show'); return; }
    if (b.dataset.themeSet) { try { localStorage.setItem('hw-theme', b.dataset.themeSet); } catch (x) {} apply(); sheet(); fill(); return; }
    if (b.dataset.langSet && window.HWI18n && b.dataset.langSet !== HWI18n.lang) HWI18n.set(b.dataset.langSet);
  });
  function fill() { var v = document.getElementById('hwPrefVal'); if (v) v.textContent = label(); }
  function inject() {
    var list = document.querySelector('#screen-profile .pf-list');
    if (!list || document.getElementById('hwPrefRow')) return;
    var row = document.createElement('button'); row.type = 'button'; row.id = 'hwPrefRow'; row.className = 'pf-row pf-link';
    row.innerHTML = '<span class="pf-ico">' + ICON + '</span><span class="pf-k">المظهر واللغة</span><span class="pf-v" id="hwPrefVal"></span>';
    list.appendChild(row); fill();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject();
})();
