/* =========================================================
   HIGHWAY — أيقونات خاصة بالهوية (مرسومة بنفس أسلوب رسومات HIGHWAY):
   إطار بلون currentColor، وجسم بلون --ic-b، ولمسة بلون --ic-a.
   تُركّب تلقائيًا على شريط التنقل وزر الإشعارات وقائمة الصورة الشخصية في التطبيقات الأربعة.
   ========================================================= */
(function (g) {
  var O = 'stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"', B = 'fill="var(--ic-b,#F5EDE3)"', A = 'fill="var(--ic-a,#E8EF44)"', A2 = 'fill="var(--ic-c,#26CED0)"';
  var P = {
    home: '<path d="M14 31 32 16l18 15v18a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z" ' + B + ' ' + O + '/><path d="M27 52V41h10v11" ' + A2 + ' ' + O + '/><path d="M9 33 32 13l23 20" fill="none" ' + O + '/>',
    search: '<circle cx="28" cy="28" r="15" ' + B + ' ' + O + '/><path d="M21 25a8 8 0 0 1 8-6" fill="none" stroke="var(--ic-a,#E8EF44)" stroke-width="3.4" stroke-linecap="round"/><path d="M39 39l12 12" fill="none" ' + O + ' stroke-width="5"/>',
    orders: '<path d="M25 19v-4a7 7 0 0 1 14 0v4" fill="none" ' + O + '/><rect x="13" y="19" width="38" height="33" rx="7" ' + A2 + ' ' + O + '/><rect x="19" y="25" width="26" height="20" rx="4" ' + B + ' stroke="currentColor" stroke-width="2.4"/><path d="M23 40c4-7 11-10 18-9" fill="none" stroke="var(--ic-a,#E8EF44)" stroke-width="3.4" stroke-linecap="round"/>',
    jobs: '<path d="M35 8 16 35h13l-3 21 22-30H35l3-18Z" ' + A + ' ' + O + '/><path d="M33 17l-8 11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>',
    earn: '<rect x="10" y="18" width="44" height="32" rx="7" ' + B + ' ' + O + '/><path d="M10 26h44" fill="none" ' + O + '/><rect x="36" y="32" width="18" height="10" rx="4" ' + A + ' ' + O + '/><circle cx="42" cy="37" r="1.8" fill="currentColor"/><path d="M16 18l20-8 4 8" fill="none" ' + O + '/>',
    prices: '<path d="M16 9h32v46l-6-4-5 4-5-4-5 4-5-4-6 4Z" ' + B + ' ' + O + '/><path d="M23 21h18M23 30h18M23 39h10" fill="none" ' + O + '/><circle cx="42" cy="40" r="5" ' + A + ' stroke="currentColor" stroke-width="2.4"/>',
    menu: '<circle cx="34" cy="34" r="17" ' + B + ' ' + O + '/><circle cx="34" cy="34" r="9" ' + A + ' stroke="currentColor" stroke-width="2.4"/><path d="M11 9v16a4 4 0 0 0 4 4v25M15 9v12M19 9v16a4 4 0 0 1-4 4" fill="none" ' + O + '/>',
    caps: '<path d="M14 54c0-10 8-16 18-16s18 6 18 16" ' + A2 + ' ' + O + '/><circle cx="32" cy="26" r="9" ' + B + ' ' + O + '/><path d="M22 23c1-7 6-10 10-10 6 0 10 4 10 9H22Z" ' + A + ' ' + O + '/><path d="M41 22h9" fill="none" ' + O + '/>',
    manage: '<path d="M32 9l4 6 7-2 1 7 7 3-3 6 4 6-6 4v7h-7l-3 6-6-4-6 4-3-6h-7v-7l-6-4 4-6-3-6 7-3 1-7 7 2Z" ' + B + ' ' + O + '/><circle cx="32" cy="32" r="7" ' + A + ' ' + O + '/>',
    support: '<path d="M53 30c0 10-9 17-21 17-3 0-6-.5-8-1.5L12 49l3-8c-2.5-3-4-7-4-11 0-10 9-17 21-17s21 7 21 17Z" ' + B + ' ' + O + '/><circle cx="24" cy="30" r="2.6" fill="currentColor"/><circle cx="32" cy="30" r="2.6" fill="var(--ic-c,#26CED0)"/><circle cx="40" cy="30" r="2.6" fill="currentColor"/>',
    bell: '<path d="M18 41V30a14 14 0 0 1 28 0v11l4 6H14Z" ' + A + ' ' + O + '/><path d="M27 51a5 5 0 0 0 10 0" fill="none" ' + O + '/><path d="M32 11v4" fill="none" ' + O + '/>',
    user: '<circle cx="32" cy="24" r="10" ' + B + ' ' + O + '/><path d="M13 54c1-11 9-17 19-17s18 6 19 17" ' + A2 + ' ' + O + '/>',
    moon: '<path d="M44 40A18 18 0 0 1 26 14a18 18 0 1 0 18 26Z" ' + A + ' ' + O + '/>',
    out: '<path d="M28 12H16a4 4 0 0 0-4 4v32a4 4 0 0 0 4 4h12" ' + B + ' ' + O + '/><path d="M26 32h26M42 22l10 10-10 10" fill="none" ' + O + '/>',
    pin: '<ellipse cx="32" cy="54" rx="13" ry="4" ' + A + '/><path d="M32 52S14 37 14 25a18 18 0 0 1 36 0c0 12-18 27-18 27Z" ' + A2 + ' ' + O + '/><circle cx="32" cy="25" r="7" ' + B + ' ' + O + '/>',
    heart: '<path d="M32 52S10 39 10 23a11 11 0 0 1 22-3 11 11 0 0 1 22 3c0 16-22 29-22 29Z" ' + B + ' ' + O + '/><path d="M18 23a6 6 0 0 1 6-6" fill="none" stroke="var(--ic-a,#E8EF44)" stroke-width="3.4" stroke-linecap="round"/><path d="M38 34c3-1 6-4 7-8" fill="none" stroke="var(--ic-c,#26CED0)" stroke-width="3.4" stroke-linecap="round"/>',
    star: '<path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2Z" ' + A + ' ' + O + '/><path d="M27 24l2-4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>',
    phone: '<rect x="18" y="8" width="28" height="48" rx="7" ' + B + ' ' + O + '/><rect x="23" y="15" width="18" height="26" rx="3" ' + A2 + ' stroke="currentColor" stroke-width="2.4"/><circle cx="32" cy="48" r="2.6" fill="currentColor"/><path d="M27 21h6" fill="none" stroke="var(--ic-a,#E8EF44)" stroke-width="3" stroke-linecap="round"/>',
    map: '<path d="M8 16l15-6 18 6 15-6v38l-15 6-18-6-15 6Z" ' + B + ' ' + O + '/><path d="M23 10v38M41 16v38" fill="none" ' + O + '/><path d="M41 16l15-6v38l-15 6Z" ' + A2 + ' ' + O + '/><circle cx="31" cy="30" r="4" ' + A + ' stroke="currentColor" stroke-width="2.4"/>',
    shield: '<path d="M32 8l20 7v14c0 13-9 22-20 27-11-5-20-14-20-27V15Z" ' + A2 + ' ' + O + '/><path d="M23 31l6 6 12-12" fill="none" ' + O + ' stroke="var(--ic-b,#F5EDE3)" stroke-width="4"/>',
    card: '<rect x="8" y="14" width="48" height="36" rx="7" ' + B + ' ' + O + '/><circle cx="23" cy="30" r="6" ' + A2 + ' stroke="currentColor" stroke-width="2.4"/><path d="M15 43c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M37 26h12M37 33h12M37 40h7" fill="none" ' + O + '/><path d="M8 21h48" fill="none" stroke="var(--ic-a,#E8EF44)" stroke-width="3"/>',
    radar: '<circle cx="32" cy="32" r="22" ' + B + ' ' + O + '/><circle cx="32" cy="32" r="12" fill="none" stroke="var(--ic-c,#26CED0)" stroke-width="3"/><path d="M32 32 47 17" fill="none" ' + O + '/><circle cx="32" cy="32" r="5" ' + A + ' ' + O + '/>'
  };
  /* أي تبويب يأخذ أي أيقونة */
  var TAB = { home: 'home', search: 'search', orders: 'orders', jobs: 'jobs', earn: 'earn', prices: 'prices', menu: 'menu', board: 'orders', caps: 'caps', manage: 'manage', support: 'support' };
  var PFK = [[/إشعار|notif|hwPushRow/i, 'bell'], [/عناوين|عنوان|address/i, 'pin'], [/مفضل|favou?rite/i, 'heart'], [/دعم|support/i, 'support'],
    [/تقييم|rating/i, 'star'], [/رقم الكابتن|captain (no|number)/i, 'card'], [/رقم المتجر|phone/i, 'phone'], [/مشاركة موقعي|share my location/i, 'radar'],
    [/موقع المتجر|store location|location/i, 'map'], [/نوع الحساب|account type/i, 'shield'], [/اسم المستخدم|username/i, 'user']];
  function PF(t) { for (var i = 0; i < PFK.length; i++) if (PFK[i][0].test(t)) return PFK[i][1]; return 'user'; }
  function svg(k) { return '<svg class="hwi" viewBox="0 0 64 64" aria-hidden="true">' + (P[k] || '') + '</svg>'; }
  function apply() {
    document.querySelectorAll('.tabbar .tab[data-tab]').forEach(function (t) {
      var k = TAB[t.dataset.tab], ti = t.querySelector('.ti'); if (!k || !ti || ti.querySelector('.hwi')) return;
      var old = ti.querySelector('svg'); if (old) old.outerHTML = svg(k); else ti.insertAdjacentHTML('afterbegin', svg(k));
    });
    var bell = document.querySelector('.hd-bell svg:not(.hwi)'); if (bell) bell.outerHTML = svg('bell');
    /* صفوف صفحة الحساب في التطبيقات الأربعة: أيقونات HIGHWAY بدل الخطية */
    document.querySelectorAll('.pf-row .pf-ico').forEach(function (ic) {
      if (ic.querySelector('.hwi')) return;
      var row = ic.closest('.pf-row'), k = row.dataset.ic || PF(((row.querySelector('.pf-k') || {}).textContent || '') + ' ' + (row.id || ''));
      if (!k) return; row.dataset.ic = k; ic.innerHTML = svg(k); ic.classList.add('pf-hw');
    });
    document.querySelectorAll('.pf-logout').forEach(function (b) { var o = b.querySelector('svg:not(.hwi)'); if (o) o.outerHTML = svg('out'); });
    document.querySelectorAll('.hd-mi[data-hd]').forEach(function (m) {
      var k = { profile: 'user', support: 'support', prefs: 'moon', logout: 'out' }[m.dataset.hd], s = m.querySelector('svg:not(.hwi)');
      if (k && s) s.outerHTML = svg(k);
    });
  }
  g.HWIcons = { svg: svg, apply: apply, P: P };
  function boot() { apply(); new MutationObserver(function () { apply(); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
