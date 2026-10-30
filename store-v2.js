/* =========================================================
   Partner App — store-v2.js
   ميزات المتجر الشريك فوق الملف الأساسي (script.js):
   1) طلبات العملاء: قبول/رفض/جاهز + طباعة التذكرة
   2) حالة المتجر: فتح/إغلاق، إيقاف مؤقت، أوقات الدوام الأسبوعية، وقت التحضير
   3) القائمة: التوفر اليومي فقط (إطفاء الصنف، "نفد اليوم").
      الأسماء والأسعار والخيارات والعروض والموقع والصور تديرها الإدارة من لوحتها
   5) التقارير: اليوم / ٧ أيام / الشهر + طباعة
   6) استدعاء كابتن: بوجهة أو بدون وجهة
   يعتمد على: hw-orders.js, hw-biz.js, hw-food.js, hw-map.js
   ========================================================= */
const menusCol = HWDB.col('menus'), stateCol = HWDB.col('storestate');
const EH = HWOrders.esc, MNY = HWOrders.money, $s = (id) => document.getElementById(id);
let _menus = {}, _states = {}, repPeriod = 'day';

function isStore() { return !!(currentUser && currentUser.start); }
function myState() { return (currentUser && _states[currentUser.id]) || {}; }
function refreshStoreUI() { const s = currentScreen_(); if (s === 'screen-menu') renderMenuAdmin(); if (s === 'screen-reports') renderReports(); renderStoreHome(); }
menusCol.subscribe(l => { _menus = {}; l.forEach(m => { _menus[m.id] = m; }); refreshStoreUI(); });
stateCol.subscribe(l => { _states = {}; l.forEach(m => { _states[m.id] = m; }); refreshStoreUI(); });
HWBiz.announcementsCol.subscribe(renderStoreHome);
/* حساب المتجر: إن أوقفته الإدارة يخرج المستخدم فورًا */
HWBiz.storesCol.subscribe((l) => {
    if (!isStore() || !l.length) return;
    const s = l.filter(x => x.id === currentUser.id)[0];
    if (!s || s.active === false) { HWOrders.toast('تم إيقاف حساب المتجر من الإدارة'); setTimeout(logout, 1500); return; }
    if (s.name !== currentUser.label || s.pdfV !== currentUser.pdfV) { Object.assign(currentUser, { label: s.name, pdfV: s.pdfV }); fillUserUI(currentUser); }
});
HWBiz.onMedia((id) => { if (isStore() && id === currentUser.id) fillUserUI(currentUser); });
function openMenuSheet(html) { $s('menuSheetBody').innerHTML = html; $s('menuSheet').classList.add('show'); }
function closeMenuSheet() { $s('menuSheet').classList.remove('show'); }
function sheetHead(small, title) { return '<div class="sh-head"><div><small>' + small + '</small><h3>' + title + '</h3></div></div>'; }

/* =========================================================
   1) طلبات العملاء
   ========================================================= */
function storeActions(o) {
    if (!HWOrders.isMarket(o) || !isStore() || o.status === 'cancelled' || o.status === 'delivered') return '';
    if (o.storeState === 'pending') return '<button type="button" class="act-btn go" onclick="event.stopPropagation();openAccept(\'' + o.id + '\')">قبول الطلب</button><button type="button" class="act-btn no" onclick="event.stopPropagation();rejectOrder(\'' + o.id + '\')">رفض</button>';
    if (o.storeState === 'preparing' && o.status !== 'picked') return '<button type="button" class="act-btn go" onclick="event.stopPropagation();markReady(\'' + o.id + '\')">الطلب جاهز ✓</button>';
    if (o.storeState === 'ready' && o.status === 'new') return '<span class="mut">جاهز، بانتظار الكابتن</span>';
    return '';
}
function itemLines(o) {
    return o.items.map(l => '<div><span>' + l.qty + '× ' + EH(l.name) + (l.opts && l.opts.length ? '<small class="op-l">' + EH(HWBiz.optsText(l.opts)) + '</small>' : '') + (l.notes ? '<small class="op-l">ملاحظة: ' + EH(l.notes) + '</small>' : '') + '</span><b>' + MNY(l.price * l.qty) + '</b></div>').join('');
}
function openAccept(id) {
    const o = HWOrders.get(id); if (!o) return;
    const sug = o.prepMin || myState().prepMin || 20;
    openMenuSheet(sheetHead(EH(o.code), 'كم يحتاج التحضير؟') +
        (o.scheduledFor ? '<div class="sched-note">طلب مجدول للتوصيل ' + EH(HWOrders.fmtTime(o.scheduledFor)) + ' · سيُرسل الكابتن قبل الموعد تلقائيًا</div>' : '') +
        '<div class="sh-rows">' + itemLines(o) + '</div><div class="prep-grid">' +
        [10, 15, 20, 30, 45].map(m => '<button type="button" class="chip' + (m === sug ? ' on' : '') + '" onclick="acceptOrder(\'' + id + '\',' + m + ')">' + m + ' دقيقة</button>').join('') + '</div>');
}
function acceptOrder(id, m) { closeMenuSheet(); HWOrders.update(id, { storeState: 'preparing', prepMin: m }, 'store_accepted'); buzz(15); HWOrders.toast('تم قبول الطلب، ابدأ التحضير'); }
function rejectOrder(id) { if (confirm('رفض هذا الطلب؟ سيُبلَّغ العميل.')) { HWOrders.update(id, { status: 'cancelled', storeState: 'rejected', cancelReason: 'اعتذر المتجر عن الطلب' }); buzz(15); } }
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
function toggleOpen() { stateCol.patch(currentUser.id, { open: myState().open === false, pausedUntil: 0 }, true); buzz(); }
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
   3) القائمة: الأقسام، الأصناف، الخيارات
   ========================================================= */
function myMenu() { return _menus[currentUser.id] || { id: currentUser.id, cats: [] }; }
function saveMenu(m) { m.demo = false; menusCol.replace(currentUser.id, m); }
function renderMenuAdmin() {
    const box = $s('menuAdmin'); if (!box) return;
    if (!isStore()) { box.innerHTML = '<div class="empty-orders">إدارة القائمة متاحة لحسابات المتاجر</div>'; return; }
    const st = myState(), m = myMenu(), now = Date.now();
    box.innerHTML = statusCard() +
        '<div class="cart-card">' +
        '<div class="mrow"><div><b>وقت التحضير المعتاد</b><small class="mut">يظهر للعميل قبل الطلب</small></div><select id="prepSel" onchange="setPrep(this.value)">' + [10, 15, 20, 30, 45].map(n => '<option value="' + n + '"' + ((st.prepMin || 20) === n ? ' selected' : '') + '>' + n + ' د</option>').join('') + '</select></div>' +
        '<div class="mrow"><div><b>أوقات الدوام</b><small class="mut">' + EH(hoursSummary(st.hours)) + '</small></div><button type="button" class="ghost-btn" onclick="openHours()">تعديل</button></div></div>' +
        '<div class="note-card"><b>التوفر اليومي</b><small>أطفئ الصنف إذا نفد أو توقف. لإضافة أصناف أو تغيير الأسعار والعروض تواصل مع HIGHWAY.</small></div>' +
        (m.cats.length ? m.cats.map((c, ci) => '<div class="cart-card"><div class="mrow"><b>' + EH(c.name) + '</b></div>' +
            c.items.map((it, ii) => {
                const out = it.outUntil && it.outUntil > now, on = HWBiz.itemOn(it, now);
                return '<div class="mrow it' + (on ? '' : ' off') + '"><span class="em">' + HWFood.forItem(it.name, it.desc, c.name, '') + '</span><div class="mt"><b>' + EH(it.name) + '</b><small class="mut">' + MNY(it.price) + ' د.أ' + (out ? ' · نفد حتى الغد' : it.on === false ? ' · موقوف' : '') + '</small></div>' +
                    '<button type="button" class="sw sm' + (on ? ' on' : '') + '" onclick="toggleItem(' + ci + ',' + ii + ')" aria-label="التوفر"></button></div>';
            }).join('') + '</div>').join('') : '<div class="empty-orders">لم تُضف الإدارة منيو متجرك بعد</div>');
}
function toggleItem(ci, ii) {
    const m = myMenu(), it = m.cats[ci].items[ii];
    if (!HWBiz.itemOn(it)) { it.on = true; it.outUntil = 0; saveMenu(m); buzz(); HWOrders.toast(it.name + ' متوفر الآن'); return; }
    openMenuSheet(sheetHead(EH(it.name), 'إيقاف الصنف') +
        '<button type="button" class="call-opt y" onclick="setItemOff(' + ci + ',' + ii + ',1)"><span class="co-t"><b>نفد اليوم</b><small>يعود متوفرًا تلقائيًا صباح الغد</small></span></button>' +
        '<button type="button" class="call-opt" onclick="setItemOff(' + ci + ',' + ii + ',0)"><span class="co-t"><b>إيقاف حتى أعيد تفعيله</b><small>يختفي من قائمة العملاء</small></span></button>');
}
function setItemOff(ci, ii, today) {
    const m = myMenu(), it = m.cats[ci].items[ii];
    if (today) { it.outUntil = HWBiz.nextMorning(6); it.on = true; } else { it.on = false; it.outUntil = 0; }
    saveMenu(m); closeMenuSheet(); buzz(12);
}
/* =========================================================
   5) الرئيسية للمتجر + التقارير
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
        '<button type="button" class="today-card" onclick="goTo(\'screen-reports\')"><div class="tc-st ' + (s.open ? 'on' : 'off') + '"><i></i>' + (s.open ? 'مفتوح' : EH(s.paused ? 'متوقف مؤقتًا' : 'مغلق')) + '</div>' +
        '<div class="tc-k"><div><small>مبيعات اليوم</small><b>' + MNY(r.sales) + '<em> د.أ</em></b></div><div><small>طلبات مكتملة</small><b>' + r.done.length + '</b></div><div><small>التقييم</small><b>' + (r.rt.n ? '★ ' + HWBiz.storeRating(currentUser.id, allOrders).avg.toFixed(1) : '—') + '</b></div></div>' +
        '<span class="tc-go">التقارير ←</span></button>';
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
        '<div class="kp"><div><small>المبيعات</small><b>' + MNY(r.sales) + '</b></div><div><small>طلبات مكتملة</small><b>' + r.done.length + '</b></div><div><small>متوسط الطلب</small><b>' + MNY(r.avg) + '</b></div><div><small>التقييم</small><b>' + (r.rt.n ? r.rt.avg.toFixed(1) : '—') + '</b></div></div>' +
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
    window.fillUserUI = function (u) { _fill(u); const t = $s('tabMenu'), r = $s('pfReports'); if (t) t.style.display = u && u.start ? '' : 'none'; if (r) r.style.display = u && u.start ? '' : 'none'; renderStoreHome(); };
    const _r = window.renderOrdersUI;
    window.renderOrdersUI = function () { _r(); renderStoreHome(); if (currentScreen_() === 'screen-reports') renderReports(); };
    TAB_OF['screen-reports'] = 'home';
})();
setInterval(() => { if (!document.hidden && isStore() && currentScreen_() === 'screen-menu') renderMenuAdmin(); }, 60000);   // انتهاء الإيقاف المؤقت

/* =========================================================
   6) استدعاء كابتن: اختيار نوع الطلب
   ========================================================= */
function openCallChoice() {
    const pin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
    const bolt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>';
    openMenuSheet(sheetHead('استدعاء كابتن', 'ما نوع الطلب؟') +
        '<button type="button" class="call-opt" onclick="callWithDest()"><span class="co-ic">' + pin + '</span><span class="co-t"><b>طلب بوجهة محددة</b><small>اختر منطقة التوصيل من قائمة الأسعار</small></span></button>' +
        '<button type="button" class="call-opt y" onclick="callNoDest()"><span class="co-ic">' + bolt + '</span><span class="co-t"><b>طلب بدون وجهة</b><small>كابتن يصلك فورًا وتحدد الوجهة معه</small></span></button>');
}
function callWithDest() { closeMenuSheet(); buzz(); tabGo('screen-prices'); }
function callNoDest() { closeMenuSheet(); buzz(); openOrderModal('direct'); }

/* الإشعارات الحقيقية: طلبات جديدة حتى والتطبيق مغلق */
HWPush.init('store', () => (isStore() ? currentUser.id : ''), { open: (id) => { if (HWOrders.get(id)) openOrderSheet(id); } });
