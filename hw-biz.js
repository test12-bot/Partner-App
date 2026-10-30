/* =========================================================
   HIGHWAY — قواعد العمل المشتركة (hw-biz.js)
   تُستخدم في التطبيقات الأربعة حتى تبقى الحسابات متطابقة في كل مكان:
   - العروض (offers) وأكواد الخصم (promos)
   - حالة المتجر: مفتوح / مغلق / متوقف مؤقتًا / خارج أوقات الدوام
   - توفر الصنف (نفد حتى الغد) وتسعير الخيارات والإضافات
   - التقييمات، الإعلانات (announcements)، الأهداف (targets)، صور الأغلفة
   يعتمد على: hw-config.js, hw-orders.js
   ========================================================= */
(function (g) {
  var DB = g.HWDB, CFG = g.HW_CONFIG || {};
  var offers = DB.col('offers'), promos = DB.col('promos'), ann = DB.col('announcements'), targets = DB.col('targets');
  function r2(x) { return Math.round(x * 100) / 100; }
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /* ---------- عروض المتاجر (يتحمّلها المتجر) ---------- */
  function live(o, now) { now = now || Date.now(); return !!o && o.active !== false && (!o.endsAt || o.endsAt > now); }
  function forStore(sid) { return offers.list().filter(function (o) { return o.storeId === sid && live(o); }).sort(function (a, b) { return (b.percent || 0) - (a.percent || 0); }); }
  function discount(sid, gross) {                      // أفضل عرض ينطبق على المجموع الفرعي
    var o = forStore(sid).filter(function (x) { return (x.percent || 0) > 0 && gross >= (x.minOrder || 0); })[0];
    return o ? { offer: o, amount: r2(gross * o.percent / 100) } : { offer: null, amount: 0 };
  }

  /* ---------- أكواد الخصم (تتحمّلها المنصة) ---------- */
  /* promo: { id: 'CODE', title, type: 'percent'|'amount', value, max, minOrder, firstOrder, perUser, endsAt, active } */
  function checkPromo(code, ctx) {                    // ctx: { phone, subtotal, orders }
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: false, msg: 'اكتب كود الخصم' };
    var p = promos.get(code);
    if (!p || p.active === false) return { ok: false, msg: 'الكود غير صحيح' };
    if (p.endsAt && p.endsAt < Date.now()) return { ok: false, msg: 'انتهت صلاحية الكود' };
    if (p.minOrder && ctx.subtotal < p.minOrder) return { ok: false, msg: 'الكود يعمل للطلبات من ' + r2(p.minOrder).toFixed(2) + ' د.أ' };
    var mine = (ctx.orders || []).filter(function (o) { return o.customer && o.customer.phone === ctx.phone && o.status !== 'cancelled'; });
    if (p.firstOrder && mine.length) return { ok: false, msg: 'الكود لأول طلب فقط' };
    var used = mine.filter(function (o) { return o.promoCode === code; }).length;
    if (used >= (p.perUser || 1)) return { ok: false, msg: 'استخدمت هذا الكود من قبل' };
    var amt = p.type === 'amount' ? p.value : ctx.subtotal * p.value / 100;
    if (p.max) amt = Math.min(amt, p.max);
    amt = r2(Math.min(amt, ctx.subtotal));
    return { ok: true, code: code, promo: p, amount: amt, msg: (p.title || 'خصم') };
  }

  /* ---------- حالة المتجر ---------- */
  function hm(s) { var a = String(s || '0:0').split(':'); return (+a[0]) * 60 + (+a[1] || 0); }
  function fmtHM(s) { var m = hm(s), h = Math.floor(m / 60) % 24; return ((h % 12) || 12) + ':' + String(m % 60).padStart(2, '0') + ' ' + (h < 12 ? 'ص' : 'م'); }
  /* hours: { on: true, days: { 0: { o: '10:00', c: '23:00', off: false }, ... } } (0 = الأحد) */
  function inHours(hours, now) {
    if (!hours || !hours.on || !hours.days) return { open: true };
    var d = new Date(now), day = d.getDay(), m = d.getHours() * 60 + d.getMinutes();
    var today = hours.days[day], yest = hours.days[(day + 6) % 7];
    if (yest && !yest.off && hm(yest.c) <= hm(yest.o) && m < hm(yest.c)) return { open: true };   // دوام بعد منتصف الليل
    if (today && !today.off) {
      var o = hm(today.o), c = hm(today.c);
      if (c > o ? (m >= o && m < c) : m >= o) return { open: true };
      if (m < o) return { open: false, next: 'يفتح اليوم ' + fmtHM(today.o) };
    }
    for (var k = 1; k <= 7; k++) { var nd = hours.days[(day + k) % 7]; if (nd && !nd.off) return { open: false, next: 'يفتح ' + (k === 1 ? 'غدًا' : DAYS[(day + k) % 7]) + ' ' + fmtHM(nd.o) }; }
    return { open: false, next: 'مغلق' };
  }
  /* يعيد { open, label } — label نص قصير يظهر للعميل عند الإغلاق */
  function storeStatus(st, now) {
    st = st || {}; now = now || Date.now();
    if (st.open === false) return { open: false, label: 'مغلق حاليًا' };
    if (st.pausedUntil && st.pausedUntil > now) return { open: false, paused: true, label: 'متوقف مؤقتًا حتى ' + new Date(st.pausedUntil).toLocaleTimeString('ar-JO', { hour: 'numeric', minute: '2-digit' }) };
    var h = inHours(st.hours, now);
    return h.open ? { open: true, label: '' } : { open: false, label: h.next };
  }

  /* ---------- الأصناف: التوفر والخيارات ---------- */
  function itemOn(it, now) { return !!it && it.on !== false && !(it.outUntil && it.outUntil > (now || Date.now())); }
  function itemListed(it) { return !!it && it.on !== false; }   // يظهر في القائمة (قد يكون "نفد اليوم")
  /* options: [{ id, name, min, max, choices: [{ id, name, price }] }]  — sel: { groupId: [choiceId,...] } */
  function optsPrice(it, sel) {
    var p = Number(it.price) || 0, picked = [];
    (it.options || []).forEach(function (g2) {
      (sel[g2.id] || []).forEach(function (cid) {
        var c = (g2.choices || []).filter(function (x) { return x.id === cid; })[0];
        if (c) { p += Number(c.price) || 0; picked.push({ g: g2.name, c: c.name, price: Number(c.price) || 0 }); }
      });
    });
    return { unit: r2(p), picked: picked };
  }
  function optsError(it, sel) {
    var bad = (it.options || []).filter(function (g2) { var n = (sel[g2.id] || []).length; return n < (g2.min || 0); })[0];
    return bad ? 'اختر ' + bad.name : '';
  }
  function nextMorning(hour) { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(hour || 6, 0, 0, 0); return d.getTime(); }

  /* ---------- التقييمات (محفوظة داخل الطلب: o.rating = { store, captain, comment, at }) ---------- */
  function ratingOf(list, pick) {
    var n = 0, sum = 0;
    list.forEach(function (o) { var r = o.rating, v = r && pick(o, r); if (v) { n++; sum += v; } });
    return { n: n, avg: n ? Math.round(sum / n * 10) / 10 : 0 };
  }
  function storeRating(sid, orders) { return ratingOf(orders, function (o, r) { return o.storeId === sid ? r.store : 0; }); }
  function captainRating(cid, orders) { return ratingOf(orders, function (o, r) { return o.captain && o.captain.id === cid ? r.captain : 0; }); }
  function stars(v) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(v) ? '★' : '☆'; return s; }

  /* ---------- الإعلانات والأهداف ---------- */
  /* announcement: { id, target: 'customers'|'drivers'|'stores'|'all', title, body, endsAt, active, at } */
  function announcements(target) {
    var now = Date.now();
    return ann.list().filter(function (a) { return a.active !== false && (!a.endsAt || a.endsAt > now) && (a.target === target || a.target === 'all'); });
  }
  /* target: { id, title, count, bonus, day: 'YYYY-MM-DD', active } — هدف يومي للكباتن */
  function dayKey(ts) { var d = new Date(ts || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function todayTargets() { var k = dayKey(); return targets.list().filter(function (t) { return t.active !== false && (!t.day || t.day === k); }); }

  /* =========================================================
     المتاجر: تديرها الإدارة بالكامل (إضافة، حساب الدخول، الشعار، الغلاف، ملف PDF، الموقع، المنيو)
     stores/<id> : { id, name, cat, start, user, hash, active, sort, mediaV, pdfV, pdfName }  ← خفيف، يُزامَن دائمًا
     media/<id>  : { logo, cover }  ← صور كبيرة، تُجلب مرة واحدة عند تغيّر mediaV وتُحفظ في الجهاز
     pdfs/<id>   : { data, name }   ← قائمة أسعار التوصيل للمتجر، تُجلب فقط عند فتحها
     pricelists/<start> : { salt: [{n,p}], amman: [{n,p}] }  ← أسعار التوصيل التي تعدّلها الإدارة
     قبل أن تضيف الإدارة أي متجر تُستخدم القائمة القديمة في hw-config.js
     ========================================================= */
  var storesCol = DB.col('stores'), priceCol = DB.col('pricelists'), raw = storesCol._raw(), media = {}, mediaSubs = [], fetching = {};
  function storeList(all) {
    var l = storesCol.list();
    if (!l.length) l = (CFG.stores || []).map(function (s, i) { return Object.assign({ sort: i, legacy: true }, s); });
    return l.filter(function (s) { return all || s.active !== false; }).sort(function (a, b) { return (a.sort || 0) - (b.sort || 0) || String(a.name).localeCompare(b.name, 'ar'); });
  }
  function storeById(id) { return storeList(true).filter(function (s) { return s.id === id; })[0] || null; }
  function readMedia(id) { if (media[id]) return media[id]; try { media[id] = JSON.parse(localStorage.getItem('hw-media-' + id)) || null; } catch (e) { media[id] = null; } return media[id]; }
  /* يجلب صور المتاجر التي تغيّرت فقط */
  function syncMedia() {
    storeList(true).forEach(function (s) {
      if (!s.mediaV) return; var m = readMedia(s.id);
      if ((m && m.v === s.mediaV) || fetching[s.id] === s.mediaV) return;
      fetching[s.id] = s.mediaV;
      getDoc('media', s.id).then(function (d) {
        media[s.id] = { v: s.mediaV, logo: (d && d.logo) || '', cover: (d && d.cover) || '' };
        try { localStorage.setItem('hw-media-' + s.id, JSON.stringify(media[s.id])); } catch (e) {}
        mediaSubs.forEach(function (f) { try { f(s.id); } catch (e) {} });
      });
    });
  }
  function getDoc(col, id) {
    if (raw.remote) return fetch(raw.base + '/' + col + '/' + id + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return null; });
    try { return Promise.resolve(JSON.parse(localStorage.getItem('hw-' + col + '-' + id) || 'null')); } catch (e) { return Promise.resolve(null); }
  }
  function putDoc(col, id, obj) {
    if (raw.remote) return raw.send(obj == null ? 'DELETE' : 'PUT', '/' + col + '/' + id + '.json', obj == null ? undefined : obj);
    try { if (obj == null) localStorage.removeItem('hw-' + col + '-' + id); else localStorage.setItem('hw-' + col + '-' + id, JSON.stringify(obj)); } catch (e) { return Promise.reject(e); }
    return Promise.resolve();
  }
  /* الإدارة: حفظ الصور (يرفع mediaV فتُحدَّث عند الجميع) */
  function saveMedia(id, patch) {
    var cur = readMedia(id) || {}, doc = { logo: patch.logo !== undefined ? patch.logo : (cur.logo || ''), cover: patch.cover !== undefined ? patch.cover : (cur.cover || '') }, v = Date.now();
    return putDoc('media', id, doc).then(function () {
      media[id] = Object.assign({ v: v }, doc); try { localStorage.setItem('hw-media-' + id, JSON.stringify(media[id])); } catch (e) {}
      storesCol.patch(id, { mediaV: v }); mediaSubs.forEach(function (f) { f(id); });
    });
  }
  function logo(id) {
    var m = readMedia(id); if (m && m.logo) return m.logo;
    var s = storeById(id); return s && (s.legacy || s.avatar) ? 'avatars/' + id + '.jpg' : 'logo-icon.png';
  }
  /* صورة الغلاف: ما ترفعه الإدارة، ثم ما يضيفه HIGHWAY في الكود (HW_CONFIG.covers) */
  function cover(sid) { var m = readMedia(sid); return (m && m.cover) || (CFG.covers && CFG.covers[sid]) || ''; }
  function onMedia(f) { mediaSubs.push(f); }
  /* ملف PDF: يُجلب عند الضغط فقط ويُفتح في نافذة جديدة */
  function savePdf(id, data, name) { return putDoc('pdfs', id, data ? { data: data, name: name || '' } : null).then(function () { storesCol.patch(id, { pdfV: data ? Date.now() : 0, pdfName: data ? name || '' : '' }); }); }
  function openPdf(id, fallback) {
    var s = storeById(id), w = g.open('', '_blank');
    if (!s || !s.pdfV) { if (w) w.location = fallback || (s && s.pdf) || ''; return; }
    getDoc('pdfs', id).then(function (d) {
      if (!d || !d.data) { if (w) w.close(); return; }
      var b = atob(d.data.split(',')[1]), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([u], { type: 'application/pdf' }));
      if (w) w.location = url; else g.location = url;
    });
  }
  function hasPdf(id) { var s = storeById(id); return !!(s && (s.pdfV || s.pdf)); }
  /* أسعار التوصيل: نسخة الإدارة إن وُجدت، وإلا الأسعار الأصلية في الكود */
  function priceList(start, region, fallback) { var d = priceCol.get(start); return d && d[region] ? d[region] : (fallback || []); }
  storesCol.subscribe(syncMedia);

  /* ---------- الطباعة: تذكرة الطلب (80 مم) والتقارير (A4) بهوية HIGHWAY ---------- */
  var PRINT_CSS = '*{box-sizing:border-box}body{margin:0;font-family:"Tajawal","Segoe UI",Tahoma,sans-serif;color:#0E3A3B;direction:rtl}' +
    '.hd{background:#25CED1;color:#0E3A3B;padding:18px 22px;border-radius:0 0 18px 18px;display:flex;justify-content:space-between;align-items:center}' +
    '.hd b{font-size:22px;letter-spacing:.5px}.hd small{display:block;font-size:12px;opacity:.8}.hd .tag{background:#E8EF44;border-radius:10px;padding:6px 12px;font-weight:800;font-size:13px}' +
    '.wrap{padding:18px 22px}h2{font-size:16px;margin:18px 0 8px}' +
    '.kp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.kp div{background:#F3F0E7;border-radius:12px;padding:10px}.kp small{display:block;font-size:11px;opacity:.7}.kp b{font-size:18px}' +
    'table{width:100%;border-collapse:collapse;font-size:12.5px}th{background:#0E3A3B;color:#F3F0E7;text-align:start;padding:8px;font-weight:700}td{padding:7px 8px;border-bottom:1px solid #E7E2D3}tr:nth-child(even) td{background:#FAF8F2}' +
    'tfoot td{font-weight:800;background:#E8EF44 !important}.ft{margin-top:22px;font-size:11px;opacity:.6;text-align:center}' +
    '.sig{display:flex;gap:30px;margin-top:34px}.sig div{flex:1;border-top:1.5px dashed #0E3A3B;padding-top:6px;font-size:12px}' +
    '.tk{width:72mm;margin:0 auto;font-size:13px}.tk .hd{border-radius:0;padding:10px;display:block;text-align:center}.tk .row{display:flex;justify-content:space-between;gap:8px;padding:3px 0}' +
    '.tk .big{font-size:22px;font-weight:900;text-align:center;margin:8px 0}.tk hr{border:0;border-top:1.5px dashed #0E3A3B;margin:8px 0}.tk .op{font-size:11.5px;opacity:.8;padding-inline-start:12px}' +
    '@page{margin:8mm}@media print{.hd,th,tfoot td,.kp div{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
  function printHtml(title, body) {                     // يطبع عبر إطار مخفي دون فتح نافذة جديدة
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document;
    d.open(); d.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>' + title + '</title><style>' + PRINT_CSS + '</style></head><body>' + body + '</body></html>'); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 2000); }, 250);
  }
  /* بداية فترة التقرير: 'day' | 'week' | 'month' */
  function periodStart(p) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    if (p === 'week') d.setDate(d.getDate() - 6);
    if (p === 'month') d.setDate(1);
    return d.getTime();
  }
  function optsText(opts) { return (opts || []).map(function (o) { return o.c; }).join(' · '); }
  function reportHead(title, sub) { return '<div class="hd"><div><b>HIGHWAY Delivery</b><small>' + sub + '</small></div><span class="tag">' + title + '</span></div>'; }

  g.HWBiz = {
    offers: offers, promos: promos, announcementsCol: ann, targets: targets,
    live: live, forStore: forStore, discount: discount, checkPromo: checkPromo,
    storeStatus: storeStatus, inHours: inHours, fmtHM: fmtHM, DAYS: DAYS,
    itemOn: itemOn, itemListed: itemListed, optsPrice: optsPrice, optsError: optsError, nextMorning: nextMorning,
    storeRating: storeRating, captainRating: captainRating, stars: stars,
    announcements: announcements, todayTargets: todayTargets, dayKey: dayKey, cover: cover, r2: r2,
    printHtml: printHtml, reportHead: reportHead, periodStart: periodStart, optsText: optsText,
    storesCol: storesCol, priceCol: priceCol, storeList: storeList, storeById: storeById, logo: logo, onMedia: onMedia, saveMedia: saveMedia,
    savePdf: savePdf, openPdf: openPdf, hasPdf: hasPdf, priceList: priceList
  };
})(window);
