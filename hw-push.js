/* =========================================================
   HIGHWAY — الإشعارات الحقيقية (hw-push.js)
   تصل التنبيهات حتى والتطبيق مغلق أو الشاشة مقفلة، عبر Web Push:
   - المتصفح يعطي "اشتراكًا" يُحفظ في قاعدة البيانات (push/<id>) مع الدور وصاحب الحساب
   - خادم HIGHWAY (مستودع HIGHWAY-Server) يرسل الإشعار عند كل حدث مهم
   - sw.js يعرض الإشعار ويفتح التطبيق عند الضغط عليه
   يحتاج: الوضع الحقيقي (dbUrl) + push.publicKey في hw-config.js.
   على الآيفون: يعمل فقط بعد "إضافة إلى الشاشة الرئيسية" (iOS 16.4 فأحدث).
   الاستخدام في كل تطبيق: HWPush.init('store', () => currentUser && currentUser.id)
   ========================================================= */
(function (g) {
  'use strict';
  var CFG = g.HW_CONFIG || {}, KEY = (CFG.push && CFG.push.publicKey) || '';
  var role = '', uidFn = function () { return ''; };
  var col = g.HWDB ? g.HWDB.col('push') : null;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (g.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  function supported() { return 'serviceWorker' in navigator && 'PushManager' in g && 'Notification' in g; }
  function ready() { return !!(KEY && g.HWDB && g.HWDB.mode === 'remote'); }
  /* حالة الإشعارات كما يراها المستخدم */
  function state() {
    if (!ready()) return 'off-server';                       // الخادم غير مفعّل بعد (الوضع التجريبي)
    if (ios && !standalone) return 'ios-install';            // الآيفون: يجب تثبيت التطبيق أولًا
    if (!supported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return localStorage.getItem('hw-push-' + role) === uidFn() && Notification.permission === 'granted' ? 'on' : 'off';
  }
  function b64(s) {                                          // مفتاح VAPID → Uint8Array
    var p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/'));
    var a = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i); return a;
  }
  function idOf(endpoint) { var h = 0; for (var i = 0; i < endpoint.length; i++) h = (h * 31 + endpoint.charCodeAt(i)) | 0; return 'p' + (h >>> 0).toString(36) + endpoint.length.toString(36); }
  function reg() { return navigator.serviceWorker.register('sw.js'); }

  /* تفعيل: إذن + اشتراك + حفظه باسم صاحب الحساب */
  function enable() {
    var st = state(), uid = uidFn();
    if (st === 'ios-install') { help(); return Promise.resolve(false); }
    if (st === 'off-server' || st === 'unsupported' || !uid) { toast(st === 'unsupported' ? 'جهازك لا يدعم الإشعارات' : 'الإشعارات تعمل بعد تفعيل الخادم'); return Promise.resolve(false); }
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('اسمح بالإشعارات من إعدادات المتصفح'); emit(); return false; }
      return reg().then(function (r) { return navigator.serviceWorker.ready.then(function () { return r; }); })
        .then(function (r) { return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(KEY) }); }); })
        .then(function (sub) {
          var j = sub.toJSON(), lang = (g.HWI18n && g.HWI18n.lang) || 'ar';
          col.patch(idOf(j.endpoint), { role: role, uid: String(uid), sub: j, lang: lang, at: Date.now(), ua: navigator.userAgent.slice(0, 120) }, true);
          try { localStorage.setItem('hw-push-' + role, String(uid)); } catch (e) {}
          if (role === 'captain' && g.HWDB) g.HWDB.col('captains').patch(String(uid), { pushOn: true });
          toast('تم تفعيل الإشعارات ✓'); emit(); return true;
        });
    }).catch(function () { toast('تعذر تفعيل الإشعارات'); emit(); return false; });
  }
  /* عند تسجيل الخروج: حذف الاشتراك حتى لا تصل إشعارات حساب آخر */
  function disable() {
    try { localStorage.removeItem('hw-push-' + role); } catch (e) {}
    if (!supported()) return Promise.resolve();
    return navigator.serviceWorker.getRegistration().then(function (r) { return r ? r.pushManager.getSubscription() : null; }).then(function (s) {
      if (!s) return; if (col) col.remove(idOf(s.endpoint)); return s.unsubscribe();
    }).catch(function () {});
  }
  function toast(m) { if (g.HWOrders) g.HWOrders.toast(m); }
  function emit() { renderRow(); renderNag(); }
  function help() {
    var m = document.getElementById('hwPushHelp');
    if (!m) { m = document.createElement('div'); m.id = 'hwPushHelp'; m.className = 'modal'; m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('show'); }); document.body.appendChild(m); }
    m.innerHTML = '<div class="modal-card glass hw-prefs"><h3>الإشعارات على الآيفون</h3>' +
      '<ol class="hw-steps"><li>اضغط زر المشاركة <b>⎋</b> أسفل Safari</li><li>اختر <b>إضافة إلى الشاشة الرئيسية</b></li><li>افتح التطبيق من أيقونته الجديدة</li><li>من "حسابي" اضغط <b>تفعيل الإشعارات</b></li></ol>' +
      '<p class="mut">آبل تسمح بالإشعارات فقط للتطبيقات المثبتة على الشاشة الرئيسية (iOS 16.4 فأحدث).</p><button type="button" class="submit-btn" data-close="1"><span class="btn-label">فهمت</span></button></div>';
    m.classList.add('show');
  }
  var LABEL = { on: 'مفعّلة ✓', off: 'غير مفعّلة', denied: 'مرفوضة من المتصفح', unsupported: 'غير مدعومة', 'ios-install': 'ثبّت التطبيق أولًا', 'off-server': 'بعد تفعيل الخادم' };
  /* صف "الإشعارات" في صفحة الحساب */
  function renderRow() {
    var list = document.querySelector('#screen-profile .pf-list'); if (!list || !role) return;
    var row = document.getElementById('hwPushRow');
    if (!row) {
      row = document.createElement('button'); row.type = 'button'; row.id = 'hwPushRow'; row.className = 'pf-row pf-link';
      row.innerHTML = '<span class="pf-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg></span><span class="pf-k">الإشعارات</span><span class="pf-v" id="hwPushVal"></span>';
      row.addEventListener('click', function () { var s = state(); if (s === 'on') toast('الإشعارات مفعّلة على هذا الجهاز'); else if (s === 'denied') toast('فعّل الإشعارات من إعدادات المتصفح لهذا الموقع'); else enable(); });
      list.insertBefore(row, list.firstChild);
    }
    document.getElementById('hwPushVal').textContent = LABEL[state()] || '';
  }
  /* تذكير للمتجر والكابتن والإدارة في الرئيسية حتى يفعّلوا الإشعارات */
  function renderNag() {
    var s = state(), el = document.getElementById('hwPushNag');
    var need = role !== 'customer' && uidFn() && (s === 'off' || s === 'ios-install');
    if (!need) { if (el) el.remove(); return; }
    if (!el) {
      var host = document.querySelector('.screen.active .container') || document.querySelector('.main'); if (!host) return;
      el = document.createElement('div'); el.id = 'hwPushNag'; el.className = 'hw-nag';
      el.innerHTML = '<div><b>فعّل الإشعارات</b><small>حتى تصلك الطلبات والشاشة مقفلة</small></div><button type="button">تفعيل</button>';
      el.querySelector('button').addEventListener('click', enable);
      host.insertBefore(el, host.firstChild);
    }
  }
  /* الإشعار الذي يصل والتطبيق مفتوح: نترك التطبيق يعرض تنبيهه الخاص */
  /* الضغط على الإشعار والتطبيق مفتوح: نفتح الطلب المعني مباشرة */
  var openFn = null;
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.type === 'hw-open' && e.data.order && openFn) try { openFn(e.data.order); } catch (x) {} });

  /* opts.open(orderId): يفتح الطلب عند الضغط على إشعاره */
  function init(r, fn, opts) {
    role = r; uidFn = fn; openFn = (opts && opts.open) || null;
    var lo = g.logout;                                       // تسجيل الخروج يلغي اشتراك هذا الجهاز أولًا
    if (typeof lo === 'function') g.logout = function () { var a = arguments; disable().then(function () { lo.apply(g, a); }, function () { lo.apply(g, a); }); };
    try { var q = new URLSearchParams(g.location.search).get('order'); if (q && openFn) setTimeout(function () { openFn(q); }, 2500); } catch (e) {}
    if (ready() && supported()) reg().catch(function () {});   // تسجيل sw.js مبكرًا (يلزم للتثبيت كتطبيق أيضًا)
    var go = function () { renderRow(); setTimeout(renderNag, 1500); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    setInterval(function () { renderRow(); renderNag(); }, 5000);
  }
  g.HWPush = { init: init, enable: enable, disable: disable, state: state, ready: ready };
})(window);
