/* =========================================================
   HIGHWAY — عامل الخدمة (sw.js)
   يستقبل الإشعارات من خادم HIGHWAY ويعرضها حتى والتطبيق مغلق،
   وعند الضغط على الإشعار يفتح التطبيق (أو ينقل التبويب المفتوح للأمام).
   ========================================================= */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^hw-shell-/.test(k) && k !== SHELL; }).map(function (k) { return caches.delete(k); })); })   /* نسخ قديمة */
    .then(function () { return self.clients.claim(); }));
});

/* حفظ ملفات التطبيق على الجهاز: يفتح فورًا من المرة الثانية حتى مع إنترنت ضعيف.
   الملفات مرقّمة بالإصدار (?v=) فتُستبدل تلقائيًا عند كل تحديث، والصفحة نفسها تُطلب من الشبكة أولًا.
   بيانات الطلبات (Firebase) لا تمر من هنا أبدًا. */
var SHELL = 'hw-shell-v3';
self.addEventListener('fetch', function (e) {
  var r = e.request; if (r.method !== 'GET') return;
  var u = new URL(r.url); if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) { var c = res.clone(); caches.open(SHELL).then(function (cc) { cc.put(r, c); }); return res; })
      .catch(function () { return caches.match(r, { ignoreSearch: true }); }));
    return;
  }
  if (/\.(mp4|webm)$/i.test(u.pathname)) return;
  e.respondWith(caches.open(SHELL).then(function (cc) {
    return cc.match(r).then(function (hit) {
      var net = fetch(r).then(function (res) {
        if (res.ok) {
          cc.put(r, res.clone());
          cc.keys().then(function (ks) { ks.forEach(function (k) { var ku = new URL(k.url); if (ku.pathname === u.pathname && ku.search !== u.search) cc.delete(k); }); });   // نسخة قديمة من نفس الملف
        }
        return res;
      });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net;
    });
  }));
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'HIGHWAY', body: e.data ? e.data.text() : '' }; }
  var urgent = !!d.urgent;                                   // طلب جديد للمتجر / عرض للكابتن
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    var visible = list.some(function (c) { return c.visibilityState === 'visible'; });
    return self.registration.showNotification(d.title || 'HIGHWAY', {
      body: d.body || '', tag: d.tag || 'hw', renotify: true, icon: 'icon-192.png', badge: 'icon-192.png',
      dir: d.lang === 'en' ? 'ltr' : 'rtl', lang: d.lang || 'ar',
      requireInteraction: urgent, silent: visible && !urgent,          // التطبيق أمامه: إشعار صامت
      vibrate: urgent ? [400, 150, 400, 150, 400, 150, 600] : [200, 100, 200],
      data: { order: d.order || '' }
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var order = (e.notification.data && e.notification.data.order) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) { list[i].postMessage({ type: 'hw-open', order: order }); return list[i].focus(); } }
    return self.clients.openWindow(order ? './?order=' + encodeURIComponent(order) : './');
  }));
});
