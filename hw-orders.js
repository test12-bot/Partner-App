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


  /* ساعة الخادم: كل الأوقات (إنشاء الطلب، المؤقتات، مهلة الإلغاء) تُحسب بتوقيت Firebase،
     فلا تتأثر بساعة هاتف خاطئة. نقيس الفرق مرة عند الفتح ثم كل 10 دقائق */
  var _now = Date.now.bind(Date), clockOff = 0;
  function syncClock() {
    if (!remote || !g.fetch) return;
    var t0 = _now();
    fetch(base + '/clock.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{".sv":"timestamp"}' }).then(function (r) { return r.json(); }).then(function (ts) {
      if (typeof ts !== 'number') return;
      var t1 = _now(), off = ts - (t0 + t1) / 2;
      if (t1 - t0 < 5000 && Math.abs(off) > 3000) { clockOff = off; Date.now = function () { return _now() + clockOff; }; }
    }).catch(function () {});
  }
  syncClock(); setInterval(syncClock, 600000);

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
      o.history = arr(o.history).sort(function (a, b) { return (a.t || 0) - (b.t || 0); }); o.items = arr(o.items).map(function (l) { if (l.opts) l.opts = arr(l.opts); return l; });
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
  /* حالة الشبكة: تُبلغ الواجهة (hw-ui.js) عند تعذر تحميل البيانات أو عودتها */
  var netOk = true;
  function netState(ok) { if (ok === netOk) return; netOk = ok; try { g.dispatchEvent(new Event(ok ? 'hw-netok' : 'hw-neterr')); } catch (e) {} }
  /* صندوق الإرسال: كل كتابة تُحفظ على الجهاز أولًا ثم تُرسل بالترتيب، وإن انقطعت الشبكة
     تبقى محفوظة (حتى لو أُغلق التطبيق) وتُعاد تلقائيًا عند عودة الاتصال، فلا يضيع طلب أو تسليم */
  var outbox = (function () {
    var KEY = 'hw-outbox-v1', q = [], busy = null;
    try { q = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(q)) q = []; } catch (e) { q = []; }
    function save() {                                    /* صور كبيرة قد تتجاوز سعة الجهاز: تُحفظ الكتابات الصغيرة على الأقل، ولا تبقى نسخة قديمة تُعاد خطأً */
      try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) {
        try { localStorage.setItem(KEY, JSON.stringify(q.filter(function (j) { return JSON.stringify(j.b || '').length < 150000; }))); } catch (x) { try { localStorage.removeItem(KEY); } catch (y) {} }
      }
    }
    function changed() { try { g.dispatchEvent(new Event('hw-outbox')); } catch (e) {} }
    function req(j) { return fetch(base + j.p, { method: j.m, headers: { 'Content-Type': 'application/json' }, body: j.b === undefined ? undefined : JSON.stringify(j.b) }); }
    function flush() {
      if (busy) return busy;
      if (!q.length) return Promise.resolve(true);
      busy = new Promise(function (done) {
        (function next() {
          if (!q.length) { busy = null; changed(); done(true); return; }
          req(q[0]).then(function (r) {
            /* 4xx = رفض نهائي من القاعدة (لا فائدة من الإعادة)؛ 5xx/408/429 = نعيد لاحقًا */
            if (!r.ok && (r.status >= 500 || r.status === 408 || r.status === 429)) throw new Error('retry');
            if (!r.ok) try { console.warn('HWDB: rejected ' + r.status + ' ' + q[0].p); } catch (e) {}
            q.shift(); save(); netState(true); next();
          }).catch(function () { busy = null; netState(false); changed(); done(false); });
        })();
      });
      return busy;
    }
    if (remote) {
      g.addEventListener('online', flush); g.addEventListener('hw-netok', flush);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
      setInterval(function () { if (q.length) flush(); }, 4000);
      setTimeout(flush, 300);
    }
    return {
      add: function (m, p, b) { q.push({ m: m, p: p, b: b, t: Date.now() }); save(); changed(); return flush(); },
      direct: function (m, p, b) { return req({ m: m, p: p, b: b }).catch(function () {}); },
      count: function () { return q.length; },
      has: function (col, id) { var p = '/' + col + '/' + id; return q.some(function (j) { return j.p === p + '.json' || j.p.indexOf(p + '/') === 0; }); },
      /* ما لم يصل الخادم بعد يبقى ظاهرًا على الجهاز فوق آخر نسخة من الخادم */
      overlay: function (col, T, setIn) {
        var out = null;
        q.forEach(function (j) {
          var m = j.p.match(/^\/([^\/]+)\/([^\/]+)\.json$/); if (!m || m[1] !== col) return;
          if (!out) out = Object.assign({}, T);
          var id = m[2];
          if (j.m === 'PUT') out[id] = JSON.parse(JSON.stringify(j.b));
          else if (j.m === 'DELETE') delete out[id];
          else if (j.m === 'PATCH' && out[id]) { var o = JSON.parse(JSON.stringify(out[id])); Object.keys(j.b || {}).forEach(function (k) { setIn(o, k, j.b[k]); }); out[id] = o; }
        });
        return out || T;
      }
    };
  })();
  /* عقدة /pulse: اتصال بث واحد يخبر كل المجموعات متى تغيّرت */
  var pulse = (function () {
    var es = null, seen = {}, fns = {}, primed = false;
    function ok() {
      if (!remote || !g.EventSource) return false;
      if (es && es.readyState !== 2) return true;
      try { es = new EventSource(base + '/pulse.json'); } catch (e) { return false; }
      /* أول لقطة كاملة تُسجَّل فقط (المجموعات تُحمَّل بنفسها). بعدها أي تغيير يُطلق إعادة التحميل،
         بما فيها مفتاح جديد لم يكن موجودًا (مثل أول تغيير للإعدادات في قاعدة جديدة) */
      var fire = function (k, v, quiet) { if (seen[k] === v) return; seen[k] = v; if (!quiet) (fns[k] || []).forEach(function (f) { f(); }); };
      es.addEventListener('put', function (e) { try { var d = JSON.parse(e.data), ks = d.path.split('/').filter(Boolean);
        if (!ks.length) { var q = !primed; primed = true; Object.keys(d.data || {}).forEach(function (k) { fire(k, d.data[k], q); }); } else fire(ks[0], d.data); } catch (x) {} });
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
    /* tree = نسخة البيانات القادمة من Firebase. عند تحديد نطاق (scope) لكل استعلام شجرته الخاصة،
       فيقرأ كل تطبيق طلباته فقط بدل كل الطلبات. استعلام بلا فهرس في قواعد Firebase → نرجع للقراءة الكاملة تلقائيًا */
    var tree = {}, es = null, rebuildT = 0, scopes = null, qt = [], qes = [];
    function merged() { if (!scopes) return tree; var m = {}; qt.forEach(function (t) { Object.keys(t || {}).forEach(function (k) { m[k] = t[k]; }); }); return m; }
    function rebuild() {                                  // الشجرة القادمة من Firebase → قائمة مرتبة للتطبيقات
      clearTimeout(rebuildT);
      rebuildT = setTimeout(function () { var T = outbox.overlay(name, merged(), setIn); cache = norm(Object.keys(T).map(function (k) { var o = JSON.parse(JSON.stringify(T[k])); if (o && typeof o === 'object' && !o.id) o.id = k; return o; })); markLoaded(); emit(); }, 30);
    }
    function setIn(root, path, val) {
      var ks = path.split('/').filter(Boolean);
      if (!ks.length) return val && typeof val === 'object' ? val : {};
      var n = root; for (var i = 0; i < ks.length - 1; i++) { if (!n[ks[i]] || typeof n[ks[i]] !== 'object') n[ks[i]] = {}; n = n[ks[i]]; }
      if (val === null) delete n[ks[ks.length - 1]]; else n[ks[ks.length - 1]] = val;
      return root;
    }
    function setAt(path, val) { tree = setIn(tree, path, val); }                // path مثل "/id/field"
    function qs(q) { return '?orderBy=' + encodeURIComponent(JSON.stringify(q.by)) + (q.eq !== undefined ? '&equalTo=' + encodeURIComponent(JSON.stringify(q.eq)) : '') + (q.start !== undefined ? '&startAt=' + encodeURIComponent(JSON.stringify(q.start)) : '') + (q.end !== undefined ? '&endAt=' + encodeURIComponent(JSON.stringify(q.end)) : ''); }
    function unscope(why) { if (!scopes) return; try { console.warn('HWDB: ' + name + ' scope off (' + why + ')'); } catch (e) {} scopes = null; qes.forEach(function (x) { try { x.close(); } catch (e) {} }); qes = []; qt = []; load(); stream(); }
    function load() {
      if (!remote) { cache = norm(readLocal()); markLoaded(); emit(); return Promise.resolve(); }
      if (scopes) {
        var sc = scopes;
        return Promise.all(sc.map(function (q) { return fetch(base + '/' + name + '.json' + qs(q), { cache: 'no-store' }).then(function (r) { return r.json(); }); })).then(function (res) {
          if (sc !== scopes) return;
          if (res.some(function (x) { return x && x.error; })) { unscope(res.filter(function (x) { return x && x.error; })[0].error); return; }
          qt = res.map(function (x) { return x && typeof x === 'object' ? x : {}; }); rebuild(); netState(true);
        }).catch(function () { netState(false); });
      }
      return fetch(base + '/' + name + '.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (obj) {
        tree = obj && typeof obj === 'object' ? obj : {}; rebuild(); netState(true);
      }).catch(function () { netState(false); });
    }
    /* البث المباشر من Firebase: يصل كل تغيير لحظة حدوثه ويُرسل التغيير فقط.
       المتصفح يسمح بعدد محدود من الاتصالات المفتوحة، لذلك:
       - الطلبات (الأكثر تغيرًا) لها بث خاص (أو بث لكل استعلام عند تحديد النطاق)
       - باقي المجموعات تستمع لعقدة صغيرة واحدة /pulse تتغير عند كل كتابة، فتعيد تحميل نفسها فقط */
    function wire(src, get, set) {
      src.addEventListener('put', function (e) { try { var d = JSON.parse(e.data); set(setIn(get(), d.path, d.data)); rebuild(); } catch (x) {} });
      src.addEventListener('patch', function (e) { try { var d = JSON.parse(e.data); var t = get(); Object.keys(d.data || {}).forEach(function (k) { t = setIn(t, d.path.replace(/\/$/, '') + '/' + k, d.data[k]); }); set(t); rebuild(); } catch (x) {} });
    }
    function stream() {
      /* كل المجموعات غير الطلبات (حتى المحدودة مثل محادثة الدعم) تتحدث عبر /pulse:
         المتصفح يسمح بستة اتصالات فقط لنفس الخادم، فبث مستقل لكل مجموعة يحجز طلبات الكتابة */
      if (name !== 'orders') { pulse.on(name, load); return pulse.ok(); }
      if (!g.EventSource) return false;
      if (scopes) {
        if (qes.length && qes.every(function (x) { return x.readyState !== 2; })) return true;
        qes.forEach(function (x) { try { x.close(); } catch (e) {} }); qes = [];
        try {
          scopes.forEach(function (q, i) {
            var src = new EventSource(base + '/' + name + '.json' + qs(q));
            wire(src, function () { return qt[i] || {}; }, function (t) { qt[i] = t; });
            src.addEventListener('cancel', function () { unscope('cancel'); });
            qes.push(src);
          });
        } catch (e) { return false; }
        return true;
      }
      if (es && es.readyState !== 2) return true;
      try { es = new EventSource(base + '/' + name + '.json'); } catch (e) { return false; }
      wire(es, function () { return tree; }, function (t) { tree = t; });
      es.addEventListener('cancel', function () { es.close(); es = null; });
      return true;
    }
    /* يحدّث النسخة المحلية فورًا (قبل وصول رد الخادم) في كل شجرة تحتوي السجل */
    function local(id, o) { var c = JSON.parse(JSON.stringify(o)); if (!scopes) { tree[id] = c; return; } var hit = false; qt.forEach(function (t) { if (t && t[id]) { t[id] = c; hit = true; } }); if (!hit) { qt[0] = qt[0] || {}; qt[0][id] = c; } }
    function unlocal(id) { delete tree[id]; qt.forEach(function (t) { if (t) delete t[id]; }); }
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
    function bump() { if (remote && name !== 'orders') outbox.direct('PUT', '/pulse/' + name + '.json', Date.now()); }
    function send(method, path, body) { return outbox.add(method, path, body); }
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
        if (remote) { local(id, o); send('PUT', '/' + name + '/' + id + '.json', o).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      /* دمج حقول في سجل موجود (أو إنشاؤه إن لم يوجد عند create=true) */
      /* wire (اختياري): ما يُرسل فعليًا للخادم بدل patch، مثل إضافة خطوة واحدة للسجل بمفتاح مستقل */
      patch: function (id, patch, createIfMissing, wire) {
        fresh();
        var o = cache.filter(function (x) { return x.id === id; })[0];
        if (!o) { if (!createIfMissing) return null; return api.create(Object.assign({ id: id }, patch)); }
        Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
        o.updatedAt = Date.now();
        if (remote) { local(id, o); send('PATCH', '/' + name + '/' + id + '.json', Object.assign({}, wire || patch, { updatedAt: o.updatedAt })).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      replace: function (id, obj) {
        fresh(); var o = Object.assign({ createdAt: Date.now() }, obj, { id: id, updatedAt: Date.now() });
        cache = cache.filter(function (x) { return x.id !== id; }); cache.unshift(o);
        if (remote) { local(id, o); send('PUT', '/' + name + '/' + id + '.json', o).then(bump); } else writeLocal(cache);
        emit(); return o;
      },
      remove: function (id) {
        fresh(); cache = cache.filter(function (x) { return x.id !== id; });
        if (remote) { unlocal(id); send('DELETE', '/' + name + '/' + id + '.json').then(bump); } else writeLocal(cache);
        emit();
      },
      /* نطاق القراءة: [{by:'customer/phone', eq:'07…'}, {by:'createdAt', start: t}] أو null للكل */
      scope: function (q) {
        q = q && q.length ? q : null;
        if (JSON.stringify(q) === JSON.stringify(scopes)) return;
        scopes = q; qt = []; qes.forEach(function (x) { try { x.close(); } catch (e) {} }); qes = [];
        if (q && es) { try { es.close(); } catch (e) {} es = null; }
        if (started && remote) { load(); stream(); }
      },
      scoped: function () { return !!scopes; },
      _raw: function () { return { remote: remote, base: base, key: key, send: send, fresh: fresh, writeLocal: writeLocal, cache: function () { return cache; }, emit: emit }; }
    };
    cols[name] = api; return api;
  }

  /* =========================================================
     الطلبات
     ========================================================= */
  var Orders = Col('orders');
  var STEPS = ['new', 'accepted', 'picked', 'delivered'];
  var SHORT = { new: 'بانتظار كابتن', accepted: 'الكابتن متجه للمطعم', picked: 'في طريقه للعميل', delivered: 'تم التسليم', cancelled: 'ملغي' };
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
  /* ---------- عدّادات لا تتكرر (رقم الطلب، رقم الكابتن) ----------
     قراءة العدّاد مع بصمته (ETag) ثم الكتابة بشرط ألا يكون تغيّر (if-match)؛ إن سبقنا جهاز آخر نعيد المحاولة.
     في الوضع التجريبي (بلا قاعدة بيانات) يُحفظ العدّاد في المتصفح. لاحقًا ينتقل هذا للخادم في مرحلة الأمان. */
  function counter(path) {
    if (!remote) {
      var k = 'hw-ctr-' + path, n = 0;
      try { n = (+localStorage.getItem(k) || 0) + 1; localStorage.setItem(k, n); } catch (e) { n = 1; }
      return Promise.resolve(n);
    }
    var url = base + '/counters/' + path + '.json', tries = 0;
    return (function attempt() {
      return fetch(url, { cache: 'no-store', headers: { 'X-Firebase-ETag': 'true' } }).then(function (r) {
        var tag = r.headers.get('ETag'); return r.json().then(function (v) { return { tag: tag, v: +v || 0 }; });
      }).then(function (x) {
        var n = x.v + 1, h = { 'Content-Type': 'application/json' }; if (x.tag) h['if-match'] = x.tag;
        return fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(n) }).then(function (r) {
          if (r.status === 412 && ++tries < 12) return new Promise(function (ok) { setTimeout(ok, 40 + Math.random() * 160); }).then(attempt);
          if (!r.ok) throw new Error('counter ' + r.status);
          return n;
        });
      });
    })();
  }
  function ymd(t) { var d = new Date(t); return String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()); }
  /* رقم الطلب: ORD#يوم-ترتيبه في الشهر-ترتيبه في اليوم، مثل ORD#261105-0347-021
     يُعطى فور وصول الطلب للقاعدة؛ إن كان الجهاز بلا إنترنت يُعطى عند عودة الاتصال */
  var NOQ = 'hw-ordno-q', noBusy = {};
  function noQueue(add, del) {
    var q = []; try { q = JSON.parse(localStorage.getItem(NOQ) || '[]'); } catch (e) {}
    if (add && q.indexOf(add) < 0) q.push(add); if (del) q = q.filter(function (x) { return x !== del; });
    try { localStorage.setItem(NOQ, JSON.stringify(q)); } catch (e) {}
    return q;
  }
  function assignNo(id) {
    if (noBusy[id]) return; var o = Orders.get(id);
    if (!o) { if (Orders.loaded()) noQueue(null, id); return; }
    if (o.code) { noQueue(null, id); return; }
    noBusy[id] = 1; noQueue(id);
    var d = ymd(o.createdAt), m = d.slice(0, 4), mn = 0;
    counter('ord/' + m).then(function (n) { mn = n; return counter('ord/' + d); }).then(function (dn) {
      Orders.patch(id, { code: 'ORD#' + d + '-' + String(mn).padStart(4, '0') + '-' + String(dn).padStart(3, '0') });
      noQueue(null, id); delete noBusy[id];
    }).catch(function () { delete noBusy[id]; });
  }
  function retryNos() { noQueue().forEach(assignNo); }
  g.addEventListener('online', retryNos); g.addEventListener('hw-netok', retryNos); setTimeout(retryNos, 3000);
  function createOrder(data) {
    var id = uid(), t = Date.now();
    var pin = String(1000 + Math.floor(Math.random() * 9000));   // رمز إثبات التسليم يعطيه العميل للكابتن
    var o = Object.assign({ id: id, code: '', status: 'new', pin: pin, createdAt: t, updatedAt: t, history: [{ s: 'new', t: t }] }, data);
    var res = origCreate(keyed(o, o)); assignNo(id); return res;
  }
  /* رقم الكابتن: سنة وشهر الانضمام + ترتيبه بين من انضموا في ذلك الشهر، مثل 261101 */
  function capNo(t) { var m = ymd(t || Date.now()).slice(0, 4); return counter('cap/' + m).then(function (n) { return m + String(n).padStart(2, '0'); }); }
  /* الرقم الظاهر للطلب: قبل وصول الرقم من القاعدة نعرض "ORD#…" */
  function codeOf(o) { return o && o.code ? o.code : 'ORD#…'; }
  /* الرقم المختصر الذي يُقال بالهاتف: ترتيب الطلب في اليوم، مثل #021 (الكامل داخل التفاصيل) */
  function shortNo(o) { var c = o && o.code || '', m = /^ORD#\d{6}-\d{4}-(\d{3})$/.exec(c); return m ? '#' + m[1] : c || '#…'; }

  /* ---------- أولوية الطلبات ومن يأخذها (مشتركة بين لوحة الإدارة وتطبيق الكابتن) ----------
     الطلبات: العاجل أولًا، ثم ما رُفض أو أعيد إسناده، ثم الأقدم انتظارًا.
     الكباتن: الأقرب للمطعم، ومن يرفض كثيرًا اليوم يتأخر قليلًا؛ وإن تقاربت المسافة (أقل من كيلو) يفوز الأطول انتظارًا منذ آخر طلب */
  function prioritySort(list) {
    var w = function (o) { return o.urgent ? 0 : ((o.offered || []).length || (o.reassigns || []).length || o.declinedAt) ? 1 : 2; };
    return list.slice().sort(function (a, b) { return w(a) - w(b) || (a.createdAt || 0) - (b.createdAt || 0); });
  }
  function dayKey() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function declinesToday(c) { return c.decl && c.decl.d === dayKey() ? c.decl.n || 0 : 0; }
  function idleSince(c) { return Math.max(c.lastJobAt || 0, c.shiftStart || 0); }
  function rankCaptains(list, o, loc) {
    var sl = loc || (o && o.storeLoc) || null;
    var dist = function (c) { return c.lat != null && sl && g.HWMap ? g.HWMap.est([c.lat, c.lng], [sl.lat, sl.lng]) : null; };
    var rows = list.map(function (c) { var d = dist(c); return { c: c, d: d, e: d == null ? 999 : d + Math.min(3, declinesToday(c) * 0.5), idle: idleSince(c) }; });
    rows.sort(function (a, b) { if (Math.abs(a.e - b.e) < 1) return (a.idle || 0) - (b.idle || 0) || a.e - b.e; return a.e - b.e; });
    return rows.map(function (r) {
      var mins = r.idle ? Math.round((Date.now() - r.idle) / 60000) : null;
      r.c._why = r.d != null ? 'الأقرب · ' + r.d.toFixed(1) + ' كم' + (mins != null && mins >= 10 ? ' · ينتظر ' + mins + ' د' : '') : (mins != null ? 'ينتظر منذ ' + mins + ' د' : 'متاح');
      r.c._km = r.d; return r.c;
    });
  }
  /* مفاتيح القراءة المحدودة: المتجر والكابتن يقرآن طلباتهما لآخر 40 يومًا فقط (لا كل التاريخ) */
  function keyed(p, o) {
    if (o.storeId && !o.storeKey) p.storeKey = o.storeId + '|' + o.createdAt;
    if ('captain' in p) p.capKey = p.captain && p.captain.id ? p.captain.id + '|' + o.createdAt : null;
    else if (o.captain && o.captain.id && !o.capKey) p.capKey = o.captain.id + '|' + o.createdAt;
    return p;
  }
  function keyRange(prefix, days) { return { start: prefix + '|' + (Date.now() - days * 864e5), end: prefix + '|~' }; }
  /* ev = اسم حدث يُسجَّل في الخط الزمني (إن لم يكن تغيّر status) */
  function updateOrder(id, patch, ev) {
    Orders._raw().fresh();
    var o = Orders.get(id); if (!o) return null;
    var t = Date.now(), hist = (o.history || []).slice();
    if (patch.status && patch.status !== o.status) hist.push({ s: patch.status, t: t });
    if (ev) hist.push({ s: ev, t: t });
    patch = keyed(Object.assign({}, patch), Object.assign({}, o, patch, { createdAt: o.createdAt }));
    var p = Object.assign({}, patch, { history: hist });
    /* على الخادم: كل خطوة تُضاف بمفتاح مستقل (history/h…) بدل إعادة كتابة السجل كاملًا،
       فلا يمحو تحديثان متزامنان (المتجر والكابتن مثلًا) خطوة بعضهما */
    var w = Object.assign({}, patch);
    hist.slice((o.history || []).length).forEach(function (h, i) { w['history/h' + t.toString(36) + i + Math.random().toString(36).slice(2, 5)] = h; });
    return Orders.patch(id, p, false, w);
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
    var surge = Number(o.surge) || 0;                     // رسوم الذروة/المطر: كاملة للكابتن بلا عمولة
    return { fee: fee, surge: surge, commission: commission, net: r2(fee - commission + surge), items: items, promo: promo,
      collected: isMarket(o) ? r2(items + fee + surge - promo) : 0, due: r2(commission - promo) };
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
    var capObj = { id: cap.id, num: cap.num || '', name: cap.name, phone: cap.phone || '', av: cap.av === 'f' ? 'f' : 'm', pv: cap.pv || 0 };
    var o = Orders.get(id);
    if (!remote) {
      Orders._raw().fresh(); o = Orders.get(id);
      if (!o || !offerable(o)) return Promise.resolve(false);
      updateOrder(id, { status: 'accepted', captain: capObj, claimBy: cap.id }, null); return Promise.resolve(true);
    }
    /* حجز ذرّي: نقرأ عقدة claim مع بصمتها (ETag) ونكتب عليها بشرط ألا تكون تغيّرت (if-match).
       إن قبل كابتنان في نفس اللحظة ينجح واحد فقط، والآخر يتلقى 412. إن لم تتوفر البصمة نرجع للطريقة القديمة */
    var cpath = base + '/orders/' + id + '/claim.json';
    return fetch(cpath, { cache: 'no-store', headers: { 'X-Firebase-ETag': 'true' } }).then(function (r) {
      var tag = r.headers.get('ETag'); return r.json().then(function (cl) { return { tag: tag, cl: cl }; });
    }).then(function (x) {
      if (!x.tag) return legacy();
      var now = Date.now();
      if (x.cl && x.cl.id && x.cl.id !== cap.id && now - (x.cl.at || 0) < 20000) return false;   // كابتن آخر يحجز الآن
      return fetch(cpath, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'if-match': x.tag }, body: JSON.stringify({ id: cap.id, at: now }) }).then(function (r) {
        if (r.status === 412) return false;
        if (!r.ok) return legacy();
        return fetch(base + '/orders/' + id + '.json', { cache: 'no-store' }).then(function (r2) { return r2.json(); }).then(function (cur) {
          if (!cur || !offerable(cur)) return false;
          updateOrder(id, { status: 'accepted', captain: capObj, claimBy: cap.id }, null); return true;
        });
      });
    }).catch(function () { return legacy(); });
    function legacy() {
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
    return '<div class="oc-cap"><img class="av" src="' + esc(g.HWBiz ? g.HWBiz.capAv(o.captain) : 'art/av-cm.png') + '" alt=""><div class="cp"><b>' + esc(o.captain.name) + '</b><small>' +
      (o.eta ? 'الوصول المتوقع ' + esc(o.eta) : 'الكابتن المعيّن') + '</small></div>' +
      (withCall && ph ? '<a class="oc-call" href="tel:' + esc(ph) + '" aria-label="اتصال بالكابتن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg></a>' : '') + '</div>';
  }
  function card(o, actionsHtml, showStore) {
    var meta = '<span class="oc-price">' + (o.price ? esc(o.price) + ' <small>دينار</small>' : '—') + '</span>';
    if (o.orderValue) meta += '<span class="oc-val">' + 'قيمة الطلب ' + esc(o.orderValue) + ' د.أ</span>';
    if (isMarket(o) && showStore) meta += '<span class="oc-tag">طلب تطبيق</span>';   // المطعم لا يحتاجه: كل طلباته من التطبيق
    return '<article class="oc s-' + o.status + '" data-id="' + esc(o.id) + '" tabindex="0" role="button">' +
      '<div class="oc-top"><span class="oc-code" dir="ltr" title="' + esc(o.code) + '">' + esc(g.HW_SHORT ? shortNo(o) : codeOf(o)) + '</span>' + (showStore ? '<span class="oc-store">' + esc(o.storeName || '') + '</span>' : '') +
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
  g.HWOrders = { mode: remote ? 'remote' : 'local', STEPS: STEPS, SHORT: SHORT, create: createOrder, update: updateOrder, patchLite: function (id, p) { return Orders.patch(id, p); }, keyRange: keyRange, pending: function (id) { return id ? outbox.has('orders', id) : outbox.count(); }, subscribe: Orders.subscribe, scope: Orders.scope, scoped: Orders.scoped, get: Orders.get, list: Orders.list, _raw: Orders._raw,
    stats: stats, isActive: isActive, isToday: isToday, isMarket: isMarket, stage: stage, steps: steps, label: label, offerable: offerable, dispatchAt: dispatchAt, claim: claim, settle: settle, counter: counter, capNo: capNo, codeOf: codeOf, shortNo: shortNo, prioritySort: prioritySort, rankCaptains: rankCaptains, dayKey: dayKey, feeFrom: feeFrom,
    fmtTime: fmtTime, ago: ago, card: card, timeline: timeline, routeRows: routeRows, progress_: progress, captainRow: captainRow, esc: esc, num: num, money: money, toast: toast, beep: beep, openNav: openNav };
})(window);
