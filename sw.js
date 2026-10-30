/* =========================================================
   HIGHWAY — عامل الخدمة (sw.js)
   يستقبل الإشعارات من خادم HIGHWAY ويعرضها حتى والتطبيق مغلق،
   وعند الضغط على الإشعار يفتح التطبيق (أو ينقل التبويب المفتوح للأمام).
   ========================================================= */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

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
