/* =========================================================
   Partner App — store-v2.js
   ميزات المتجر الشريك فوق الملف الأساسي (script.js):
   1) طلبات العملاء: قبول/رفض/جاهز + طباعة التذكرة
   2) حالة المتجر: فتح/إغلاق، إيقاف مؤقت، أوقات الدوام الأسبوعية، وقت التحضير
   3) المنيو كاملًا عبر المحرر المشترك hw-menued.js (مثل طلبات: المطعم يدير منيوه وصوره وأسعاره)
      الشعار والغلاف والموقع والعروض وحساب الدخول تديرها الإدارة من لوحتها
   4) التقارير: اليوم / ٧ أيام / الشهر + طباعة
   5) استدعاء كابتن: بوجهة أو بدون وجهة
   يعتمد على: hw-orders.js, hw-biz.js, hw-food.js, hw-map.js
   ========================================================= */
const stateCol = HWDB.col('storestate');
const EH = HWOrders.esc, MNY = HWOrders.money, $s = (id) => document.getElementById(id);
let _states = {}, repPeriod = 'day';

function isStore() { return !!currentUser; }
function myState() { return (currentUser && _states[currentUser.id]) || {}; }
function refreshStoreUI() { const s = currentScreen_(); if (s === 'screen-menu') renderMenuAdmin(); if (s === 'screen-reports') renderReports(); renderStoreHome(); }
stateCol.subscribe(l => { _states = {}; l.forEach(m => { _states[m.id] = m; }); refreshStoreUI(); });
HWBiz.announcementsCol.subscribe(renderStoreHome);
/* حساب المتجر: إن أوقفته الإدارة يخرج المستخدم فورًا */
HWBiz.storesCol.subscribe((l) => {
    if (!isStore() || !l.length) return;
    const s = l.filter(x => x.id === currentUser.id)[0];
    if (!s || s.active === false) { HWOrders.toast('تم إيقاف حساب المتجر من الإدارة'); setTimeout(logout, 1500); return; }
    if (s.name !== currentUser.label) { currentUser.label = s.name; fillUserUI(currentUser); }
});
HWBiz.onMedia((id) => { if (isStore() && id === currentUser.id) fillUserUI(currentUser); });
function openMenuSheet(html) { $s('menuSheetBody').innerHTML = html; $s('menuSheet').classList.add('show'); }
function closeMenuSheet() { $s('menuSheet').classList.remove('show'); }
function sheetHead(small, title) { return '<div class="sh-head"><div><small>' + small + '</small><h3>' + title + '</h3></div></div>'; }

/* =========================================================
   1) طلبات العملاء
   ========================================================= */
/* وقت وصول الكابتن للمتجر، حقيقي من موقعه على الخريطة */
function capEtaToStore(o) {
    if (o.status !== 'accepted' || !o.capLoc || Date.now() - (o.capLoc.at || 0) > 180000) return null;
    const st = myState(), sl = o.storeLoc || (st.lat != null ? { lat: st.lat, lng: st.lng } : null); if (!sl) return null;
    const km = HWMap.est([o.capLoc.lat, o.capLoc.lng], [sl.lat, sl.lng]);
    return km < .15 ? 0 : Math.max(1, Math.round(km / ((HW_CONFIG.capKmh || 25) / 60)));
}
/* أيقونة الكابتن بهوية هاي وي: دراجة توصيل بصندوق ليموني (بدل الإيموجي) */
const CAP_IC = '<svg viewBox="0 0 48 48" fill="none" stroke="#0E3A3B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="13" rx="3" fill="#E8EF44"/><path d="M8 16.5h8" stroke-width="2"/><path d="M8 31c0-4.5 3-7 7.5-7H27l-2 7z" fill="#25CED1"/><path d="M27 24l3-10m-2.5 0h6" /><path d="M30 14l6 18"/><circle cx="12" cy="35" r="5" fill="#F5EDE3"/><circle cx="37" cy="35" r="5" fill="#F5EDE3"/><path d="M17 35h15"/></svg>';
/* مؤقت التحضير: حلقة صغيرة تمتلئ (فيروزي ← ليموني ← أحمر عند التأخر) مع الوقت المتبقي */
function prepInfo(o) {
    if (o.storeState !== 'preparing' || o.status === 'picked') return null;
    const h = (o.history || []).filter(x => x.s === 'store_accepted')[0]; if (!h) return null;
    const tot = (o.prepMin || 20) * 60000, el = Date.now() - h.t;
    return { k: Math.min(1, el / tot), left: Math.round((tot - el) / 60000) };
}
function prepRing(o) {
    const p = prepInfo(o); if (!p) return '';
    const col = p.k < .7 ? '#25CED1' : p.k < 1 ? '#E8EF44' : '#E5484D', C = 2 * Math.PI * 15;
    return '<div class="sa-prep' + (p.k >= 1 ? ' late' : '') + '"><span class="prep-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="none" stroke="rgba(14,58,59,.12)" stroke-width="4.5"/><circle cx="18" cy="18" r="15" fill="none" stroke="' + col + '" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="' + (C * p.k).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 18 18)"/></svg></span>' +
        '<div><small>التحضير</small><b>' + (p.left > 0 ? 'باقي ' + p.left + ' د' : p.left === 0 ? 'الآن' : 'متأخر ' + (-p.left) + ' د') + '</b></div></div>';
}
function capLine(o) {
    if (o.status === 'new') return '<div class="sa-cap wait"><span class="sa-ic">' + CAP_IC + '</span><div class="sa-t"><b>نبحث عن كابتن</b><small>سيظهر هنا فور تعيينه</small></div></div>';
    if (!o.captain || o.status !== 'accepted') return '';
    const m = capEtaToStore(o), nm = EH(o.captain.name) + (o.captain.num ? ' <span class="cap-no" dir="ltr">' + EH(o.captain.num) + '</span>' : ''), ph = o.captain.phone ? String(o.captain.phone).replace(/[^\d+]/g, '') : '';
    const sub = m === 0 ? 'وصل تقريبًا · جهّز الطلب' : m == null ? 'في الطريق إليك' : 'في الطريق · يصل ' + EH(HWOrders.fmtTime(Date.now() + m * 60000));
    return '<div class="sa-cap full"><img class="sa-av" src="' + EH(HWBiz.capAv(o.captain)) + '" alt=""><div class="sa-t"><b>' + nm + '</b><small>' + sub + '</small></div>' +
        (m ? '<span class="sa-eta"><b>' + m + '</b><small>د</small></span>' : '') +
        (ph ? '<a class="sa-call" href="tel:' + EH(ph) + '" onclick="event.stopPropagation()" aria-label="اتصال بالكابتن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg></a>' : '') + '</div>';
}
/* عميل لم يستلم طلبين أو أكثر سابقًا: يتصل المطعم للتأكيد قبل التحضير */
function noShowWarn(o) {
    if (!o.needsConfirm) return '';
    const ph = o.customer && o.customer.phone ? String(o.customer.phone).replace(/[^\d+]/g, '') : '';
    return '<div class="ns-warn"><div><b>اتصل بالعميل للتأكيد قبل التحضير</b><small>لم يستلم ' + (o.custNoShows || 2) + ' طلبات سابقة</small></div>' +
        (ph ? '<a class="ns-call" href="tel:' + EH(ph) + '" onclick="event.stopPropagation()">اتصال</a>' : '') + '</div>';
}
function storeActions(o) {
    if (!HWOrders.isMarket(o) || !isStore() || o.status === 'cancelled' || o.status === 'delivered') return '';
    if (o.storeState === 'pending') return noShowWarn(o) + '<button type="button" class="act-btn go" onclick="event.stopPropagation();openAccept(\'' + o.id + '\')">قبول الطلب</button><button type="button" class="act-btn no" onclick="event.stopPropagation();rejectOrder(\'' + o.id + '\')">رفض</button>';
    if (o.storeState === 'preparing' && o.status !== 'picked') return '<div class="sa-wrap">' + capLine(o) + '<div class="sa-row">' + prepRing(o) + '<button type="button" class="act-btn go sa-ready" onclick="event.stopPropagation();markReady(\'' + o.id + '\')">الطلب جاهز</button></div></div>';
    if (o.storeState === 'ready' && o.status !== 'picked') return '<div class="sa-wrap">' + (capLine(o) || '') + '<div class="sa-done">الطلب جاهز، بانتظار الكابتن</div></div>';
    return '';
}
function itemLines(o) {
    return o.items.map(l => '<div><span>' + l.qty + '× ' + EH(l.name) + (l.opts && l.opts.length ? '<small class="op-l">' + EH(HWBiz.optsText(l.opts)) + '</small>' : '') + (l.notes ? '<small class="op-l">ملاحظة: ' + EH(l.notes) + '</small>' : '') + '</span><b>' + MNY(l.price * l.qty) + '</b></div>').join('');
}
function openAccept(id) {
    const o = HWOrders.get(id); if (!o) return;
    if (openSheetId) closeOrderSheet();   /* من نافذة التفاصيل: تُغلق وتظهر بطاقة وقت التحضير فورًا */
    const sug = o.prepMin || myState().prepMin || 20;
    openMenuSheet(sheetHead(EH(o.code), 'كم يحتاج التحضير؟') +
        (o.scheduledFor ? '<div class="sched-note">طلب مجدول للتوصيل ' + EH(HWOrders.fmtTime(o.scheduledFor)) + ' · سيُرسل الكابتن قبل الموعد تلقائيًا</div>' : '') +
        noShowWarn(o) + '<div class="sh-rows">' + itemLines(o) + '</div><div class="prep-grid">' +
        [10, 15, 20, 30, 45].map(m => '<button type="button" class="chip' + (m === sug ? ' on' : '') + '" onclick="acceptOrder(\'' + id + '\',' + m + ')">' + m + ' دقيقة</button>').join('') + '</div>');
}
function acceptOrder(id, m) { closeMenuSheet(); HWOrders.update(id, { storeState: 'preparing', prepMin: m }, 'store_accepted'); buzz(15); HWOrders.toast('تم قبول الطلب، ابدأ التحضير'); }
function rejectOrder(id) { if (confirm('رفض هذا الطلب؟ سيُبلَّغ العميل.')) { HWOrders.update(id, { status: 'cancelled', storeState: 'rejected', cancelReason: 'اعتذر المتجر عن الطلب' }); buzz(15); if (openSheetId) closeOrderSheet(); } }
function markReady(id) { HWOrders.update(id, { storeState: 'ready' }, 'store_ready'); buzz(15); HWOrders.toast('تم إبلاغ الكابتن أن الطلب جاهز'); }

/* تذكرة المطبخ / الكاشير (80 مم) */
function printTicket(id) {
    const o = HWOrders.get(id); if (!o) return;
    const row = (a, b) => '<div class="row"><span>' + a + '</span><b>' + b + '</b></div>';
    HWBiz.printHtml('تذكرة ' + o.code, '<div class="tk"><div class="hd"><b>HIGHWAY</b><small>' + EH(o.storeName || currentUser.label || '') + '</small></div>' +
        '<div class="big">' + EH(o.code) + '</div>' + row('الوقت', HWOrders.fmtTime(o.createdAt)) +
        (o.scheduledFor ? row('موعد التوصيل', HWOrders.fmtTime(o.scheduledFor)) : '') + (o.customer ? row('العميل', EH(o.customer.name)) : '') + '<hr>' +
        o.items.map(l => row(l.qty + '× ' + EH(l.name), MNY(l.price * l.qty)) + (l.opts && l.opts.length ? '<div class="op">' + EH(HWBiz.optsText(l.opts)) + '</div>' : '') + (l.notes ? '<div class="op">ملاحظة: ' + EH(l.notes) + '</div>' : '')).join('') + '<hr>' +
        row('المجموع الفرعي', MNY(o.itemsGross || o.itemsTotal)) + (o.discount ? row('خصم العرض', '−' + MNY(o.discount)) : '') +
        row('المستحق للمتجر (نقدًا من الكابتن)', MNY(o.itemsTotal) + ' د.أ') + (o.notes ? '<hr><div>ملاحظات: ' + EH(o.notes) + '</div>' : '') +
        '<hr><div style="text-align:center;font-size:11px">شكرًا لاختياركم HIGHWAY Delivery</div></div>');
}

/* =========================================================
   2) حالة المتجر وأوقات الدوام
   ========================================================= */
function statusCard() {
    const st = myState(), s = HWBiz.storeStatus(st), paused = s.paused, closed = st.open === false;
    const head = closed ? ['off', 'المتجر مغلق', 'لا يستقبل طلبات حتى تفتحه'] : paused ? ['pause', 'متوقف مؤقتًا', s.label.replace('متوقف مؤقتًا ', '')] :
        !s.open ? ['off', 'خارج أوقات الدوام', s.label + ' · يمكن للعملاء الجدولة'] : ['on', 'المتجر مفتوح', 'يستقبل طلبات العملاء الآن'];
    return '<div class="stc ' + head[0] + '"><div class="st-top"><span class="st-dot"></span><div><b>' + head[1] + '</b><small>' + EH(head[2]) + '</small></div>' +
        '<button type="button" class="sw' + (closed ? '' : ' on') + '" onclick="toggleOpen()" aria-label="فتح أو إغلاق المتجر"></button></div>' +
        (closed ? '' : paused ? '<button type="button" class="st-resume" onclick="setPause(0)">استئناف استقبال الطلبات الآن</button>'
            : '<div class="st-pause"><span>إيقاف مؤقت لضغط العمل:</span>' + [15, 30, 60].map(m => '<button type="button" onclick="setPause(' + m + ')">' + m + ' د</button>').join('') + '</div>') + '</div>';
}
function toggleOpen() { const opening = myState().open === false; stateCol.patch(currentUser.id, { open: opening, pausedUntil: 0 }, true); buzz(); if (!opening) daySummary(true); }

/* ملخص نهاية اليوم: يظهر عند إغلاق المتجر، أو مرة واحدة بعد انتهاء الدوام */
function daySummary(auto) {
    const r = report(HWBiz.periodStart('day')); if (auto && !r.list.length) return;
    const y0 = HWBiz.periodStart('day') - 864e5, y = storeOrders(y0).filter(o => o.createdAt < y0 + 864e5 && o.status === 'delivered');
    const ys = HWBiz.r2(y.reduce((n, o) => n + (Number(o.itemsTotal) || 0), 0)), d = HWBiz.r2(r.sales - ys), top = r.top[0];
    try { localStorage.setItem('hw_sum_' + currentUser.id, new Date().toDateString()); } catch (e) { }
    openMenuSheet(sheetHead(EH(new Date().toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long' })), 'ملخص اليوم') +
        '<div class="ds-hero"><small>مبيعات اليوم</small><b>' + MNY(r.sales) + '<em> د.أ</em></b>' + (y.length || ys ? '<span class="ds-d' + (d < 0 ? ' dn' : '') + '">' + (d >= 0 ? '+' : '−') + MNY(Math.abs(d)) + ' عن أمس</span>' : '') + '</div>' +
        '<div class="ds-k"><div><b>' + r.done.length + '</b><small>طلب مكتمل</small></div><div><b>' + MNY(r.avg) + '</b><small>متوسط الطلب</small></div><div><b>' + (r.acc || '—') + '</b><small>دقيقة للقبول</small></div><div' + (r.lost.length ? ' class="bad"' : '') + '><b>' + r.lost.length + '</b><small>ملغي أو مرفوض</small></div></div>' +
        (top ? '<div class="ds-top"><small>الصنف الأكثر طلبًا</small><b>' + EH(top.name) + '</b><span>' + top.qty + '×</span></div>' : '') +
        (r.rt.n ? '<p class="mut ds-rt">تقييم اليوم ' + r.rt.avg.toFixed(1) + ' من 5 · ' + r.rt.n + ' تقييم</p>' : '') +
        '<button type="button" class="submit-btn" onclick="closeMenuSheet();repPeriod=\'day\';goTo(\'screen-reports\')"><span class="btn-label">التقرير الكامل</span></button>');
}
function maybeDaySummary() {
    if (!isStore()) return; const s = HWBiz.storeStatus(myState());
    if (s.open || s.paused || new Date().getHours() < 12) return;      /* بعد انتهاء الدوام فقط، وليس صباحًا قبل الفتح */
    let seen = ''; try { seen = localStorage.getItem('hw_sum_' + currentUser.id) || ''; } catch (e) { }
    if (seen !== new Date().toDateString() && !$s('menuSheet').classList.contains('show')) daySummary(true);
}
function setPause(min) { stateCol.patch(currentUser.id, { pausedUntil: min ? Date.now() + min * 60000 : 0 }, true); buzz(12); HWOrders.toast(min ? 'تم إيقاف الطلبات ' + min + ' دقيقة' : 'عاد المتجر لاستقبال الطلبات'); }
function setPrep(v) { stateCol.patch(currentUser.id, { prepMin: +v }, true); }
function hoursSummary(h) {
    if (!h || !h.on) return 'مفتوح طوال الوقت (حسب زر الفتح)';
    const today = h.days[new Date().getDay()];
    return 'اليوم: ' + (today && !today.off ? HWBiz.fmtHM(today.o) + ' – ' + HWBiz.fmtHM(today.c) : 'عطلة');
}
function openHours() {
    const h = myState().hours || { on: false, days: {} };
    const d = (i) => h.days[i] || { o: '10:00', c: '23:00', off: false };
    openMenuSheet(sheetHead('حالة المتجر', 'أوقات الدوام الأسبوعية') +
        '<div class="mrow"><div><b>تفعيل أوقات الدوام</b><small class="mut">خارج الدوام يُغلق المتجر تلقائيًا ويمكن للعملاء الجدولة</small></div><button type="button" class="sw' + (h.on ? ' on' : '') + '" id="hrOn" onclick="this.classList.toggle(\'on\')" aria-label="تفعيل"></button></div>' +
        '<div class="hr-list">' + HWBiz.DAYS.map((n, i) => '<div class="hr-row' + (d(i).off ? ' off' : '') + '" data-d="' + i + '"><b>' + n + '</b><input type="time" value="' + d(i).o + '" aria-label="يفتح"><span>إلى</span><input type="time" value="' + d(i).c + '" aria-label="يغلق">' +
            '<button type="button" class="hr-off" onclick="this.closest(\'.hr-row\').classList.toggle(\'off\')">عطلة</button></div>').join('') + '</div>' +
        '<p class="mut" style="margin:8px 0 12px">إذا كان الإغلاق بعد منتصف الليل اكتب وقتًا أصغر من الفتح (مثال: 10:00 إلى 02:00).</p>' +
        '<div class="sh-actions"><button type="button" class="submit-btn" style="flex:1" onclick="saveHours()"><span class="btn-label">حفظ الأوقات</span></button></div>');
}
function saveHours() {
    const days = {};
    document.querySelectorAll('.hr-row').forEach(r => { const t = r.querySelectorAll('input'); days[r.dataset.d] = { o: t[0].value || '10:00', c: t[1].value || '23:00', off: r.classList.contains('off') }; });
    stateCol.patch(currentUser.id, { hours: { on: $s('hrOn').classList.contains('on'), days } }, true);
    closeMenuSheet(); buzz(15); HWOrders.toast('تم حفظ أوقات الدوام');
}

/* =========================================================
   3) المنيو (المحرر المشترك hw-menued.js)
   ========================================================= */
function renderMenuAdmin() {
    const box = $s('menuAdmin'); if (!box) return;
    if (!isStore()) { box.innerHTML = '<div class="empty-orders">إدارة القائمة متاحة لحسابات المتاجر</div>'; return; }
    const st = myState();
    box.innerHTML = statusCard() +
        '<div class="cart-card">' +
        '<div class="mrow"><div><b>وقت التحضير المعتاد</b><small class="mut">يظهر للعميل قبل الطلب</small></div><select id="prepSel" onchange="setPrep(this.value)">' + [10, 15, 20, 30, 45].map(n => '<option value="' + n + '"' + ((st.prepMin || 20) === n ? ' selected' : '') + '>' + n + ' د</option>').join('') + '</select></div>' +
        '<div class="mrow"><div><b>أوقات الدوام</b><small class="mut">' + EH(hoursSummary(st.hours)) + '</small></div><button type="button" class="ghost-btn" onclick="openHours()">تعديل</button></div></div>' +
        '<h3 class="sec-t">المنيو</h3><div id="menuEd"></div>';
    HWMenuEd.render($s('menuEd'), currentUser.id, {});
}
/* =========================================================
   4) الرئيسية للمتجر + التقارير
   ========================================================= */
function storeOrders(from) { return isStore() ? allOrders.filter(o => o.storeId === currentUser.id && HWOrders.isMarket(o) && o.createdAt >= (from || 0)) : []; }
function report(from) {
    const list = storeOrders(from), done = list.filter(o => o.status === 'delivered');
    const lost = list.filter(o => o.status === 'cancelled'), rej = lost.filter(o => o.storeState === 'rejected');
    const sales = HWBiz.r2(done.reduce((n, o) => n + (Number(o.itemsTotal) || 0), 0));
    const disc = HWBiz.r2(done.reduce((n, o) => n + (Number(o.discount) || 0), 0));
    const accT = list.map(o => { const e = (o.history || []).filter(h => h.s === 'store_accepted')[0]; return e ? (e.t - o.createdAt) / 60000 : null; }).filter(x => x != null);
    const items = {}; done.forEach(o => o.items.forEach(l => { const k = l.name; items[k] = items[k] || { name: k, qty: 0, sum: 0 }; items[k].qty += l.qty; items[k].sum += l.price * l.qty; }));
    const hours = new Array(24).fill(0); list.forEach(o => { hours[new Date(o.createdAt).getHours()]++; });
    const rt = HWBiz.storeRating(currentUser.id, list), comments = list.filter(o => o.rating && o.rating.comment).slice(0, 6);
    return { list, done, lost, rej, sales, disc, avg: done.length ? HWBiz.r2(sales / done.length) : 0, acc: accT.length ? Math.round(accT.reduce((a, b) => a + b, 0) / accT.length * 10) / 10 : 0,
        top: Object.keys(items).map(k => items[k]).sort((a, b) => b.qty - a.qty).slice(0, 8), hours, rt, comments };
}
function renderStoreHome() {
    const box = $s('storeToday'); if (!box) return;
    if (!isStore()) { box.innerHTML = ''; return; }
    const r = report(HWBiz.periodStart('day')), s = HWBiz.storeStatus(myState()), ann = HWBiz.announcements('stores');
    box.innerHTML = ann.slice(0, 2).map(a => '<div class="ann-s"><b>' + EH(a.title) + '</b>' + (a.body ? '<small>' + EH(a.body) + '</small>' : '') + '</div>').join('') +
        '<button type="button" class="today-card" onclick="daySummary()"><div class="tc-st ' + (s.open ? 'on' : 'off') + '"><i></i>' + (s.open ? 'مفتوح' : EH(s.paused ? 'متوقف مؤقتًا' : 'مغلق')) + '</div>' +
        '<div class="tc-k"><div><small>مبيعات اليوم</small><b>' + MNY(r.sales) + '<em> د.أ</em></b></div><div><small>طلبات مكتملة</small><b>' + r.done.length + '</b></div><div><small>التقييم</small><b>' + (r.rt.n ? '★ ' + HWBiz.storeRating(currentUser.id, allOrders).avg.toFixed(1) : 'جديد') + '</b></div></div>' +
        '<span class="tc-go"><span>ملخص اليوم والتقارير</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></span></button>';
    maybeDaySummary();
}
function bars(rows, max) { return rows.map(r => '<div class="bar-r"><span>' + r[0] + '</span><i><b style="width:' + (max ? Math.round(r[1] / max * 100) : 0) + '%"></b></i><em>' + r[2] + '</em></div>').join(''); }
const PERIODS = { day: 'اليوم', week: 'آخر ٧ أيام', month: 'هذا الشهر' };
function renderReports() {
    const box = $s('reportBody'); if (!box) return;
    if (!isStore()) { box.innerHTML = '<div class="empty-orders">التقارير متاحة لحسابات المتاجر</div>'; return; }
    const r = report(HWBiz.periodStart(repPeriod)), hmax = Math.max.apply(null, r.hours), tmax = r.top.length ? r.top[0].qty : 0;
    const hrs = r.hours.map((n, h) => [h, n]).filter(x => x[1]);
    box.innerHTML = '<div class="seg rep-seg">' + Object.keys(PERIODS).map(k => '<button type="button" class="' + (k === repPeriod ? 'on' : '') + '" onclick="repPeriod=\'' + k + '\';renderReports()">' + PERIODS[k] + '</button>').join('') + '</div>' +
        '<div class="kpi-grid"><div class="kpi hot"><small>المبيعات (بعد الخصم)</small><b>' + MNY(r.sales) + '</b><em>د.أ</em></div><div class="kpi"><small>طلبات مكتملة</small><b>' + r.done.length + '</b><em>من ' + r.list.length + '</em></div>' +
        '<div class="kpi"><small>متوسط الطلب</small><b>' + MNY(r.avg) + '</b><em>د.أ</em></div><div class="kpi"><small>متوسط وقت القبول</small><b>' + (r.acc || '—') + '</b><em>دقيقة</em></div>' +
        '<div class="kpi"><small>ملغاة / مرفوضة</small><b>' + r.lost.length + '</b><em>' + r.rej.length + ' رفضها المتجر</em></div><div class="kpi"><small>التقييم</small><b>' + (r.rt.n ? r.rt.avg.toFixed(1) : '—') + '</b><em>' + r.rt.n + ' تقييم</em></div></div>' +
        '<div class="cart-card"><b class="rep-h">الأصناف الأكثر طلبًا</b>' + (r.top.length ? bars(r.top.map(t => [EH(t.name), t.qty, t.qty + '×']), tmax) : '<p class="mut">لا توجد مبيعات في هذه الفترة</p>') + '</div>' +
        '<div class="cart-card"><b class="rep-h">أوقات الذروة</b>' + (hrs.length ? bars(hrs.map(x => [(x[0] % 12 || 12) + (x[0] < 12 ? ' ص' : ' م'), x[1], x[1]]), hmax) : '<p class="mut">لا توجد طلبات</p>') + '</div>' +
        (r.comments.length ? '<div class="cart-card"><b class="rep-h">آراء العملاء</b>' + r.comments.map(o => '<div class="cmt"><span>' + HWBiz.stars(o.rating.store) + '</span><p>' + EH(o.rating.comment) + '</p><small>' + EH(o.code) + '</small></div>').join('') + '</div>' : '') +
        (r.disc ? '<p class="mut">خصومات العروض التي تحمّلها المتجر: ' + MNY(r.disc) + ' د.أ</p>' : '') +
        '<button type="button" class="submit-btn" onclick="printReport()"><span class="btn-label">طباعة التقرير</span></button>';
}
function printReport() {
    const r = report(HWBiz.periodStart(repPeriod)), name = currentUser.label || currentUser.id;
    HWBiz.printHtml('تقرير ' + name, HWBiz.reportHead('تقرير المبيعات · ' + PERIODS[repPeriod], EH(name) + ' · ' + new Date().toLocaleDateString('ar-JO')) + '<div class="wrap">' +
        '<div class="kp"><div><small>المبيعات</small><b>' + MNY(r.sales) + '</b></div><div><small>طلبات مكتملة</small><b>' + r.done.length + '</b></div><div><small>متوسط الطلب</small><b>' + MNY(r.avg) + '</b></div><div><small>التقييم</small><b>' + (r.rt.n ? r.rt.avg.toFixed(1) : 'جديد') + '</b></div></div>' +
        '<h2>الطلبات المكتملة</h2><table><thead><tr><th>الطلب</th><th>الوقت</th><th>الأصناف</th><th>الخصم</th><th>المستحق</th></tr></thead><tbody>' +
        r.done.map(o => '<tr><td>' + EH(o.code) + '</td><td>' + new Date(o.createdAt).toLocaleDateString('ar-JO') + ' ' + HWOrders.fmtTime(o.createdAt) + '</td><td>' + o.items.reduce((n, l) => n + l.qty, 0) + '</td><td>' + MNY(o.discount || 0) + '</td><td>' + MNY(o.itemsTotal) + '</td></tr>').join('') +
        '</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>' + MNY(r.disc) + '</td><td>' + MNY(r.sales) + ' د.أ</td></tr></tfoot></table>' +
        (r.top.length ? '<h2>الأصناف الأكثر طلبًا</h2><table><thead><tr><th>الصنف</th><th>الكمية</th><th>القيمة</th></tr></thead><tbody>' + r.top.map(t => '<tr><td>' + EH(t.name) + '</td><td>' + t.qty + '</td><td>' + MNY(t.sum) + '</td></tr>').join('') + '</tbody></table>' : '') +
        '<div class="ft">تقرير صادر من Partner App · HIGHWAY Delivery</div></div>');
}

/* ---------- ربط الشاشات الجديدة بالملف الأساسي ---------- */
(function () {
    const _s = window.showScreen;
    window.showScreen = function (id) { _s(id); if (id === 'screen-menu') renderMenuAdmin(); if (id === 'screen-reports') renderReports(); };
    const _fill = window.fillUserUI;
    window.fillUserUI = function (u) { _fill(u); const t = $s('tabMenu'); if (t) t.style.display = u ? '' : 'none'; renderStoreHome(); };
    const _r = window.renderOrdersUI;
    window.renderOrdersUI = function () { _r(); renderStoreHome(); if (currentScreen_() === 'screen-reports') renderReports(); };
    TAB_OF['screen-reports'] = 'home';
})();
setInterval(() => { if (!document.hidden && isStore() && currentScreen_() === 'screen-menu') renderMenuAdmin(); }, 60000);   // انتهاء الإيقاف المؤقت

/* =========================================================
   5) استدعاء كابتن: اختيار نوع الطلب
   ========================================================= */
/* "اطلب الآن": قائمة مناطق المتجر مباشرة (مع بحث)، أو "وجهة غير محددة"، ثم قيمة الطلب وإرسال */
function openCallChoice() {
    buzz();
    HWDest.open({ sid: currentUser ? currentUser.id : '', sub: 'استدعاء كابتن', title: 'إلى أين؟', onPick: (a) => {
        const me = (currentUser && currentUser.label) || '';
        if (a) openOrderModal('area', { area: a.n, price: a.p, startPoint: me }); else openOrderModal('direct');
    } });
}

/* الإشعارات الحقيقية: طلبات جديدة حتى والتطبيق مغلق */
HWPush.init('store', () => (isStore() ? currentUser.id : ''), { open: (id) => { if (HWOrders.get(id)) openOrderSheet(id); } });
