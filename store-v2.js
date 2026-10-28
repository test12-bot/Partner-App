/* =========================================================
   موقع المتاجر v2 — طلبات العملاء + المنيو + حالة المتجر
   ========================================================= */
const menusCol = HWDB.col('menus'), stateCol = HWDB.col('storestate');
let _menus = {}, _states = {}, editCat = null, editItem = null;
const EH = HWOrders.esc;

menusCol.subscribe(l => { _menus = {}; l.forEach(m => { _menus[m.id] = m; }); if (currentScreen_() === 'screen-menu') renderMenuAdmin(); });
stateCol.subscribe(l => { _states = {}; l.forEach(m => { _states[m.id] = m; }); if (currentScreen_() === 'screen-menu') renderMenuAdmin(); });

/* ---------- أزرار الطلب ---------- */
function storeActions(o) {
    if (!HWOrders.isMarket(o) || !currentUser || !currentUser.start || o.status === 'cancelled' || o.status === 'delivered') return '';
    if (o.storeState === 'pending') return '<button type="button" class="act-btn go" onclick="event.stopPropagation();openAccept(\'' + o.id + '\')">قبول الطلب</button><button type="button" class="act-btn no" onclick="event.stopPropagation();rejectOrder(\'' + o.id + '\')">رفض</button>';
    if (o.storeState === 'preparing' && o.status !== 'picked') return '<button type="button" class="act-btn go" onclick="event.stopPropagation();markReady(\'' + o.id + '\')">الطلب جاهز ✓</button>';
    if (o.storeState === 'ready' && o.status === 'new') return '<span class="mut">جاهز، بانتظار الكابتن</span>';
    return '';
}
function openAccept(id) {
    const o = HWOrders.get(id); if (!o) return;
    const body = document.getElementById('menuSheetBody');
    body.innerHTML = '<div class="sh-head"><div><small>' + EH(o.code) + '</small><h3>كم يحتاج التحضير؟</h3></div></div><div class="sh-rows">' + o.items.map(l => '<div><span>' + l.qty + '× ' + EH(l.name) + '</span><b>' + HWOrders.money(l.price * l.qty) + '</b></div>').join('') + '</div><div class="prep-grid">' +
        [10, 15, 20, 30, 45].map(m => '<button type="button" class="chip" onclick="acceptOrder(\'' + id + '\',' + m + ')">' + m + ' دقيقة</button>').join('') + '</div>';
    document.getElementById('menuSheet').classList.add('show');
}
function acceptOrder(id, m) { closeMenuSheet(); HWOrders.update(id, { storeState: 'preparing', prepMin: m }, 'store_accepted'); buzz(15); HWOrders.toast('تم قبول الطلب، ابدأ التحضير'); }
function rejectOrder(id) { if (confirm('رفض هذا الطلب؟ سيُبلَّغ العميل.')) { HWOrders.update(id, { status: 'cancelled', storeState: 'rejected', cancelReason: 'اعتذر المتجر عن الطلب' }); buzz(15); } }
function markReady(id) { HWOrders.update(id, { storeState: 'ready' }, 'store_ready'); buzz(15); HWOrders.toast('تم إبلاغ الكابتن أن الطلب جاهز'); }
function closeMenuSheet() { document.getElementById('menuSheet').classList.remove('show'); }

/* ---------- المنيو ---------- */
function myMenu() { return _menus[currentUser.id] || { id: currentUser.id, cats: [] }; }
function saveMenu(m) { m.demo = false; menusCol.patch(currentUser.id, m, true); }
function renderMenuAdmin() {
    const box = document.getElementById('menuAdmin'); if (!box) return;
    if (!currentUser || !currentUser.start) { box.innerHTML = '<div class="empty-orders">المنيو خاص بحسابات المتاجر</div>'; return; }
    const st = _states[currentUser.id] || {}, open = st.open !== false, m = myMenu();
    box.innerHTML =
        '<div class="cart-card"><div class="mrow"><div><b>' + (open ? 'المتجر مفتوح' : 'المتجر مغلق') + '</b><small class="mut">' + (open ? 'يستقبل طلبات العملاء' : 'لن يظهر للعملاء كمفتوح') + '</small></div><button type="button" class="sw' + (open ? ' on' : '') + '" onclick="toggleOpen()" aria-label="فتح أو إغلاق"></button></div>' +
        '<div class="mrow" style="margin-top:10px"><div><b>وقت التحضير المعتاد</b><small class="mut">يظهر للعميل قبل الطلب</small></div><select id="prepSel" onchange="setPrep(this.value)">' + [10, 15, 20, 30, 45].map(n => '<option value="' + n + '"' + ((st.prepMin || 20) === n ? ' selected' : '') + '>' + n + ' د</option>').join('') + '</select></div></div>' +
        '<div class="cart-card"><div class="mrow"><div><b>موقع المتجر على الخريطة</b><small class="mut">' + (st.lat != null ? 'تم تحديده ✓ (يُحسب عليه سعر التوصيل)' : 'غير محدد: يُحسب التوصيل من مركز المدينة') + '</small></div><button type="button" class="ghost-btn" onclick="openStoreLoc()">' + (st.lat != null ? 'تعديل' : 'تحديد') + '</button></div></div>' +
        (m.demo ? '<div class="demo-banner">هذا منيو تجريبي بأسعار وهمية، عدّله أو احذفه</div>' : '') +
        m.cats.map((c, ci) => '<div class="cart-card"><div class="mrow"><b>' + EH(c.name) + '</b><span><button type="button" class="more-link inl" onclick="openCatSheet(' + ci + ')">تعديل</button></span></div>' +
            c.items.map((it, ii) => '<div class="mrow it' + (it.on === false ? ' off' : '') + '"><span class="em">' + HWFood.forItem(it.name, it.desc, c.name, '') + '</span><div class="mt"><b>' + EH(it.name) + '</b><small class="mut">' + HWOrders.money(it.price) + ' د.أ' + (it.on === false ? ' · غير متوفر' : '') + '</small></div><button type="button" class="sw sm' + (it.on !== false ? ' on' : '') + '" onclick="toggleItem(' + ci + ',' + ii + ')" aria-label="التوفر"></button><button type="button" class="more-link inl" onclick="openItemEdit(' + ci + ',' + ii + ')">تعديل</button></div>').join('') +
            '<button type="button" class="more-link" onclick="openItemEdit(' + ci + ',-1)">+ إضافة صنف</button></div>').join('') +
        '<button type="button" class="ghost-btn wide" onclick="openCatSheet(-1)">+ إضافة قسم جديد</button>';
}
function toggleOpen() { const st = _states[currentUser.id] || {}; stateCol.patch(currentUser.id, { open: st.open === false }, true); buzz(); }
function setPrep(v) { stateCol.patch(currentUser.id, { prepMin: +v }, true); }
function toggleItem(ci, ii) { const m = myMenu(), it = m.cats[ci].items[ii]; it.on = it.on === false; saveMenu(m); buzz(); }
function openCatSheet(ci) {
    editCat = ci; const m = myMenu(), c = ci >= 0 ? m.cats[ci] : { name: '' };
    document.getElementById('menuSheetBody').innerHTML = '<div class="sh-head"><div><small>المنيو</small><h3>' + (ci >= 0 ? 'تعديل القسم' : 'قسم جديد') + '</h3></div></div><div class="field"><label for="catName">اسم القسم</label><input type="text" id="catName" value="' + EH(c.name) + '" placeholder="مثال: مشروبات"></div>' +
        '<div class="sh-actions">' + (ci >= 0 ? '<button type="button" class="ghost-btn dng" onclick="delCat()">حذف</button>' : '') + '<button type="button" class="submit-btn" style="flex:1" onclick="saveCat()"><span class="btn-label">حفظ</span></button></div>';
    document.getElementById('menuSheet').classList.add('show');
}
function saveCat() {
    const n = document.getElementById('catName').value.trim(); if (!n) return;
    const m = myMenu(); if (editCat >= 0) m.cats[editCat].name = n; else m.cats.push({ id: 'c' + Date.now().toString(36), name: n, items: [] });
    saveMenu(m); closeMenuSheet();
}
function delCat() { if (!confirm('حذف القسم وكل أصنافه؟')) return; const m = myMenu(); m.cats.splice(editCat, 1); saveMenu(m); closeMenuSheet(); }
function openItemEdit(ci, ii) {
    editItem = [ci, ii]; const m = myMenu(), it = ii >= 0 ? m.cats[ci].items[ii] : { name: '', desc: '', price: '', emoji: '🍽️' };
    document.getElementById('menuSheetBody').innerHTML = '<div class="sh-head"><div><small>' + EH(m.cats[ci].name) + '</small><h3>' + (ii >= 0 ? 'تعديل الصنف' : 'صنف جديد') + '</h3></div></div>' +
        '<div class="field"><label for="itName">الاسم</label><input type="text" id="itName" value="' + EH(it.name) + '"></div>' +
        '<div class="field"><label for="itDesc">الوصف <span class="opt">(اختياري)</span></label><input type="text" id="itDesc" value="' + EH(it.desc || '') + '"></div>' +
        '<div class="field"><label for="itPrice">السعر (د.أ)</label><input type="number" id="itPrice" step="0.05" min="0" inputmode="decimal" value="' + EH(it.price) + '"></div>' +
        '<p class="mut">الرسمة تُختار تلقائيًا من اسم الصنف</p>' +
        '<div class="sh-actions">' + (ii >= 0 ? '<button type="button" class="ghost-btn dng" onclick="delItem()">حذف</button>' : '') + '<button type="button" class="submit-btn" style="flex:1" onclick="saveItem()"><span class="btn-label">حفظ</span></button></div>';
    document.getElementById('menuSheet').classList.add('show');
}
function saveItem() {
    const n = document.getElementById('itName').value.trim(), p = parseFloat(document.getElementById('itPrice').value);
    if (!n || !(p >= 0)) { HWOrders.toast('أدخل الاسم والسعر'); return; }
    const m = myMenu(), [ci, ii] = editItem, rec = { id: ii >= 0 ? m.cats[ci].items[ii].id : 'i' + Date.now().toString(36), name: n, desc: document.getElementById('itDesc').value.trim(), price: Math.round(p * 100) / 100,  on: ii >= 0 ? m.cats[ci].items[ii].on : true };
    if (ii >= 0) m.cats[ci].items[ii] = rec; else m.cats[ci].items.push(rec);
    saveMenu(m); closeMenuSheet();
}
function delItem() { if (!confirm('حذف هذا الصنف؟')) return; const m = myMenu(); m.cats[editItem[0]].items.splice(editItem[1], 1); saveMenu(m); closeMenuSheet(); }

(function () {
    const _s = window.showScreen;
    window.showScreen = function (id) { _s(id); if (id === 'screen-menu') renderMenuAdmin(); };
    const _fill = window.fillUserUI;
    window.fillUserUI = function (u) { _fill(u); const t = document.getElementById('tabMenu'); if (t) t.style.display = u && u.start ? '' : 'none'; };
})();

/* ---------- موقع المتجر ---------- */
let slMap = null, slPick = null, slTimer = null;
function openStoreLoc() {
    const st = _states[currentUser.id] || {}, c = st.lat != null ? [st.lat, st.lng] : HWMap.center();
    document.getElementById('slFull').classList.add('show');
    if (!slMap) { slMap = HWMap.create(document.getElementById('slMap'), { center: c, zoom: 17 }); slMap.on('movestart', () => document.getElementById('slPin').classList.add('drag')); slMap.on('moveend', () => { document.getElementById('slPin').classList.remove('drag'); slAddr(); }); }
    setTimeout(() => { slMap.invalidateSize(); slMap.setView(c, 17, { animate: false }); slAddr(); if (st.lat == null) storeGps(true); }, 80);
}
function closeStoreLoc() { document.getElementById('slFull').classList.remove('show'); }
function slAddr() {
    const c = slMap.getCenter(); slPick = { lat: c.lat, lng: c.lng }; const el = document.getElementById('slAddr'); el.textContent = 'جاري تحديد العنوان…';
    clearTimeout(slTimer); const mine = slPick; slTimer = setTimeout(async () => { const t = await HWMap.reverse([c.lat, c.lng]); if (mine === slPick) el.textContent = t || 'الموقع المحدد على الخريطة'; }, 500);
}
function storeGps(silent) { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition(p => slMap.setView([p.coords.latitude, p.coords.longitude], 18), () => { if (!silent) HWOrders.toast('تعذر تحديد موقعك'); }, { enableHighAccuracy: true, timeout: 9000 }); }
function saveStoreLoc() { if (!slPick) return; stateCol.patch(currentUser.id, { lat: +slPick.lat.toFixed(6), lng: +slPick.lng.toFixed(6) }, true); closeStoreLoc(); buzz(15); HWOrders.toast('تم حفظ موقع المتجر'); }

