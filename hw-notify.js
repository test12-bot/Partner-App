/* =========================================================
   HIGHWAY — التنبيهات (مشترك بين التطبيقات الأربعة)
   - فك قفل الصوت: iOS لا يسمح بالصوت قبل أول لمسة، فنفتحه عند أول تفاعل.
   - نغمات: order (طلب جديد)، offer (عرض للكابتن)، status (تحديث حالة)، alert (تنبيه).
   - رنين متكرر ring(key) حتى يُستجاب له stop(key) — مثل أجهزة المطاعم في طلبات.
   - إشعار النظام عند إخفاء الصفحة (أندرويد/سطح المكتب)، وعدّاد في عنوان التبويب.
   - إبقاء الشاشة مضاءة (Wake Lock) للمتجر والكابتن المتصل ولوحة الإدارة.
   ========================================================= */
(function (g) {
  var ctx = null, unlocked = false, rings = {}, baseTitle = document.title, wake = null, wantWake = false;
  var TONES = {
    order:  [[880, 0, .16], [1175, .17, .16], [1568, .34, .28]],          // ثلاث نغمات صاعدة
    offer:  [[988, 0, .12], [988, .16, .12], [1319, .34, .3]],            // نغمة عاجلة
    status: [[784, 0, .14], [1047, .16, .26]],                            // نغمة لطيفة
    alert:  [[523, 0, .2], [440, .24, .3]]
  };
  function ac() { if (!ctx) { var C = g.AudioContext || g.webkitAudioContext; if (C) ctx = new C(); } return ctx; }
  function unlock() {
    var c = ac(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
    unlocked = true; renderPill();
    if (g.Notification && Notification.permission === 'default' && g.HWNotifyAskPerm) { try { Notification.requestPermission(); } catch (e) {} }
    if (wantWake) keepAwake(true);
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { g.addEventListener(ev, unlock, { passive: true }); });

  function play(kind) {
    var c = ac(); if (!c) return;
    if (c.state === 'suspended') { c.resume(); }
    var t = c.currentTime + .02;
    (TONES[kind] || TONES.status).forEach(function (n) {
      var o = c.createOscillator(), gn = c.createGain();
      o.type = 'triangle'; o.frequency.value = n[0];
      gn.gain.setValueAtTime(.0001, t + n[1]); gn.gain.exponentialRampToValueAtTime(.5, t + n[1] + .02); gn.gain.exponentialRampToValueAtTime(.0001, t + n[1] + n[2]);
      o.connect(gn); gn.connect(c.destination); o.start(t + n[1]); o.stop(t + n[1] + n[2] + .02);
    });
    try { if (navigator.vibrate) navigator.vibrate(kind === 'status' ? 60 : [160, 80, 160]); } catch (e) {}
  }
  /* رنين متكرر بمفتاح؛ يتوقف عند stop(key) */
  function ring(key, kind, every) {
    if (rings[key]) return;
    play(kind); rings[key] = setInterval(function () { play(kind); }, every || 3500);
    flashTitle();
  }
  function stop(key) { if (rings[key]) { clearInterval(rings[key]); delete rings[key]; } if (!Object.keys(rings).length) flashTitle(true); }
  function stopAll() { Object.keys(rings).forEach(stop); }

  var ft = null;
  function flashTitle(off) {
    clearInterval(ft); document.title = baseTitle; if (off) return;
    var on = false; ft = setInterval(function () { on = !on; document.title = on ? '🔔 طلب جديد' : baseTitle; }, 1200);
  }
  /* إشعار للنظام عندما تكون الصفحة مخفية (لا يعمل في Safari iOS داخل التبويب) */
  function notify(title, body) {
    try { if (document.hidden && g.Notification && Notification.permission === 'granted') new Notification(title, { body: body, icon: 'icon-192.png', tag: 'hw' }); } catch (e) {}
  }
  /* إبقاء الشاشة مضاءة */
  function keepAwake(on) {
    wantWake = !!on;
    if (!navigator.wakeLock) return;
    if (on && !wake && !document.hidden) navigator.wakeLock.request('screen').then(function (w) { wake = w; w.addEventListener('release', function () { wake = null; }); }).catch(function () {});
    if (!on && wake) { wake.release(); wake = null; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && wantWake) keepAwake(true); });

  /* شارة "تفعيل الصوت" تظهر حتى أول لمسة */
  var pill = null;
  function renderPill() {
    if (!document.body) return;
    if (!pill) {
      pill = document.createElement('button'); pill.type = 'button'; pill.className = 'hw-sound-pill';
      pill.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg><span>اضغط لتفعيل صوت التنبيهات</span>';
      pill.addEventListener('click', function () { unlock(); play('status'); });
      document.body.appendChild(pill);
    }
    var need = !unlocked && document.body.classList.contains('authed');
    pill.classList.toggle('show', need);
  }
  /* تحذير مهم في النسخة التجريبية: تطبيقات الشاشة الرئيسية في iOS لا تتشارك البيانات */
  function standaloneWarn() {
    var sa = g.navigator.standalone || (g.matchMedia && g.matchMedia('(display-mode: standalone)').matches);
    if (!sa || !g.HWDB || g.HWDB.mode !== 'local' || document.getElementById('hwSaWarn')) return;
    var d = document.createElement('div'); d.id = 'hwSaWarn'; d.className = 'hw-sa-warn';
    d.textContent = 'نسخة تجريبية: التطبيق المثبّت لا يتشارك الطلبات مع التطبيقات الأخرى. للتجربة افتح التطبيقات الأربعة من Safari نفسه.';
    d.addEventListener('click', function () { d.remove(); });
    document.body.appendChild(d);
  }
  document.addEventListener('DOMContentLoaded', function () {
    renderPill(); standaloneWarn();
    new MutationObserver(renderPill).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  });
  g.HWNotify = { ringing: function () { return Object.keys(rings); }, play: play, ring: ring, stop: stop, stopAll: stopAll, notify: notify, keepAwake: keepAwake, unlock: unlock, isUnlocked: function () { return unlocked; } };
})(window);
