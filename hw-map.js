/* HIGHWAY — طبقة الخرائط المشتركة (Leaflet + OpenStreetMap + OSRM) */
(function (g) {
  var CFG = g.HW_CONFIG || {};
  function rad(x) { return x * Math.PI / 180; }
  function km(a, b) {                                   // مسافة مستقيمة بين نقطتين [lat,lng] بالكيلومتر
    var R = 6371, dLa = rad(b[0] - a[0]), dLo = rad(b[1] - a[1]);
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fee(distKm) {                                // أجرة التوصيل من المسافة الطرقية
    var f = Math.max(CFG.minFee || 1.5, distKm * (CFG.kmPrice || 0.35));
    return Math.ceil(f * 20 - 1e-9) / 20;               // تقريب للأعلى لأقرب 0.05
  }
  function est(a, b) { return km(a, b) * (CFG.roadFactor || 1.3); }
  function route(a, b) {                                // يعيد {km, min, pts:[[lat,lng]...], exact}
    var fb = function () { var d = est(a, b); return { km: d, min: Math.max(3, Math.round(d / 0.45)), pts: [a, b], exact: false }; };
    var url = (CFG.routeUrl || 'https://router.project-osrm.org/route/v1/driving/') + a[1] + ',' + a[0] + ';' + b[1] + ',' + b[0] + '?overview=simplified&geometries=geojson';
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(to);
      var r = j && j.routes && j.routes[0]; if (!r) return fb();
      var pts = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
      if (pts.length > 80) { var st = Math.ceil(pts.length / 80), o = []; for (var i = 0; i < pts.length; i += st) o.push(pts[i]); o.push(pts[pts.length - 1]); pts = o; }
      return { km: r.distance / 1000, min: Math.max(3, Math.round(r.duration / 60)), pts: pts, exact: true };
    }).catch(function () { clearTimeout(to); return fb(); });
  }
  function along(pts, t) {                              // نقطة على المسار عند نسبة t من 0 إلى 1
    if (!pts || !pts.length) return null; if (pts.length === 1 || t <= 0) return pts[0]; if (t >= 1) return pts[pts.length - 1];
    var seg = [], tot = 0, i; for (i = 1; i < pts.length; i++) { var d = km(pts[i - 1], pts[i]); seg.push(d); tot += d; }
    var want = t * tot; for (i = 0; i < seg.length; i++) { if (want <= seg[i] || i === seg.length - 1) { var u = seg[i] ? Math.min(1, want / seg[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; } want -= seg[i]; }
    return pts[pts.length - 1];
  }
  var HOME = '<svg viewBox="0 0 48 58" width="40" height="48"><path d="M24 56C24 56 4 36 4 22a20 20 0 0 1 40 0c0 14-20 34-20 34Z" fill="#0E4B4D"/><path d="M15 24.5 24 16l9 8.5V33a1.5 1.5 0 0 1-1.5 1.5h-4.5V28h-6v6.5h-4.5A1.5 1.5 0 0 1 15 33v-8.5Z" fill="#E8EF44"/></svg>';
  function storePin(id) { return '<div class="mk-store"><img src="' + (g.HWBiz ? g.HWBiz.logo(id) : 'avatars/' + id + '.jpg') + '" onerror="this.src=\'logo-icon.png\'" alt=""><i></i></div>'; }
  function capPin() { return '<div class="mk-cap"><span class="pulse"></span><div><img src="logo-icon.png" alt=""></div></div>'; }
  function mePin() { return '<div class="mk-me"><span class="pulse"></span><i></i></div>'; }
  function icon(html, w, h, ax, ay) { return L.divIcon({ html: html, className: 'mk', iconSize: [w, h], iconAnchor: [ax, ay] }); }
  var ICON = {
    home: function () { return icon(HOME, 40, 48, 20, 46); },
    store: function (id) { return icon(storePin(id), 46, 54, 23, 52); },
    cap: function () { return icon(capPin(), 46, 46, 23, 23); },
    me: function () { return icon(mePin(), 28, 28, 14, 14); }
  };
  function create(el, o) {
    o = o || {};
    var c = o.center || CFG.center || [32.0392, 35.7272];
    var m = L.map(el, { center: c, zoom: o.zoom || 14, zoomControl: false, attributionControl: true, dragging: o.interactive !== false, scrollWheelZoom: o.interactive !== false, touchZoom: o.interactive !== false, doubleClickZoom: o.interactive !== false, boxZoom: false, keyboard: false, tap: false });
    L.tileLayer(CFG.tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    m.attributionControl.setPrefix(false);
    return m;
  }
  function line(m, pts) {
    return L.layerGroup([L.polyline(pts, { color: '#ffffff', weight: 9, opacity: .95, lineCap: 'round', lineJoin: 'round' }), L.polyline(pts, { color: '#25CED1', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' })]).addTo(m);
  }
  function fit(m, pts, pad) { if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: pad || [40, 40], maxZoom: 16, animate: false }); }
  function reverse(p) {                                 // اسم تقريبي للمكان (اختياري، قد يفشل)
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    return fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=ar&zoom=17&lat=' + p[0] + '&lon=' + p[1], ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(to); var a = (j && j.address) || {};
      return [a.road, a.neighbourhood || a.suburb || a.quarter, a.city || a.town || a.village].filter(Boolean).slice(0, 2).join('، ') || '';
    }).catch(function () { clearTimeout(to); return ''; });
  }
  g.HWMap = { km: km, est: est, fee: fee, route: route, along: along, create: create, line: line, fit: fit, reverse: reverse, ICON: ICON, center: function () { return CFG.center || [32.0392, 35.7272]; } };
})(window);
