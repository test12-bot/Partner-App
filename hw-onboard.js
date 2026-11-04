/* =========================================================
   HIGHWAY — شاشات التعريف (hw-onboard.js)
   تظهر مرة واحدة فقط في كل جهاز:
   - العميل والكابتن والمطعم: 3 شرائح قبل تسجيل الدخول (عند الضغط على زر البدء في شاشة الشعار)
   - الإدارة: شاشة ترحيب واحدة داخل الإطار الزجاجي قبل الدخول
   الدور يُحدد من <script data-role="...">
   سحب بالإصبع، نقاط، تخطي، رسومات متحركة، عربي/إنجليزي، فاتح/داكن، وتقليل الحركة
   ========================================================= */
(function () {
  var me = document.currentScript, role = (me && me.dataset.role) || 'customer';
  var KEY = 'hw-onb-' + role + '-v1';
  var SESS = { customer: 'hwc-user', captain: 'hwk-user', store: 'hw-user', admin: 'hwd-user' }[role];
  var SLIDES = {
    customer: [
      { art: 'hello', bg: '#E4F8F8', t: 'أهلًا بك في هاي وي', s: 'أطيب مطاعم السلط ومتاجرها بين يديك' },
      { art: 'order', bg: '#F7F9D2', t: 'اطلب بضغطة', s: 'اختر من المنيو، وادفع نقدًا عند الاستلام' },
      { art: 'ride', bg: '#EFEAE0', t: 'تابع طلبك لحظة بلحظة', s: 'اعرف أين الكابتن ومتى يصلك طلبك' }
    ],
    captain: [
      { art: 'online', bg: '#E4F8F8', t: 'أهلًا بك يا كابتن', s: 'اتصل لتبدأ باستقبال الطلبات القريبة منك' },
      { art: 'map', bg: '#F7F9D2', t: 'الخريطة ترشدك', s: 'من المطعم إلى باب العميل بأقصر طريق' },
      { art: 'earn', bg: '#EFEAE0', t: 'أرباحك أمامك', s: 'تابع طلباتك وأرباحك وتسوياتك يومًا بيوم' }
    ],
    store: [
      { art: 'chef', bg: '#E4F8F8', t: 'استقبل طلباتك مباشرة', s: 'يصلك تنبيه مع كل طلب، وتقبله بضغطة' },
      { art: 'menu', bg: '#F7F9D2', t: 'منيوك بإيدك', s: 'عدّل الأسعار والصور، وأوقف أي صنف نفد' },
      { art: 'counter', bg: '#EFEAE0', t: 'كابتن جاهز دائمًا', s: 'اطلب كابتن لأي توصيل، وتابع تقاريرك ومبيعاتك' }
    ],
    admin: [
      { art: 'hello', bg: '#E4F8F8', t: 'أهلًا بك في لوحة هاي وي', s: 'كل شيء تحت إدارتك من مكان واحد', points: ['الطلبات: الإسناد والمتابعة لحظة بلحظة', 'الكباتن: الحالة والمواقع والتسويات', 'المتاجر: الحسابات والمنيو والأسعار'] }
    ]
  }[role] || [];

  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return true; } }
  function markSeen() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  function hasSession() { try { return !!localStorage.getItem(SESS); } catch (e) { return false; } }
  /* الاختبارات الآلية (المتصفح المُتحكَّم به) لا تُعرض لها الشاشات إلا عند طلبها صراحة */
  function auto() { try { return navigator.webdriver && localStorage.getItem('hw-onb-force') !== '1'; } catch (e) { return false; } }
  function tr(s) { return (window.HWI18n && HWI18n.t) ? HWI18n.t(s) : s; }
  var rtl = function () { return (document.documentElement.getAttribute('dir') || 'rtl') === 'rtl'; };

  function css() {
    if (document.getElementById('hwOnbCss')) return;
    var st = document.createElement('style'); st.id = 'hwOnbCss';
    st.textContent =
      '.hw-onb{position:fixed;inset:0;z-index:5000;display:flex;flex-direction:column;background:var(--onb-bg,#E4F8F8);color:#0E3A3B;transition:background-color .6s ease,opacity .45s ease;opacity:0;overflow:hidden;font-family:inherit;touch-action:pan-y;-webkit-user-select:none;user-select:none}' +
      '.hw-onb.show{opacity:1}.hw-onb.bye{opacity:0;pointer-events:none}' +
      '.hw-onb-top{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top)) 18px 0}' +
      '.hw-onb-logo{height:34px;width:auto}' +
      '.hw-onb-skip{border:0;background:rgba(14,58,59,.08);color:#0E3A3B;font:inherit;font-weight:800;font-size:14px;border-radius:999px;padding:8px 16px;cursor:pointer}' +
      '.hw-onb-view{position:relative;flex:1;overflow:hidden}' +
      '.hw-onb-track{display:flex;height:100%;transition:transform .55s cubic-bezier(.22,.8,.24,1)}' +
      '.hw-onb-slide{flex:0 0 100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 26px;text-align:center;box-sizing:border-box}' +
      '.hw-onb-art{position:relative;width:min(340px,86vw);height:clamp(190px,42vh,330px);display:grid;place-items:center}' +
      '.hw-onb-art::before{content:"";position:absolute;width:78%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.75);box-shadow:0 20px 50px rgba(14,58,59,.08)}' +
      '.hw-onb-art img{position:relative;width:100%;height:100%;object-fit:contain;transform:translateY(16px) scale(.92);opacity:0;transition:transform .7s cubic-bezier(.22,.8,.24,1) .08s,opacity .5s ease .08s}' +
      '.hw-onb-slide.on .hw-onb-art img{transform:none;opacity:1}' +
      '.hw-onb-slide h2{margin:clamp(14px,3vh,26px) 0 8px;font-family:var(--font-display,inherit);font-size:clamp(23px,6.4vw,30px);line-height:1.3;font-weight:800;transform:translateY(14px);opacity:0;transition:transform .6s ease .16s,opacity .5s ease .16s}' +
      '.hw-onb-slide p{margin:0;max-width:330px;font-size:clamp(14.5px,4vw,16.5px);line-height:1.7;color:rgba(14,58,59,.74);transform:translateY(14px);opacity:0;transition:transform .6s ease .24s,opacity .5s ease .24s}' +
      '.hw-onb-slide.on h2,.hw-onb-slide.on p{transform:none;opacity:1}' +
      '.hw-onb-pts{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;text-align:start;max-width:330px}' +
      '.hw-onb-pts li{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.7);border-radius:14px;padding:10px 12px;font-size:14px;font-weight:700}' +
      '.hw-onb-pts li::before{content:"";flex:none;width:10px;height:10px;border-radius:50%;background:#25CED1;box-shadow:0 0 0 3px #E8EF44}' +
      '.hw-onb-bot{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 22px calc(22px + env(safe-area-inset-bottom))}' +
      '.hw-onb-dots{display:flex;gap:7px}' +
      '.hw-onb-dots i{width:8px;height:8px;border-radius:99px;background:rgba(14,58,59,.2);transition:width .35s ease,background .35s ease}' +
      '.hw-onb-dots i.on{width:26px;background:#E8EF44}' +
      '.hw-onb-next{border:0;cursor:pointer;font:inherit;font-weight:800;font-size:16px;color:#0E3A3B;background:#E8EF44;border-radius:999px;height:58px;min-width:58px;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 24px rgba(14,58,59,.16),inset 0 -3px 0 rgba(14,58,59,.12);transition:min-width .45s ease,background .3s ease,transform .15s ease}' +
      '.hw-onb-next:focus{outline:none}.hw-onb-next:focus-visible{outline:3px solid #0E3A3B;outline-offset:3px}.hw-onb-next:active{transform:scale(.96)}.hw-onb-next svg{width:22px;height:22px}' +
      '.hw-onb-next.go{min-width:min(220px,58vw);background:#25CED1;color:#fff}' +
      '[dir=ltr] .hw-onb-next svg{transform:scaleX(-1)}' +
      '[data-theme=dark] .hw-onb{--onb-bg:#0C1F20 !important;color:#F5EDE3}[data-theme=dark] .hw-onb-slide p{color:rgba(245,237,227,.75)}' +
      '[data-theme=dark] .hw-onb-art::before{background:rgba(255,255,255,.92)}[data-theme=dark] .hw-onb-skip{background:rgba(255,255,255,.1);color:#F5EDE3}' +
      '[data-theme=dark] .hw-onb-dots i{background:rgba(245,237,227,.25)}[data-theme=dark] .hw-onb-dots i.on{background:#E8EF44}[data-theme=dark] .hw-onb-pts li{background:rgba(255,255,255,.08)}' +
      '@media (prefers-reduced-motion:reduce){.hw-onb,.hw-onb-track,.hw-onb-art img,.hw-onb-slide h2,.hw-onb-slide p,.hw-onb-next{transition:none!important}.hw-onb-art img,.hw-onb-slide h2,.hw-onb-slide p{transform:none!important;opacity:1!important}}';
    document.head.appendChild(st);
  }
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';

  function show(done) {
    if (!SLIDES.length) { done && done(); return; }
    css();
    var i = 0, n = SLIDES.length, root = document.createElement('div');
    root.className = 'hw-onb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', tr('تعرّف على هاي وي'));
    root.innerHTML = '<div class="hw-onb-top"><img class="hw-onb-logo" src="logo-icon.png" alt="HIGHWAY">' + (n > 1 ? '<button type="button" class="hw-onb-skip">' + tr('تخطي') + '</button>' : '<span></span>') + '</div>' +
      '<div class="hw-onb-view"><div class="hw-onb-track">' + SLIDES.map(function (s, k) {
        return '<section class="hw-onb-slide" aria-hidden="' + (k ? 'true' : 'false') + '"><div class="hw-onb-art"><img src="art/' + s.art + '.svg" alt="" decoding="async"></div>' +
          '<h2>' + tr(s.t) + '</h2><p>' + tr(s.s) + '</p>' + (s.points ? '<ul class="hw-onb-pts">' + s.points.map(function (x) { return '<li>' + tr(x) + '</li>'; }).join('') + '</ul>' : '') + '</section>';
      }).join('') + '</div></div>' +
      '<div class="hw-onb-bot"><div class="hw-onb-dots">' + (n > 1 ? SLIDES.map(function () { return '<i></i>'; }).join('') : '') + '</div><button type="button" class="hw-onb-next"></button></div>';
    document.body.appendChild(root);
    var track = root.querySelector('.hw-onb-track'), slides = root.querySelectorAll('.hw-onb-slide'), dots = root.querySelectorAll('.hw-onb-dots i'), next = root.querySelector('.hw-onb-next');
    function go(k) {
      i = Math.max(0, Math.min(n - 1, k));
      track.style.transform = 'translateX(' + (rtl() ? i * 100 : -i * 100) + '%)';
      root.style.setProperty('--onb-bg', SLIDES[i].bg);
      slides.forEach(function (s, k2) { s.classList.toggle('on', k2 === i); s.setAttribute('aria-hidden', k2 === i ? 'false' : 'true'); });
      dots.forEach(function (d, k2) { d.classList.toggle('on', k2 === i); });
      var last = i === n - 1;
      next.classList.toggle('go', last);
      next.innerHTML = last ? tr(role === 'admin' ? 'ابدأ' : 'ابدأ الآن') : ARROW;
      next.setAttribute('aria-label', last ? tr('ابدأ الآن') : tr('التالي'));
    }
    function finish() { markSeen(); root.classList.add('bye'); setTimeout(function () { root.remove(); }, 460); done && done(); }
    next.addEventListener('click', function () { if (i === n - 1) finish(); else go(i + 1); });
    var sk = root.querySelector('.hw-onb-skip'); if (sk) sk.addEventListener('click', finish);
    /* السحب بالإصبع: بالعربية التالي يأتي من اليسار */
    var x0 = null, y0 = 0, t0 = 0;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); track.style.transition = 'none'; }, { passive: true });
    root.addEventListener('touchmove', function (e) {
      if (x0 == null) return; var dx = e.touches[0].clientX - x0;
      if (Math.abs(dx) < Math.abs(e.touches[0].clientY - y0)) return;
      var base = rtl() ? i * 100 : -i * 100; track.style.transform = 'translateX(calc(' + base + '% + ' + dx * 0.9 + 'px))';
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0, fast = Date.now() - t0 < 260; x0 = null; track.style.transition = '';
      var fw = rtl() ? dx > 0 : dx < 0;
      if (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 24)) go(fw ? i + 1 : i - 1); else go(i);
    });
    document.addEventListener('keydown', function kd(e) {
      if (!root.isConnected) { document.removeEventListener('keydown', kd); return; }
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowLeft') go(rtl() ? i + 1 : i - 1);
      if (e.key === 'ArrowRight') go(rtl() ? i - 1 : i + 1);
    });
    go(0); requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('show'); next.focus({ preventScroll: true }); }); });
  }


  /* ===== داخل الإطار الزجاجي لشاشة البداية: يتمدد الزجاج للتعريف، ثم ينكمش مباشرة إلى حجم تسجيل الدخول ===== */
  function glassCss() {
    if (document.getElementById('hwGOnbCss')) return;
    var st = document.createElement('style'); st.id = 'hwGOnbCss';
    var E = 'cubic-bezier(.65,0,.35,1)';
    st.textContent =
      '.hw-gonb{display:grid;grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows .95s ' + E + ' .1s,opacity .35s ease,visibility 0s 1.05s}' +
      '.hw-gonb-clip{overflow:hidden;min-height:0}' +
      '#splash.onb-mode .hw-gonb{grid-template-rows:1fr;opacity:1;visibility:visible;transition:grid-template-rows .95s ' + E + ' .1s,opacity .6s ease .4s,visibility 0s}' +
      '#splash.onb-mode .splash-extras{grid-template-rows:0fr;opacity:0;transform:translateY(-10px) scale(.96);pointer-events:none}' +
      '#splash.onb-mode .splash-logo-wrap{background:rgba(255,255,255,.2);box-shadow:0 26px 50px -26px rgba(10,53,54,.55)}' +
      '#splash.onb-mode{overflow-y:auto;overscroll-behavior:contain}' +
      '.hw-gonb-in{padding:0 18px 22px;color:#fff;text-align:center;touch-action:pan-y;-webkit-user-select:none;user-select:none}' +
      '.hw-gonb-view{overflow:hidden}' +
      '.hw-gonb-track{display:flex;transition:transform .55s cubic-bezier(.22,.8,.24,1)}' +
      '.hw-gonb-slide{flex:0 0 100%;display:flex;flex-direction:column;align-items:center;box-sizing:border-box;padding:0 4px}' +
      '.hw-gonb-art{position:relative;width:100%;height:clamp(160px,30vh,250px);margin-top:4px;display:grid;place-items:center}' +
      '.hw-gonb-art::before{content:"";position:absolute;height:calc(100% - 40px);aspect-ratio:1;border-radius:50%;background:rgba(245,237,227,.96);box-shadow:0 0 0 8px rgba(255,255,255,.18),0 18px 40px rgba(10,53,54,.25)}' +
      '.hw-gonb-art::after{content:"";position:absolute;height:calc(100% - 6px);box-sizing:border-box;aspect-ratio:1;border-radius:50%;border:2.5px dashed rgba(232,239,68,.9);animation:hwOnbSpin 28s linear infinite;z-index:0}' +
      '.hw-gonb-art img{position:relative;z-index:1;height:100%;width:auto;max-width:100%;object-fit:contain;transform:translateY(14px) scale(.9);opacity:0;transition:transform .7s cubic-bezier(.22,.8,.24,1) .1s,opacity .5s ease .1s}' +
      '.hw-gonb-slide.on .hw-gonb-art img{transform:none;opacity:1}' +
      '.hw-gonb-num{display:block;margin-top:18px;font-family:"Baloo 2",var(--font-display,inherit);font-weight:800;font-size:13px;letter-spacing:1px;color:#E8EF44}' +
      '.hw-gonb-slide h2{margin:4px 0 6px;font-family:var(--font-display,inherit);font-size:clamp(21px,5.8vw,26px);font-weight:800;line-height:1.35;color:#fff;transform:translateY(12px);opacity:0;transition:transform .6s ease .18s,opacity .5s ease .18s}' +
      '.hw-gonb-slide h2 em{font-style:normal;color:#0E3A3B;background:#E8EF44;border-radius:10px;padding:0 8px;display:inline-block;transform:rotate(-2deg)}' +
      '.hw-gonb-slide p{margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,255,.9);transform:translateY(12px);opacity:0;transition:transform .6s ease .26s,opacity .5s ease .26s}' +
      '.hw-gonb-slide.on h2,.hw-gonb-slide.on p{transform:none;opacity:1}' +
      '.hw-gonb-bot{display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:10px}' +
      '.hw-gonb-dots{display:flex;gap:7px}.hw-gonb-dots i{width:8px;height:8px;border-radius:9px;background:rgba(255,255,255,.45);transition:width .35s ease,background .35s ease}.hw-gonb-dots i.on{width:26px;background:#E8EF44}' +
      '.hw-gonb-next{border:0;cursor:pointer;font:inherit;font-weight:800;font-size:15.5px;color:#0E3A3B;background:#E8EF44;border-radius:999px;height:52px;min-width:52px;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 10px 22px -8px rgba(10,53,54,.6);transition:min-width .45s ease,transform .15s ease}' +
      '.hw-gonb-next:active{transform:scale(.95)}.hw-gonb-next:focus{outline:none}.hw-gonb-next:focus-visible{outline:3px solid #fff;outline-offset:3px}.hw-gonb-next svg{width:22px;height:22px}[dir=ltr] .hw-gonb-next svg{transform:scaleX(-1)}' +
      '.hw-gonb-next.go{min-width:min(190px,52vw)}' +
      '.hw-gonb-pts{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:7px;text-align:start;width:100%}' +
      '.hw-gonb-pts li{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:14px;padding:9px 12px;font-size:13.5px;font-weight:700;color:#fff}' +
      '.hw-gonb-pts li::before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:#E8EF44;box-shadow:0 0 0 3px rgba(232,239,68,.35)}' +
      '.hw-gonb-skip{border:0;background:rgba(255,255,255,.22);color:#fff;font:inherit;font-weight:700;font-size:13px;border-radius:999px;padding:7px 14px;cursor:pointer}' +
      '.hw-gonb-head{display:flex;justify-content:flex-start;margin:-4px 0 6px}' +
      '@keyframes hwOnbSpin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){.hw-gonb,.hw-gonb-track,.hw-gonb-art img,.hw-gonb-slide h2,.hw-gonb-slide p{transition:none!important}.hw-gonb-art::after{animation:none}.hw-gonb-art img,.hw-gonb-slide h2,.hw-gonb-slide p{transform:none!important;opacity:1!important}}';
    document.head.appendChild(st);
  }
  function emph(t) { /* الكلمة الأخيرة المهمة مظللة بالليموني */ var hl = { 'أهلًا بك في هاي وي': 'هاي وي', 'اطلب بضغطة': 'بضغطة', 'تابع طلبك لحظة بلحظة': 'لحظة بلحظة', 'أهلًا بك يا كابتن': 'يا كابتن', 'الخريطة ترشدك': 'ترشدك', 'أرباحك أمامك': 'أمامك', 'استقبل طلباتك مباشرة': 'مباشرة', 'منيوك بإيدك': 'بإيدك', 'كابتن جاهز دائمًا': 'دائمًا' }[t];
    var tt = tr(t); if (!hl || tr(hl) !== hl || tt !== t) return tt; return tt.replace(hl, '<em>' + hl + '</em>'); }
  function showGlass(card, done) {
    glassCss();
    var splash = document.getElementById('splash'), n = SLIDES.length, i = 0;
    var wrap = document.createElement('div'); wrap.className = 'hw-gonb'; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', tr('تعرّف على هاي وي'));
    wrap.innerHTML = '<div class="hw-gonb-clip"><div class="hw-gonb-in"><div class="hw-gonb-head">' + (n > 1 ? '<button type="button" class="hw-gonb-skip">' + tr('تخطي') + '</button>' : '') + '</div><div class="hw-gonb-view"><div class="hw-gonb-track">' +
      SLIDES.map(function (s, k) { return '<section class="hw-gonb-slide" aria-hidden="' + (k ? 'true' : 'false') + '"><div class="hw-gonb-art"><img src="art/' + s.art + '.svg" alt="" decoding="async"></div>' + (n > 1 ? '<span class="hw-gonb-num" dir="ltr">0' + (k + 1) + ' / 0' + n + '</span>' : '<span class="hw-gonb-num"></span>') + '<h2>' + emph(s.t) + '</h2><p>' + tr(s.s) + '</p>' + (s.points ? '<ul class="hw-gonb-pts">' + s.points.map(function (x) { return '<li>' + tr(x) + '</li>'; }).join('') + '</ul>' : '') + '</section>'; }).join('') +
      '</div></div><div class="hw-gonb-bot"><div class="hw-gonb-dots">' + (n > 1 ? SLIDES.map(function () { return '<i></i>'; }).join('') : '') + '</div><button type="button" class="hw-gonb-next"></button></div></div></div>';
    var lp = document.getElementById('loginPanel'); card.insertBefore(wrap, lp || null);
    var track = wrap.querySelector('.hw-gonb-track'), slides = wrap.querySelectorAll('.hw-gonb-slide'), dots = wrap.querySelectorAll('.hw-gonb-dots i'), next = wrap.querySelector('.hw-gonb-next');
    function go(k) {
      i = Math.max(0, Math.min(n - 1, k)); track.style.transform = 'translateX(' + (rtl() ? i * 100 : -i * 100) + '%)';
      slides.forEach(function (s, k2) { s.classList.toggle('on', k2 === i); s.setAttribute('aria-hidden', k2 === i ? 'false' : 'true'); });
      dots.forEach(function (d, k2) { d.classList.toggle('on', k2 === i); });
      var last = i === n - 1; next.classList.toggle('go', last); next.innerHTML = last ? tr(role === 'admin' ? 'ابدأ' : 'ابدأ الآن') : ARROW; next.setAttribute('aria-label', last ? tr('ابدأ الآن') : tr('التالي'));
    }
    function buzz() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }
    function finish() {
      markSeen(); buzz();
      slides.forEach(function (s) { s.classList.remove('on'); });
      /* الانكماش والتحول إلى تسجيل الدخول في حركة واحدة */
      splash.classList.remove('onb-mode'); done && done();
      setTimeout(function () { wrap.remove(); }, 1150);
    }
    next.addEventListener('click', function () { if (i === n - 1) finish(); else go(i + 1); });
    var gsk = wrap.querySelector('.hw-gonb-skip'); if (gsk) gsk.addEventListener('click', finish);
    var x0 = null, y0 = 0, t0 = 0;
    wrap.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); track.style.transition = 'none'; }, { passive: true });
    wrap.addEventListener('touchmove', function (e) { if (x0 == null) return; var dx = e.touches[0].clientX - x0; if (Math.abs(dx) < Math.abs(e.touches[0].clientY - y0)) return; track.style.transform = 'translateX(calc(' + (rtl() ? i * 100 : -i * 100) + '% + ' + dx * 0.9 + 'px))'; }, { passive: true });
    wrap.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0, fast = Date.now() - t0 < 260; x0 = null; track.style.transition = ''; var fw = rtl() ? dx > 0 : dx < 0; if (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 24)) go(fw ? i + 1 : i - 1); else go(i); });
    go(0); buzz();
    requestAnimationFrame(function () { requestAnimationFrame(function () { splash.classList.add('onb-mode'); }); });
  }
  function start() {
    if (seen() || auto()) return;
    if (hasSession()) { markSeen(); return; }   // مستخدم قديم مسجل دخوله: لا نزعجه
    var btn = document.getElementById('enterBtn'); if (!btn) return;
    btn.addEventListener('click', function cap(e) {
      if (seen()) return;
      e.stopImmediatePropagation(); e.preventDefault();
      var card = document.getElementById('splashCard');
      btn.removeEventListener('click', cap, true);
      if (card && typeof window.openLogin === 'function') showGlass(card, function () { window.openLogin(); });
      else show(function () { setTimeout(function () { btn.click(); }, 120); });
    }, true);
  }
  window.HWOnboard = { show: show, reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
