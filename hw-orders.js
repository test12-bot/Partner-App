/* HIGHWAY Delivery — طبقة البيانات المشتركة بين المواقع الأربعة (المتاجر، المنسقين، العملاء، الكباتن) */
(function (g) {
  'use strict';
  var CFG = g.HW_CONFIG || {};
  var remote = !!(CFG.dbUrl && /^https?:\/\//.test(CFG.dbUrl));
  var base = remote ? String(CFG.dbUrl).replace(/\/+$/, '') : '';

function sha256(str) {
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    const bytes = Array.from(new TextEncoder().encode(str));
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) w[i] = (bytes[o+i*4]<<24)|(bytes[o+i*4+1]<<16)|(bytes[o+i*4+2]<<8)|bytes[o+i*4+3];
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15]>>>3);
            const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2]>>>10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
        }
        let [a,b,c,d,e,f,g,hh] = h;
        for (let i = 0; i < 64; i++) {
            const t1 = (hh + (rotr(e,6)^rotr(e,11)^rotr(e,25)) + ((e&f)^(~e&g)) + K[i] + w[i]) | 0;
            const t2 = ((rotr(a,2)^rotr(a,13)^rotr(a,22)) + ((a&b)^(a&c)^(b&c))) | 0;
            hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h = [h[0]+a|0,h[1]+b|0,h[2]+c|0,h[3]+d|0,h[4]+e|0,h[5]+f|0,h[6]+g|0,h[7]+hh|0];
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}


  g.HW_sha256 = sha256;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function num(x) { var m = String(x == null ? '' : x).match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; }
  function money(x) { return (Math.round((Number(x) || 0) * 100) / 100).toFixed(2); }

  /* =========================================================
     مجموعات البيانات العامة: orders / captains / menus / storestate
     ========================================================= */
  var cols = {};
  /* Firebase يحذف المصفوفات الفارغة ([]) وقد يعيد المصفوفة ككائن {0:..,1:..}.
     نعيد كل حقل مصفوفة لشكله الصحيح قبل أن يصل لأي تطبيق */
  function arr(x) { return Array.isArray(x) ? x.filter(function (v) { return v != null; }) : (x && typeof x === 'object' ? Object.keys(x).sort(function (a, b) { return a - b; }).map(function (k) { return x[k]; }).filter(function (v) { return v != null; }) : []); }
  function repair(name, o) {
    if (name === 'orders') {
      o.history = arr(o.history); o.items = arr(o.items).map(function (l) { if (l.opts) l.opts = arr(l.opts); return l; });
      if (o.offered) o.offered = arr(o.offered); if (o.reassigns) o.reassigns = arr(o.reassigns);
    } else if (name === 'menus') {
      o.cats = arr(o.cats).map(function (c) {
        c.items = arr(c.items).map(function (it) { if (it.options) it.options = arr(it.options).map(function (gr) { gr.choices = arr(gr.choices); return gr; }); return it; });
        return c;
      });
    } else if (name === 'stores') { o.alias = arr(o.alias); }
    else if (name === 'captains') { if (o.declined) o.declined = arr(o.declined); }
    else if (name === 'pricelists') { if (o.salt) o.salt = arr(o.salt); if (o.amman) o.amman = arr(o.amman); }
    return o;
  }
  /* عقدة /pulse: اتصال بث واحد يخبر كل المجموعات متى تغيّرت */
  var pulse = (function () {
    var es = null, seen = {}, fns = {};
    function ok() {
      if (!remote || !g.EventSource) return false;
      if (es && es.readyState !== 2) return true;
      try { es = new EventSource(base + '/pulse.json'); } catch (e) { return false; }
      var fire = function (k, v) { if (seen[k] === v) return; var first = !(k in seen); seen[k] = v; if (!first) (fns[k] || []).forEach(function (f) { f(); }); };
      es.addEventListener('put', function (e) { try { var d = JSON.parse(e.data), ks = d.path.split('/').filter(Boolean);
        if (!ks.length) Object.keys(d.data || {}).forEach(function (k) { fire(k, d.data[k]); }); else fire(ks[0], d.data); } catch (x) {} });
      es.addEventListener('patch', function (e) { try { var d = JSON.parse(e.data); Object.keys(d.data || {}).forEach(function (k) { fire(k, d.data[k]); }); } catch (x) {} });
      return true;
    }
    return { ok: ok, on: function (n, f) { if ((fns[n] = fns[n] || []).indexOf(f) < 0) fns[n].push(f); } };
  })();
  function Col(name) {
    if (cols[name]) return cols[name];
    var key = 'hw-' + name + '-v1', cache = [], subs = [], started = false, sig = '', loaded = false, waiters = [];
    function markLoaded() { loaded = true; var w = waiters; waiters = []; w.forEach(function (f) { try { f(); } catch (e) {} }); }
    function readLocal() { try { var a = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function writeLocal(a) { try { localStorage.setItem(key, JSON.stringify(a.slice(0, 600))); } catch (e) {} }
    function norm(list) { return list.filter(function (o) { return o && o.id; }).map(function (o) { return repair(name, o); }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }); }
    function emit() {
      var s = JSON.stringify(cache);
      if (s === sig) return; sig = s;
      subs.slice().forEach(function (fn) { try { fn(cache.slice()); } catch (e) { console.error(e); } });
    }
    var tree = {}, es = null, rebuildT = 0;
    function rebuild() {                                  // الشجرة القادمة من Firebase → قائمة مرتبة للتطبيقات
      clearTimeout(rebuildT);
      rebuildT = setTimeout(function () { cache = norm(Object.keys(tree).map(function (k) { var o = JSON.parse(JSON.stringify(tree[k])); if (o && typeof o === 'object' && !o.id) o.id = k; return o; })); markLoaded(); emit(); }, 30);
    }
    function setAt(path, val) {                           // path مثل "/id/field"
      var ks = path.split('/').filter(Boolean);
      if (!ks.length) { tree = val && typeof val === 'object' ? val : {}; return; }
      var n = tree; for (var i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
      if (val === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = val;
    }
    function load() {
      if (!remote) { cache = norm(readLocal()); markLoaded(); emit(); return Promise.resolve(); }
      return fetch(base + '/' + name + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (obj) {
        tree = obj && typeof obj === 'object' ? obj : {}; rebuild();
      }).catch(function () {});
    }
    /* البث المباشر من Firebase: يصل كل تغيير لحظة حدوثه ويُرسل التغيير فقط.
       المتصفح يسمح بعدد محدود من الاتصالات المفتوحة، لذلك:
       - الطلبات (الأكثر تغيرًا) لها بث خاص
       - باقي المجموعات تستمع لعقدة صغيرة واحدة /pulse تتغير عند كل كتابة، فتعيد تحميل نفسها فقط */
    function stream() {
      if (name !== 'orders') { pulse.on(name, load); return pulse.ok(); }
      if (!g.EventSource) return false;
      if (es && es.readyState !== 2) return true;
      try { es = new EventSource(base + '/' + name + '.json'); } catch (e) { return false; }
      es.addEventListener('put', function (e) { try { var d = JSON.parse(e.data); setAt(d.path, d.data); rebuild(); } catch (x) {} });
      es.addEventListener('patch', function (e) { try { var d = JSON.parse(e.data); Object.keys(d.data || {}).forEach(function (k) { setAt(d.path.replace(/\/$/, '') + '/' + k, d.data[k]); }); rebuild(); } catch (x) {} });
      es.addEventListener('cancel', function () { es.close(); es = null; });
      return true;
    }
    function start() {
      if (started) return; started = true;
      if (!remote) {
        /* الوضع التجريبي: ذاكرة المتصفح. iOS يجمّد التبويبات فتضيع أحداث storage، لذلك نعيد القراءة دوريًا */
        load(); setInterval(function () { if (!document.hidden) load(); }, 1500);
        g.addEventListener('storage', function (e) { if (e.key === key) load(); });
      } else {
        load(); var live = stream();
        /* احتياط: إن انقطع البث (الهاتف في الخلفية أو الشبكة) نعيد الاتصال ونقرأ نسخة كاملة */
        setInterval(function () { if (!document.hidden) { if (!stream()) load(); else if (name !== 'orders') load(); } }, live ? 60000 : (CFG.pollMs || 3000));
      }
      var back = function () { if (document.hidden) return; load(); if (remote) stream(); };
      document.addEventListener('visibilitychange', back); g.addEventListener('focus', back); g.addEventListener('pageshow', back);
    }
    function bump() { if (remote && name !== 'orders') send('PUT', '/pulse/' + name + '.json', Date.now()); }
    function send(method, path, body) {
      return fetch(base + path, { method: method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).catch(function () {});
    }
    function fresh() { if (!remote) cache = norm(readLocal()); }
    var api = {
      name: name,
      list: function () { return cache.slice(); },
      loaded: function () { return loaded; },
      ready: function () { start(); return loaded ? Promise.resolve() : new Promise(function (r) { waiters.push(r); }); },
      get: function (id) { return cache.filter(function (o) { return o.id === id; })[0]; },
      subscribe: function (fn) { subs.push(fn); start(); fn(cache.slice()); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
      create: function (data) {
        var id = (data && data.id) || uid(), o = Object.assign({ id: id, createdAt: Date.now(), updatedAt: Date.now() }, data, { id: id });
        fresh(); cache = cache.filter(function (x) { return x.id !== id; }); cache.unshift(o);
        if (remote) { tree[id] = JSON.parse(JSON.stringify(o)); send('PUT', '/' + name + '/' + id + '.json', o).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      /* دمج حقول في سجل موجود (أو إنشاؤه إن لم يوجد عند create=true) */
      patch: function (id, patch, createIfMissing) {
        fresh();
        var o = cache.filter(function (x) { return x.id === id; })[0];
        if (!o) { if (!createIfMissing) return null; return api.create(Object.assign({ id: id }, patch)); }
        Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
        o.updatedAt = Date.now();
        if (remote) { tree[id] = JSON.parse(JSON.stringify(o)); send('PATCH', '/' + name + '/' + id + '.json', Object.assign({}, patch, { updatedAt: o.updatedAt })).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      replace: function (id, obj) {
        fresh(); var o = Object.assign({ createdAt: Date.now() }, obj, { id: id, updatedAt: Date.now() });
        cache = cache.filter(function (x) { return x.id !== id; }); cache.unshift(o);
        if (remote) { tree[id] = JSON.parse(JSON.stringify(o)); send('PUT', '/' + name + '/' + id + '.json', o).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      remove: function (id) {
        fresh(); cache = cache.filter(function (x) { return x.id !== id; });
        if (remote) { delete tree[id]; send('DELETE', '/' + name + '/' + id + '.json').then(bump); } else writeLocal(cache);
        emit();
      },
      _raw: function () { return { remote: remote, base: base, key: key, send: send, fresh: fresh, writeLocal: writeLocal, cache: function () { return cache; }, emit: emit }; }
    };
    cols[name] = api; return api;
  }

  /* =========================================================
     الطلبات
     ========================================================= */
  var Orders = Col('orders');
  var STEPS = ['new', 'accepted', 'picked', 'delivered'];
  var SHORT = { new: 'بانتظار كابتن', accepted: 'تم تعيين كابتن', picked: 'في الطريق', delivered: 'تم التسليم', cancelled: 'ملغي' };
  var STEP_TXT = { new: 'تم إرسال الطلب', accepted: 'تم تعيين كابتن', picked: 'تم استلام الطلب من المتجر', delivered: 'تم التسليم' };
  var M_STEPS = [['new', 'تم إرسال الطلب'], ['store_accepted', 'المتجر يحضّر طلبك'], ['accepted', 'تم تعيين كابتن'], ['picked', 'الكابتن استلم الطلب'], ['delivered', 'تم التسليم']];
  var N_STEPS = [['new', 'تم إرسال الطلب'], ['accepted', 'تم تعيين كابتن'], ['picked', 'تم استلام الطلب من المتجر'], ['delivered', 'تم التسليم']];

  function isMarket(o) { return o && o.kind === 'market'; }
  function steps(o) { return isMarket(o) ? M_STEPS : N_STEPS; }
  function stage(o) {                                  // رقم الخطوة الحالية في الخط الزمني
    if (o.status === 'delivered') return steps(o).length;
    if (isMarket(o)) return o.status === 'picked' ? 3 : o.status === 'accepted' ? 2 : (o.storeState === 'preparing' || o.storeState === 'ready') ? 1 : 0;
    return STEPS.indexOf(o.status);
  }
  function label(o) {                                  // نص الحالة الذي يراه الجميع
    if (o.status === 'cancelled') return 'ملغي';
    if (isMarket(o) && o.status === 'new') {
      if (o.storeState === 'pending') return 'بانتظار المتجر';
      if (o.scheduledFor && Date.now() < dispatchAt(o)) return 'مجدول ' + fmtTime(o.scheduledFor);
      return 'يبحث عن كابتن';
    }
    return SHORT[o.status];
  }
  function isActive(o) { return o.status === 'new' || o.status === 'accepted' || o.status === 'picked'; }

  var origCreate = Orders.create;
  function createOrder(data) {
    var id = uid(), t = Date.now();
    var pin = String(1000 + Math.floor(Math.random() * 9000));   // رمز إثبات التسليم يعطيه العميل للكابتن
    var o = Object.assign({ id: id, code: 'HW-' + id.slice(-4).toUpperCase(), status: 'new', pin: pin, createdAt: t, updatedAt: t, history: [{ s: 'new', t: t }] }, data);
    return origCreate(o);
  }
  /* ev = اسم حدث يُسجَّل في الخط الزمني (إن لم يكن تغيّر status) */
  function updateOrder(id, patch, ev) {
    Orders._raw().fresh();
    var o = Orders.get(id); if (!o) return null;
    var t = Date.now(), hist = (o.history || []).slice();
    if (patch.status && patch.status !== o.status) hist.push({ s: patch.status, t: t });
    if (ev) hist.push({ s: ev, t: t });
    var p = Object.assign({}, patch, { history: hist });
    return Orders.patch(id, p);
  }

  /* ---------- الحسابات المالية ---------- */
  function feeFrom(priceStr) {                          // رسوم التوصيل من نص مثل "2.00 - 2.50"
    var m = String(priceStr == null ? '' : priceStr).match(/\d+(\.\d+)?/g) || [];
    if (!m.length) return 0;
    var a = m.map(parseFloat);
    return (CFG.rangePolicy === 'min' ? Math.min.apply(null, a) : Math.max.apply(null, a));
  }
  /* التسوية المالية للطلب:
     items      = ما يدفعه الكابتن للمتجر (بعد خصم عرض المتجر، فالمتجر يتحمّله)
     promo      = خصم كود HIGHWAY (تتحمّله المنصة، فيُخصم من المستحق عليها)
     collected  = ما يحصّله الكابتن من العميل = items + fee - promo
     due        = صافي ما يسلّمه الكابتن للمنصة = العمولة - promo (سالب = المنصة تدفع للكابتن) */
  function settle(o) {
    var fee = o.fee != null ? Number(o.fee) : feeFrom(o.price);
    var rate = CFG.commissionRate != null ? CFG.commissionRate : 0.10;
    var commission = r2(fee * rate), promo = Number(o.promoAmount) || 0;
    var items = isMarket(o) ? Number(o.itemsTotal) || 0 : 0;
    return { fee: fee, commission: commission, net: r2(fee - commission), items: items, promo: promo,
      collected: isMarket(o) ? r2(items + fee - promo) : 0, due: r2(commission - promo) };
  }
  function r2(x) { return Math.round(x * 100) / 100; }
  function isToday(ts) { var a = new Date(ts), b = new Date(); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function stats(list) {
    var s = { today: 0, active: 0, fresh: 0, delivered: 0, cancelled: 0, fees: 0 };
    list.forEach(function (o) {
      if (isActive(o)) { s.active++; if (o.status === 'new') s.fresh++; }
      if (isToday(o.createdAt)) {
        s.today++;
        if (o.status === 'delivered') { s.delivered++; s.fees += settle(o).fee; }
        if (o.status === 'cancelled') s.cancelled++;
      }
    });
    return s;
  }
  function fmtTime(ts) { var d = new Date(ts), h = d.getHours(); return pad(h % 12 || 12) + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'ص' : 'م'); }
  function ago(ts) {
    var m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'الآن'; if (m < 60) return 'قبل ' + m + ' د';
    var h = Math.floor(m / 60); if (h < 24) return 'قبل ' + h + ' س';
    return new Date(ts).getDate() + '/' + (new Date(ts).getMonth() + 1);
  }

  /* ---------- عروض الكباتن (أسلوب Wolt): أول كابتن يقبل يحصل على الطلب ---------- */
  function offerable(o) {
    if (o.status !== 'new' || o.captain) return false;
    if (isMarket(o) && o.storeState !== 'preparing' && o.storeState !== 'ready') return false;
    if (o.scheduledFor && Date.now() < dispatchAt(o)) return false;   // طلب مجدول: يُعرض قبل موعده بوقت التحضير والطريق
    return true;
  }
  function dispatchAt(o) { return o.scheduledFor ? o.scheduledFor - ((o.routeMin || 15) + 10) * 60000 : 0; }
  function claim(id, cap) {
    var capObj = { id: cap.id, name: cap.name, phone: cap.phone || '' };
    var o = Orders.get(id);
    if (!remote) {
      Orders._raw().fresh(); o = Orders.get(id);
      if (!o || !offerable(o)) return Promise.resolve(false);
      updateOrder(id, { status: 'accepted', captain: capObj, claimBy: cap.id }, null); return Promise.resolve(true);
    }
    return fetch(base + '/orders/' + id + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (cur) {
      if (!cur || !offerable(cur)) return false;
      return Orders._raw().send('PATCH', '/orders/' + id + '.json', { claimBy: cap.id, claimAt: Date.now() }).then(function () {
        return new Promise(function (res) { setTimeout(res, 800); });
      }).then(function () { return fetch(base + '/orders/' + id + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }); })
        .then(function (cur2) {
          if (!cur2 || cur2.claimBy !== cap.id || cur2.captain) return false;
          updateOrder(id, { status: 'accepted', captain: capObj }, null);
          return Orders._raw().send('PATCH', '/orders/' + id + '.json', { claimBy: cap.id }).then(function () { return true; });
        });
    }).catch(function () { return false; });
  }

  /* =========================================================
     واجهة مشتركة: بطاقات الطلبات والخط الزمني والتنبيهات
     ========================================================= */
  function progress(o) {
    var n = steps(o).length, h = '<div class="oc-prog' + (o.status === 'cancelled' ? ' cancelled' : '') + '">';
    if (o.status === 'cancelled') { for (var k = 0; k < n; k++) h += '<i></i>'; return h + '</div>'; }
    var idx = stage(o);
    for (var i = 0; i < n; i++) h += '<i class="' + (i < idx ? 'done' : i === idx ? 'act' : '') + '"></i>';
    return h + '</div>';
  }
  function routeRows(o) {
    var h = '<div class="oc-route"><div class="ocr"><i class="a"></i><small>' + (o.to ? 'من' : 'استلام من') + '</small><b>' + esc(o.from || o.storeName || '') + '</b></div>';
    if (o.to) h += '<div class="ocr"><i class="b"></i><small>إلى</small><b>' + esc(o.to) + '</b></div>';
    return h + '</div>';
  }
  function captainRow(o, withCall) {
    if (!o.captain || !o.captain.name) return '';
    var ph = o.captain.phone ? String(o.captain.phone).replace(/[^\d+]/g, '') : '';
    return '<div class="oc-cap"><span class="av">' + esc(o.captain.name.trim().charAt(0)) + '</span><div class="cp"><b>' + esc(o.captain.name) + '</b><small>' +
      (o.eta ? 'الوصول المتوقع ' + esc(o.eta) : 'الكابتن المعيّن') + '</small></div>' +
      (withCall && ph ? '<a class="oc-call" href="tel:' + esc(ph) + '" aria-label="اتصال بالكابتن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></a>' : '') + '</div>';
  }
  function card(o, actionsHtml, showStore) {
    var meta = '<span class="oc-price">' + (o.price ? esc(o.price) + ' <small>دينار</small>' : '—') + '</span>';
    if (o.orderValue) meta += '<span class="oc-val">' + 'قيمة الطلب ' + esc(o.orderValue) + ' د.أ</span>';
    if (isMarket(o)) meta += '<span class="oc-tag">طلب تطبيق</span>';
    return '<article class="oc s-' + o.status + '" data-id="' + esc(o.id) + '" tabindex="0" role="button">' +
      '<div class="oc-top"><span class="oc-code">' + esc(o.code) + '</span>' + (showStore ? '<span class="oc-store">' + esc(o.storeName || '') + '</span>' : '') +
      '<span class="oc-time">' + ago(o.createdAt) + '</span><span class="oc-chip">' + label(o) + '</span></div>' +
      routeRows(o) + '<div class="oc-meta">' + meta + '</div>' + captainRow(o, true) + progress(o) +
      (actionsHtml ? '<div class="oc-actions">' + actionsHtml + '</div>' : '') + '</article>';
  }
  function timeline(o) {
    var h = '<ol class="tl">';
    if (o.status === 'cancelled') {
      o.history.forEach(function (e) {
        var txt = e.s === 'cancelled' ? 'تم إلغاء الطلب' : (steps(o).filter(function (s) { return s[0] === e.s; })[0] || [])[1];
        if (txt) h += '<li class="' + (e.s === 'cancelled' ? 'bad' : 'done') + '"><i></i><b>' + txt + '</b><small>' + fmtTime(e.t) + '</small></li>';
      });
      return h + '</ol>';
    }
    var idx = stage(o);
    steps(o).forEach(function (s, i) {
      var ev = o.history.filter(function (e) { return e.s === s[0]; })[0];
      h += '<li class="' + (i < idx ? 'done' : i === idx ? 'act' : '') + '"><i></i><b>' + s[1] + '</b><small>' + (ev ? fmtTime(ev.t) : 'بانتظار الخطوة') + '</small></li>';
    });
    return h + '</ol>';
  }
  function toast(msg) {
    var t = document.getElementById('hwToast');
    if (!t) { t = document.createElement('div'); t.id = 'hwToast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 3800);
  }
  /* الصوت: يُدار من hw-notify.js (فك قفل الصوت في iOS، نغمات مختلفة، رنين متكرر) */
  function beep() { if (g.HWNotify) g.HWNotify.play('order'); }
  function openNav(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }

  g.HWDB = { mode: remote ? 'remote' : 'local', col: Col, uid: uid, esc: esc, num: num, money: money, cfg: CFG };
  g.HWOrders = { mode: remote ? 'remote' : 'local', STEPS: STEPS, SHORT: SHORT, create: createOrder, update: updateOrder, subscribe: Orders.subscribe, get: Orders.get, list: Orders.list, _raw: Orders._raw,
    stats: stats, isActive: isActive, isToday: isToday, isMarket: isMarket, stage: stage, steps: steps, label: label, offerable: offerable, dispatchAt: dispatchAt, claim: claim, settle: settle, feeFrom: feeFrom,
    fmtTime: fmtTime, ago: ago, card: card, timeline: timeline, routeRows: routeRows, progress_: progress, captainRow: captainRow, esc: esc, num: num, money: money, toast: toast, beep: beep, openNav: openNav };
})(window);
