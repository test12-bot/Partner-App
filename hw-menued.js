/* =========================================================
   HIGHWAY — محرر المنيو المشترك (hw-menued.js)
   نفس المحرر في تطبيق المتجر ولوحة الإدارة (مثل طلبات: المطعم يدير منيوه، والشركة تستطيع التعديل أيضًا):
   الأقسام، الأصناف، الأسعار، الوصف، صورة الصنف، وقت التحضير، الخيارات والإضافات، التوفر.
   الاستخدام: HWMenuEd.render(box, storeId, { onLog: (text) => ... })
   يعتمد على: hw-orders.js, hw-biz.js, hw-food.js
   ========================================================= */
(function (g) {
  'use strict';
  var E = g.HWOrders.esc, M = g.HWOrders.money, col = g.HWDB.col('menus');
  var sid = '', box = null, opt = {}, cat = null, item = null, opts = [], photo;   // photo: undefined = بلا تغيير، '' = حذف، dataURL = جديدة
  function $(id) { return document.getElementById(id); }
  function menu() { return JSON.parse(JSON.stringify(col.get(sid) || { id: sid, cats: [] })); }
  function save(m, what) { m.demo = false; col.replace(sid, m); if (what && opt.onLog) opt.onLog(what); }
  function toast(t) { g.HWOrders.toast(t); }
  function sheet(html) {
    var s = $('meSheet');
    if (!s) { s = document.createElement('div'); s.id = 'meSheet'; s.className = 'modal'; s.innerHTML = '<div class="modal-card glass me-card" id="meBody"></div>'; s.addEventListener('click', function (e) { if (e.target === s) close(); }); document.body.appendChild(s); }
    $('meBody').innerHTML = html; s.classList.add('show');
  }
  function close() { var s = $('meSheet'); if (s) s.classList.remove('show'); }
  function head(small, title) { return '<div class="sh-head"><div><small>' + small + '</small><h3>' + title + '</h3></div><button type="button" class="me-x" onclick="HWMenuEd.close()" aria-label="إغلاق">×</button></div>'; }
  function field(id, label, val, attrs) { return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + E(val == null ? '' : val) + '" ' + (attrs || '') + '></div>'; }

  /* ---------- القائمة ---------- */
  function render(b, storeId, o) {
    if (b) box = b; if (storeId) sid = storeId; if (o) opt = o;
    if (!box || !sid) return;
    var m = col.get(sid) || { cats: [] }, now = Date.now();
    box.innerHTML = (m.cats.length ? '' : '<div class="empty-orders">لا توجد أصناف بعد. ابدأ بإضافة قسم مثل "وجبات" أو "مشروبات"</div>') +
      m.cats.map(function (c, ci) {
        return '<div class="cart-card me-cat"><div class="mrow"><b>' + E(c.name) + '</b><span class="me-acts">' +
          (ci > 0 ? '<button type="button" class="me-mv" onclick="HWMenuEd.moveCat(' + ci + ',-1)" aria-label="لأعلى">↑</button>' : '') +
          '<button type="button" class="more-link inl" onclick="HWMenuEd.catSheet(' + ci + ')">تعديل</button></span></div>' +
          c.items.map(function (it, ii) {
            var on = g.HWBiz.itemOn(it, now), tags = [M(it.price) + ' د.أ'], ph = g.HWBiz.itemImg(sid, it);
            if ((it.options || []).length) tags.push(it.options.length + ' خيارات'); if (it.prepMin) tags.push(it.prepMin + ' د تحضير');
            if (it.outUntil && it.outUntil > now) tags.push('نفد حتى الغد'); else if (it.on === false) tags.push('موقوف');
            return '<div class="mrow it' + (on ? '' : ' off') + '">' + (ph ? '<img class="me-ph" src="' + E(ph) + '" alt="">' : '<span class="em">' + g.HWFood.forItem(it.name, it.desc, c.name, '') + '</span>') +
              '<div class="mt"><b>' + E(it.name) + '</b><small class="mut">' + tags.join(' · ') + '</small></div>' +
              '<button type="button" class="sw sm' + (on ? ' on' : '') + '" onclick="HWMenuEd.toggle(' + ci + ',' + ii + ')" aria-label="التوفر"></button>' +
              '<button type="button" class="more-link inl" onclick="HWMenuEd.itemSheet(' + ci + ',' + ii + ')">تعديل</button></div>';
          }).join('') + '<button type="button" class="more-link" onclick="HWMenuEd.itemSheet(' + ci + ',-1)">+ إضافة صنف</button></div>';
      }).join('') + '<button type="button" class="ghost-btn wide" onclick="HWMenuEd.catSheet(-1)">+ إضافة قسم جديد</button>';
  }
  /* التوفر: المتوفر يُسأل هل نفد اليوم أم يُوقف، والموقوف يعود فورًا */
  function toggle(ci, ii) {
    var m = menu(), it = m.cats[ci].items[ii];
    if (!g.HWBiz.itemOn(it)) { it.on = true; it.outUntil = 0; save(m); toast(it.name + ' متوفر الآن'); return; }
    sheet(head(E(it.name), 'إيقاف الصنف') +
      '<button type="button" class="call-opt y" onclick="HWMenuEd.setOff(' + ci + ',' + ii + ',1)"><span class="co-t"><b>نفد اليوم</b><small>يعود متوفرًا تلقائيًا صباح الغد</small></span></button>' +
      '<button type="button" class="call-opt" onclick="HWMenuEd.setOff(' + ci + ',' + ii + ',0)"><span class="co-t"><b>إيقاف حتى أعيد تفعيله</b><small>يختفي من قائمة العملاء</small></span></button>');
  }
  function setOff(ci, ii, today) {
    var m = menu(), it = m.cats[ci].items[ii];
    if (today) { it.outUntil = g.HWBiz.nextMorning(6); it.on = true; } else { it.on = false; it.outUntil = 0; }
    save(m); close();
  }
  function moveCat(ci, d) { var m = menu(), c = m.cats.splice(ci, 1)[0]; m.cats.splice(ci + d, 0, c); save(m); }

  /* ---------- الأقسام ---------- */
  function catSheet(ci) {
    cat = ci; var c = ci >= 0 ? menu().cats[ci] : { name: '' };
    sheet(head('المنيو', ci >= 0 ? 'تعديل القسم' : 'قسم جديد') + field('meCN', 'اسم القسم', c.name, 'placeholder="مثال: مشروبات"') +
      '<div class="sh-actions">' + (ci >= 0 ? '<button type="button" class="ghost-btn dng" onclick="HWMenuEd.catDel()">حذف</button>' : '') + '<button type="button" class="submit-btn" style="flex:1" onclick="HWMenuEd.catSave()"><span class="btn-label">حفظ</span></button></div>');
  }
  function catSave() {
    var n = $('meCN').value.trim(); if (!n) return; var m = menu();
    if (cat >= 0) m.cats[cat].name = n; else m.cats.push({ id: 'c' + Date.now().toString(36), name: n, items: [] });
    save(m, (cat >= 0 ? 'تعديل قسم ' : 'قسم جديد ') + n); close();
  }
  function catDel() { if (!confirm('حذف القسم وكل أصنافه؟')) return; var m = menu(), n = m.cats[cat].name; m.cats.splice(cat, 1); save(m, 'حذف قسم ' + n); close(); }

  /* ---------- الصنف ---------- */
  function itemSheet(ci, ii) {
    item = [ci, ii]; photo = undefined;
    var m = menu(), it = ii >= 0 ? m.cats[ci].items[ii] : { name: '', desc: '', price: '' }, ph = ii >= 0 ? g.HWBiz.itemImg(sid, it) : '';
    opts = JSON.parse(JSON.stringify(it.options || []));
    sheet(head(E(m.cats[ci].name), ii >= 0 ? 'تعديل الصنف' : 'صنف جديد') +
      '<div class="me-photo" id="mePhoto">' + (ph ? '<img src="' + E(ph) + '" alt="">' : '<span>' + g.HWFood.forItem(it.name || '', it.desc || '', m.cats[ci].name, '') + '<small>بدون صورة: تظهر رسمة تلقائية</small></span>') + '</div>' +
      '<div class="btn-row me-ph-btns"><label class="ghost-btn file-btn">' + (ph ? 'تغيير الصورة' : 'إضافة صورة') + '<input type="file" accept="image/*" onchange="HWMenuEd.pickPhoto(this.files[0])"></label>' + (ph ? '<button type="button" class="ghost-btn" onclick="HWMenuEd.dropPhoto()">حذف الصورة</button>' : '') + '</div>' +
      field('meIN', 'الاسم', it.name) + field('meID', 'الوصف <span class="opt">(اختياري)</span>', it.desc || '', 'placeholder="مثال: مع بطاطا وصوص الثوم"') +
      '<div class="two">' + field('meIP', 'السعر (د.أ)', it.price, 'type="number" step="0.05" min="0" inputmode="decimal"') +
      '<div class="field"><label for="meIT">وقت التحضير</label><select id="meIT"><option value="0">المعتاد للمتجر</option>' + [10, 15, 20, 25, 30, 40, 45, 60].map(function (n) { return '<option value="' + n + '"' + (it.prepMin === n ? ' selected' : '') + '>' + n + ' دقيقة</option>'; }).join('') + '</select></div></div>' +
      '<div class="opt-ed"><div class="mrow"><div><b>الخيارات والإضافات</b><small class="mut">مثل الحجم، الإضافات، اجعلها وجبة</small></div><button type="button" class="ghost-btn" onclick="HWMenuEd.addGroup()">+ مجموعة</button></div><div id="meOpts"></div></div>' +
      '<div class="sh-actions">' + (ii >= 0 ? '<button type="button" class="ghost-btn dng" onclick="HWMenuEd.itemDel()">حذف</button>' : '') + '<button type="button" class="submit-btn" style="flex:1" id="meSave" onclick="HWMenuEd.itemSave()"><span class="btn-label">حفظ</span></button></div>');
    renderOpts();
  }
  /* الصورة تُصغَّر إلى 640×480 قبل الحفظ */
  function pickPhoto(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var W = 640, Hh = 480, c = document.createElement('canvas'); c.width = W; c.height = Hh;
        var x = c.getContext('2d'), r = Math.max(W / im.width, Hh / im.height), w = im.width * r, h = im.height * r;
        x.drawImage(im, (W - w) / 2, (Hh - h) / 2, w, h); photo = c.toDataURL('image/jpeg', .8);
        $('mePhoto').innerHTML = '<img src="' + photo + '" alt="">';
      };
      im.onerror = function () { toast('تعذرت قراءة الصورة'); }; im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }
  function dropPhoto() { photo = ''; $('mePhoto').innerHTML = '<span><small>ستُحذف الصورة عند الحفظ</small></span>'; }
  function renderOpts() {
    $('meOpts').innerHTML = opts.map(function (gr, gi) {
      return '<div class="og-ed" data-g="' + gi + '"><div class="og-row"><input data-f="name" value="' + E(gr.name) + '" placeholder="اسم المجموعة (مثال: الحجم)"><button type="button" class="og-x" onclick="HWMenuEd.delGroup(' + gi + ')" aria-label="حذف المجموعة">×</button></div>' +
        '<div class="og-row sm"><label><input type="checkbox" data-f="req"' + (gr.min >= 1 ? ' checked' : '') + '> اختيار مطلوب</label><label>الحد الأقصى <input type="number" data-f="max" min="1" max="10" value="' + (gr.max || 1) + '"></label></div>' +
        gr.choices.map(function (c, ci) { return '<div class="og-row ch" data-c="' + ci + '"><input data-f="cname" value="' + E(c.name) + '" placeholder="الخيار"><input data-f="cprice" type="number" step="0.05" min="0" value="' + (c.price || 0) + '" aria-label="السعر الإضافي"><button type="button" class="og-x" onclick="HWMenuEd.delChoice(' + gi + ',' + ci + ')" aria-label="حذف الخيار">×</button></div>'; }).join('') +
        '<button type="button" class="more-link" onclick="HWMenuEd.addChoice(' + gi + ')">+ خيار</button></div>';
    }).join('') || '<p class="mut" style="margin:6px 0 0">لا توجد خيارات لهذا الصنف</p>';
  }
  function readOpts() {
    document.querySelectorAll('#meOpts .og-ed').forEach(function (el) {
      var gr = opts[+el.dataset.g]; if (!gr) return;
      gr.name = el.querySelector('[data-f="name"]').value.trim(); gr.min = el.querySelector('[data-f="req"]').checked ? 1 : 0;
      gr.max = Math.max(1, Math.min(10, parseInt(el.querySelector('[data-f="max"]').value, 10) || 1));
      el.querySelectorAll('.ch').forEach(function (r) { var c = gr.choices[+r.dataset.c]; c.name = r.querySelector('[data-f="cname"]').value.trim(); c.price = Math.max(0, Math.round((parseFloat(r.querySelector('[data-f="cprice"]').value) || 0) * 100) / 100); });
    });
  }
  var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 4); };
  function addGroup() { readOpts(); opts.push({ id: uid('g'), name: '', min: 0, max: 1, choices: [{ id: uid('o'), name: '', price: 0 }] }); renderOpts(); }
  function delGroup(gi) { readOpts(); opts.splice(gi, 1); renderOpts(); }
  function addChoice(gi) { readOpts(); opts[gi].choices.push({ id: uid('o'), name: '', price: 0 }); renderOpts(); }
  function delChoice(gi, ci) { readOpts(); opts[gi].choices.splice(ci, 1); renderOpts(); }
  function itemSave() {
    var n = $('meIN').value.trim(), p = parseFloat($('meIP').value);
    if (!n || !(p >= 0)) { toast('أدخل الاسم والسعر'); return; }
    readOpts();
    var clean = opts.map(function (gr) { gr.choices = gr.choices.filter(function (c) { return c.name; }); return gr; }).filter(function (gr) { return gr.name && gr.choices.length; });
    if (clean.some(function (gr) { return gr.min > gr.choices.length; })) { toast('عدد الخيارات أقل من المطلوب'); return; }
    var m = menu(), ci = item[0], ii = item[1], old = ii >= 0 ? m.cats[ci].items[ii] : {};
    var rec = { id: old.id || uid('i'), name: n, desc: $('meID').value.trim(), price: Math.round(p * 100) / 100, on: old.on !== false, outUntil: old.outUntil || 0, prepMin: +$('meIT').value || 0, img: old.img || 0 };
    if (clean.length) rec.options = clean;
    var what = ii >= 0 ? (old.price !== rec.price ? 'تغيير سعر ' + n + ' إلى ' + M(rec.price) : 'تعديل صنف ' + n) : 'صنف جديد ' + n;
    var done = function () { var m2 = menu(); if (ii >= 0) m2.cats[ci].items[ii] = rec; else m2.cats[ci].items.push(rec); save(m2, what); close(); toast('تم حفظ الصنف'); };
    if (photo === undefined) { done(); return; }
    $('meSave').classList.add('loading');
    g.HWBiz.saveItemImg(sid, rec.id, photo).then(function (v) { rec.img = v; done(); }, function () { toast('تعذر حفظ الصورة'); $('meSave').classList.remove('loading'); });
  }
  function itemDel() {
    if (!confirm('حذف هذا الصنف؟')) return;
    var m = menu(), it = m.cats[item[0]].items[item[1]];
    m.cats[item[0]].items.splice(item[1], 1); save(m, 'حذف صنف ' + it.name); if (it.img) g.HWBiz.saveItemImg(sid, it.id, null); close();
  }

  col.subscribe(function () { render(); });
  g.HWBiz.onMedia(function (id) { if (id === sid) render(); });
  g.HWMenuEd = { render: render, close: close, toggle: toggle, setOff: setOff, moveCat: moveCat, catSheet: catSheet, catSave: catSave, catDel: catDel,
    itemSheet: itemSheet, itemSave: itemSave, itemDel: itemDel, pickPhoto: pickPhoto, dropPhoto: dropPhoto, addGroup: addGroup, delGroup: delGroup, addChoice: addChoice, delChoice: delChoice };
})(window);
