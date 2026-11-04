/* =========================================================
   HIGHWAY — محرر قص الصور (hw-crop.js)
   قبل حفظ صورة صنف أو شعار أو غلاف: تحريك الصورة بالإصبع، تكبير/تصغير (بإصبعين أو الشريط)،
   ثم حفظها بالمقاس المطلوب تمامًا كما تظهر في الإطار.
   HWCrop.open(fileOrDataURL, { w, h, round, title, quality }) → Promise<dataURL | null>
   HWCrop.fit(fileOrDataURL, { w, h }) → Promise<dataURL>  بدون أي خطوة من المستخدم:
     الصورة بنفس النسبة (مثل 4:3) تُصغَّر فقط، والصورة العرضية أو الطولية تظهر كاملة دون قص
     فوق نسخة مكبّرة ومموّهة منها تملأ الإطار (بدل الأشرطة الفارغة أو قص أطراف الطعام)
   ========================================================= */
(function () {
  var g = window;
  function css() {
    if (document.getElementById('hwCropCss')) return;
    var st = document.createElement('style'); st.id = 'hwCropCss';
    st.textContent =
      '.hw-crop{position:fixed;inset:0;z-index:6000;background:rgba(7,29,30,.92);display:flex;flex-direction:column;color:#F5EDE3;opacity:0;transition:opacity .25s;touch-action:none;-webkit-user-select:none;user-select:none}' +
      '.hw-crop.show{opacity:1}' +
      '.hw-crop-top{display:flex;align-items:center;justify-content:space-between;padding:calc(14px + env(safe-area-inset-top)) 16px 8px}' +
      '.hw-crop-top b{font-size:16px}.hw-crop-top button{border:0;background:rgba(255,255,255,.12);color:#F5EDE3;font:inherit;font-weight:700;border-radius:99px;padding:8px 14px}' +
      '.hw-crop-stage{flex:1;display:grid;place-items:center;padding:12px;min-height:0}' +
      '.hw-crop-box{position:relative;overflow:hidden;background:#0B2A2B;box-shadow:0 0 0 3px #25CED1,0 0 0 5px rgba(232,239,68,.8),0 20px 50px rgba(0,0,0,.5);cursor:grab;touch-action:none}' +
      '.hw-crop-box.round{border-radius:50%}.hw-crop-box img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;pointer-events:none;will-change:transform}' +
      '.hw-crop-grid{position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)) 33.33% 0/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)) 66.66% 0/1px 100% no-repeat,linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)) 0 33.33%/100% 1px no-repeat,linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.18)) 0 66.66%/100% 1px no-repeat;opacity:0;transition:opacity .2s}' +
      '.hw-crop-box.drag .hw-crop-grid{opacity:1}' +
      '.hw-crop-bot{padding:10px 20px calc(20px + env(safe-area-inset-bottom));display:grid;gap:14px}' +
      '.hw-crop-hint{text-align:center;font-size:13px;opacity:.75}' +
      '.hw-crop-zoom{display:flex;align-items:center;gap:12px;direction:ltr}.hw-crop-zoom span{font-size:20px;opacity:.8;width:20px;text-align:center}' +
      '.hw-crop-zoom input{flex:1;accent-color:#E8EF44;height:28px}' +
      '.hw-crop-acts{display:flex;gap:10px}.hw-crop-acts button{flex:1;height:52px;border-radius:99px;border:0;font:inherit;font-weight:800;font-size:15.5px}' +
      '.hw-crop-ok{background:#E8EF44;color:#0E3A3B}.hw-crop-reset{background:rgba(255,255,255,.12);color:#F5EDE3}';
    document.head.appendChild(st);
  }
  function load(src) {
    return new Promise(function (res, rej) {
      if (typeof src === 'string') { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; return; }
      var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(src);
    });
  }
  function open(src, o) {
    o = o || {}; var W = o.w || 640, H = o.h || 480, round = !!o.round;
    return load(src).then(function (img) {
      css();
      return new Promise(function (done) {
        var root = document.createElement('div'); root.className = 'hw-crop'; root.setAttribute('role', 'dialog');
        root.innerHTML = '<div class="hw-crop-top"><button type="button" data-x>إلغاء</button><b>' + (o.title || 'اضبط الصورة') + '</b><span style="width:64px"></span></div>' +
          '<div class="hw-crop-stage"><div class="hw-crop-box' + (round ? ' round' : '') + '"><img alt=""><div class="hw-crop-grid"></div></div></div>' +
          '<div class="hw-crop-bot"><div class="hw-crop-hint">اسحب الصورة لتحريكها، واستخدم إصبعين أو الشريط للتكبير</div>' +
          '<div class="hw-crop-zoom"><span>−</span><input type="range" min="0" max="1000" value="0" aria-label="تكبير"><span>+</span></div>' +
          '<div class="hw-crop-acts"><button type="button" class="hw-crop-reset">إعادة</button><button type="button" class="hw-crop-ok">حفظ الصورة</button></div></div>';
        document.body.appendChild(root);
        var box = root.querySelector('.hw-crop-box'), im = root.querySelector('img'), rng = root.querySelector('input');
        im.src = img.src;
        /* حجم الإطار على الشاشة بنفس نسبة المقاس المطلوب */
        var stage = root.querySelector('.hw-crop-stage'), bw, bh, minS, maxS, s, x, y;
        function fit() {
          var aw = Math.min(stage.clientWidth - 24, 520), ah = stage.clientHeight - 24, r = W / H;
          bw = aw; bh = aw / r; if (bh > ah) { bh = ah; bw = ah * r; }
          box.style.width = bw + 'px'; box.style.height = bh + 'px';
          minS = Math.max(bw / img.width, bh / img.height); maxS = minS * 5;
        }
        function clamp() { s = Math.max(minS, Math.min(maxS, s)); x = Math.min(0, Math.max(bw - img.width * s, x)); y = Math.min(0, Math.max(bh - img.height * s, y)); }
        function draw() { clamp(); im.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; rng.value = Math.round(Math.log(s / minS) / Math.log(maxS / minS) * 1000); }
        function reset() { s = minS; x = (bw - img.width * s) / 2; y = (bh - img.height * s) / 2; draw(); }
        function zoomAt(ns, cx, cy) { var k = ns / s; x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = ns; draw(); }
        fit(); reset();
        g.addEventListener('resize', function rs() { if (!root.isConnected) { g.removeEventListener('resize', rs); return; } var rx = (x - bw / 2) / s, ry = (y - bh / 2) / s, rel = s / minS; fit(); s = minS * rel; x = bw / 2 + rx * s; y = bh / 2 + ry * s; draw(); });
        rng.addEventListener('input', function () { zoomAt(minS * Math.pow(maxS / minS, rng.value / 1000), bw / 2, bh / 2); });
        /* السحب والتكبير بإصبعين */
        var pts = {}, last = null;
        function rel(e) { var r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
        function state() { var k = Object.keys(pts); if (k.length === 1) return { c: pts[k[0]], d: 0 }; var a = pts[k[0]], b = pts[k[1]]; return { c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; }
        box.addEventListener('pointerdown', function (e) { box.setPointerCapture(e.pointerId); pts[e.pointerId] = rel(e); last = state(); box.classList.add('drag'); });
        box.addEventListener('pointermove', function (e) {
          if (!pts[e.pointerId]) return; pts[e.pointerId] = rel(e); var st = state();
          if (last) { x += st.c[0] - last.c[0]; y += st.c[1] - last.c[1]; if (st.d && last.d) zoomAt(s * st.d / last.d, st.c[0], st.c[1]); else draw(); }
          last = st;
        });
        function up(e) { delete pts[e.pointerId]; last = Object.keys(pts).length ? state() : null; if (!last) box.classList.remove('drag'); }
        box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
        box.addEventListener('wheel', function (e) { e.preventDefault(); var c = rel(e); zoomAt(s * (e.deltaY < 0 ? 1.08 : 1 / 1.08), c[0], c[1]); }, { passive: false });
        function close(v) { root.classList.remove('show'); setTimeout(function () { root.remove(); }, 260); done(v); }
        root.querySelector('[data-x]').onclick = function () { close(null); };
        root.querySelector('.hw-crop-reset').onclick = reset;
        root.querySelector('.hw-crop-ok').onclick = function () {
          /* الإخراج: ما يظهر داخل الإطار تمامًا، بالمقاس المطلوب */
          var c = document.createElement('canvas'); c.width = W; c.height = H; var ctx = c.getContext('2d'), k = W / bw;
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, x * k, y * k, img.width * s * k, img.height * s * k);
          close(c.toDataURL('image/jpeg', o.quality || .82));
        };
        requestAnimationFrame(function () { root.classList.add('show'); });
      });
    });
  }
  function fit(src, o) {
    o = o || {}; var W = o.w || 960, H = o.h || 720;
    return load(src).then(function (img) {
      var c = document.createElement('canvas'); c.width = W; c.height = H; var ctx = c.getContext('2d'), iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      ctx.imageSmoothingQuality = 'high';
      if (Math.abs(iw / ih - W / H) < 0.035) { ctx.drawImage(img, 0, 0, W, H); return c.toDataURL('image/jpeg', o.quality || .84); }
      /* الخلفية: الصورة نفسها تملأ الإطار ثم تُموَّه بتصغيرها جدًا وإعادة تكبيرها (يعمل على كل المتصفحات) */
      var k = Math.max(W / iw, H / ih), t = document.createElement('canvas'); t.width = 24; t.height = 18;
      var tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high';
      tx.drawImage(img, (24 - iw * k * 24 / W) / 2, (18 - ih * k * 18 / H) / 2, iw * k * 24 / W, ih * k * 18 / H);
      ctx.drawImage(t, 0, 0, W, H);
      ctx.fillStyle = 'rgba(14,58,59,.18)'; ctx.fillRect(0, 0, W, H);
      /* الصورة كاملة في المنتصف */
      var f = Math.min(W / iw, H / ih), dw = iw * f, dh = ih * f;
      ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 24;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      return c.toDataURL('image/jpeg', o.quality || .84);
    });
  }
  g.HWCrop = { open: open, fit: fit };
})();
