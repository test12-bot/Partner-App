/* =========================================================
   HIGHWAY Partner App — تطبيق المتاجر الشريكة
   الأساس: الدخول، الشاشة الافتتاحية، قوائم الأسعار، استدعاء كابتن، حاسبة الكيلو، وطلبات المتجر.
   الإضافات (طلبات التطبيق، القائمة، العروض، موقع المتجر) في store-v2.js
   ========================================================= */

try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
window.addEventListener("pageshow", () => window.scrollTo(0, 0));

/* ---------- بيانات الأسعار (من قوائم الأسعار الرسمية PDF) ---------- */
/* p = السعر، وإذا كان نطاقاً يُكتب (الأدنى - الأعلى) ويظهر في الصفحة بنفس شكله في القائمة */
const PRICES = window.HW_PRICES;   // أسعار التوصيل الأصلية (hw-prices.js)، والإدارة تعدّلها من لوحتها

/* ---------- الحالة ---------- */
let currentRegion = '';
let currentStartPoint = '';
let currentStartName = '';
let currentList = [];
let pendingOrderData = {};
let calcState = { dist: '', total: '0.00' };
let screenStack = ['screen-home'];

/* ---------- أيقونات الشاشة الافتتاحية (طعام) ---------- */


function buildSplashIcons() {
    const wrap = document.getElementById('splashIcons');
    const SPL = HWFood.splashSet();   // رسومات الطعام المشتركة (hw-food.js)
    for (let i = 0; i < 18; i++) {
        const el = document.createElement('div');
        el.className = 'float-icon';
        const size = 26 + Math.random() * 34;
        el.style.width = el.style.height = size + 'px';
        el.style.left = (Math.random() * 94) + '%';
        el.style.animationDuration = (9 + Math.random() * 9) + 's';
        el.style.animationDelay = (-Math.random() * 14) + 's';
        el.innerHTML = SPL[(i * 7) % SPL.length];
        wrap.appendChild(el);
    }
}

/* ---------- فيديو الشاشة الافتتاحية بخلفية شفافة ----------
   الفيديو بلا قناة شفافية، فيُعرض عبر WebGL مع حذف لونه التركوازي لحظياً ليظهر الإطار الزجاجي من خلفه.
   لضمان عدم اختفاء اللوجو نهائياً: ننتهي دائماً بصورة اللوجو الثابتة (بنفس مقاس آخر إطار) بدل الاعتماد
   على لوحة WebGL، وننتقل إليها فوراً إذا فشل أي شيء (منع التشغيل التلقائي، فقد سياق WebGL، تأخر الفيديو). */
function initIntroVideo() {
    const video = document.getElementById('splashVideo');
    const canvas = document.getElementById('splashCanvas');
    const card = document.getElementById('splashCard');
    if (!video || !canvas || !card) return null;

    let stopped = false;
    const showStatic = () => {                 // يعرض الصورة الثابتة ويوقف الرسم والفيديو
        stopped = true;
        card.classList.add('static-logo');
        video.pause();
    };

    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) {}
    if (!gl) { showStatic(); return { stop() {} }; }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); showStatic(); });

    const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src); gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER,
        'attribute vec2 p; varying vec2 uv;' +
        'void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.0,1.0); }');
    const fs = compile(gl.FRAGMENT_SHADER,
        'precision mediump float; uniform sampler2D tex; varying vec2 uv;' +
        'const vec3 BG = vec3(33.0,204.0,208.0)/255.0;' +            // لون خلفية الفيديو
        'void main(){' +
        '  vec3 c = texture2D(tex, uv).rgb;' +
        '  float a = clamp((distance(c, BG) - 0.035) / 0.80, 0.0, 1.0);' +
        '  vec3 f = a > 0.001 ? clamp((c - (1.0 - a) * BG) / a, 0.0, 1.0) : vec3(0.0);' +
        '  gl_FragColor = vec4(f * a, a);' +                          // ألوان مضروبة مسبقاً بالشفافية
        '}');
    const prog = gl.createProgram();
    if (!vs || !fs) { showStatic(); return { stop() {} }; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { showStatic(); return { stop() {} }; }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const draw = () => {
        if (video.readyState < 2) return;
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); }
        catch (e) { showStatic(); return; }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    let finished = false;
    const canvasBlank = () => {                                   // هل الصف الأوسط من اللوحة فارغ؟
        if (gl.isContextLost()) return true;
        const row = new Uint8Array(canvas.width * 4);
        gl.readPixels(0, canvas.height >> 1, canvas.width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
        for (let i = 3; i < row.length; i += 4) if (row[i] > 200) return false;
        return true;
    };
    const next = (fn) => (video.requestVideoFrameCallback ? video.requestVideoFrameCallback(fn) : requestAnimationFrame(fn));
    const loop = () => { if (!stopped) { draw(); next(loop); } };

    let began = false;
    const begin = () => { if (!began && !stopped) { began = true; next(loop); } };
    video.addEventListener('playing', begin);
    video.addEventListener('ended', () => { draw(); finished = true; card.classList.add('logo-done'); });   // النهاية: يبقى آخر إطار من الفيديو معروضاً
    // عند العودة للتطبيق: إن فُرغت لوحة الرسم بصمت نعرض الصورة الثابتة (مأخوذة من آخر إطار فلا يتغير شيء)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && finished && !stopped && canvasBlank()) showStatic(); });
    video.addEventListener('error', showStatic);
    if (!video.paused && video.readyState >= 3) begin();       // بدأ التشغيل التلقائي قبل تسجيل المستمعين

    video.muted = true;                                          // مطلوب ليعمل التشغيل التلقائي
    const p = video.play();
    if (p && p.catch) p.catch(showStatic);                       // التشغيل التلقائي ممنوع (مثلاً توفير الطاقة)
    setTimeout(() => { if (!began) showStatic(); }, 2000);       // لم يبدأ الفيديو خلال ثانيتين
    setTimeout(() => { if (!stopped) showStatic(); }, 9000);     // شبكة أمان إن تجمّد الفيديو قبل نهايته

    return { stop() { stopped = true; video.pause(); } };
}

/* ---------- تسجيل الدخول ----------
   ملاحظة: الموقع ثابت (GitHub Pages) فالتحقق يتم داخل المتصفح. كلمات المرور محفوظة كبصمة SHA-256 وليست نصاً صريحاً،
   لكن هذا يمنع الدخول العابر فقط ولا يعتبر حماية حقيقية للبيانات. */
const USERS = [
    {"id": "admin", "names": ["admin"], "hash": "93dbdae2e2db0932575220b3ac8d594f2bc0f913d055129c50f97d69f060737f"},
    {"id": "nafeeseh", "names": ["nafeesehsweets"], "hash": "fbe733c4098d707c547159a094e0dd8c19ff4ee2e291c1b151375562dd6d8495", "label": "حلويات نفيسة", "start": "umm_naaj", "pdf": "highway-price-list-nafeeseh-sweets.pdf"},
    {"id": "hamada", "names": ["hamada", "hamadarestaurant"], "hash": "296697541a161e1ef9b430de8ef2f99e03fccf730f011c243aa48593f3fbb81d", "label": "مطعم حماده", "start": "sarou", "pdf": "highway-price-list-hamada.pdf"},
    {"id": "bullgurz", "names": ["bullgurz"], "hash": "7b40402d842b747ece3a432b164f727a2ffc060e9ed45a2a082953e68408ba2c", "label": "Bullgurz", "start": "sarou", "pdf": "highway-price-list-bullgurz.pdf"},
    {"id": "abuahmad", "names": ["abuahamdalnsourresturantformansaf", "abuahmadalnsourrestaurantformansaf"], "hash": "1c41b5af77c79558c0a85b8ed1e399b7abbed3a98bdf2374ed1bd06f6fe3e420", "label": "مطعم أبو أحمد النسور للمناسف", "start": "sarou", "pdf": "highway-price-list-abu-ahmad-nsour.pdf"},
    {"id": "reef", "names": ["alreefshawarma"], "hash": "dd7d8c10d09c8060c1204030ddc8e50c846cef42caf3d423f3cb733b32299115", "label": "شاورما الريف", "start": "sarou", "pdf": "highway-price-list-al-reef-shawarma.pdf"},
    {"id": "abusaleh", "names": ["abusalehcoffee"], "hash": "cff730ea7641b04c3f370e41c06d80c3312d9a4b9d339142e7b0e789907e07d0", "label": "قهوة أبو صالح", "start": "sarou", "pdf": "highway-price-list-abu-saleh-coffee.pdf"},
    {"id": "gulf", "names": ["gulfrestaurant"], "hash": "a72741290d3a7e4e653853b2af3d67f2256e19236e85d9d42b6debd829b31306", "label": "مطعم الخليج", "start": "sarou", "pdf": "highway-price-list-gulf-restaurant.pdf"},
    {"id": "julnar", "names": ["julnarpastries"], "hash": "cd351c245ecdb1836f396287440277d8452e03e05a14a334f9d9301b46a4410a", "label": "معجنات جلنار", "start": "sarou", "pdf": "highway-price-list-julnar-pastries.pdf"},
];

const SESSION_KEY = 'hw-user';
let currentUser = null;          // null = لا أحد، وغير ذلك سجل المستخدم من USERS

function normUser(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

/* SHA-256 (تعمل حتى إن لم يتوفر crypto.subtle) */
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

/* حسابات المتاجر تديرها الإدارة (مجموعة stores في قاعدة البيانات).
   USERS أعلاه احتياط فقط قبل أن تنقل الإدارة المتاجر لقاعدة البيانات، ولحساب admin */
function storeUser(s) { return { id: s.id, names: [normUser(s.user)].concat(s.alias || []), hash: s.hash, label: s.name, start: s.start || 'sarou', pdf: s.pdf || '', active: s.active !== false }; }
function allUsers() {
    const list = HWBiz.storesCol.list(), db = list.filter(s => s.user && s.hash).map(storeUser);
    return list.length ? db.concat(USERS.filter(u => !u.start)) : USERS;   // بعد النقل: المتاجر من قاعدة البيانات فقط
}
function findUserByName(name) {
    const n = normUser(name);
    return n ? allUsers().find(u => u.names.includes(n)) || null : null;
}
function readSession() {
    let id = null, cached = null;
    try { id = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY); cached = JSON.parse(localStorage.getItem(SESSION_KEY + '-obj') || 'null'); } catch (e) {}
    const u = allUsers().find(x => x.id === id) || (cached && cached.id === id ? cached : null);   // قبل تحميل قاعدة البيانات: آخر نسخة محفوظة
    return u && u.active !== false ? u : null;
}
function saveSession(user, remember) {
    try {
        localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, user.id);
        localStorage.setItem(SESSION_KEY + '-obj', JSON.stringify(user));
    } catch (e) {}
}
function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY + '-obj'); } catch (e) {}
}

/* تطبيق المستخدم على الواجهة: الترحيب + شكل قوائم الأسعار */
function applyUser(user) {
    currentUser = user;
    document.getElementById('homeTitle').textContent = user && user.label ? `أهلًا بك، ${user.label}` : 'أهلًا بك';
    document.getElementById('saltDesc').textContent = user && user.start
        ? 'قائمة أسعار التوصيل لمناطق السلط'
        : 'قائمة أسعار مستقلة لكل من السرو وأم النعاج';
    document.getElementById('userWrap').style.display = user ? '' : 'none';
    if (user) fillUserUI(user);
    closeUserMenu();
    document.body.classList.toggle('authed', !!user);          // التطبيق مخفي قبل تسجيل الدخول
    document.getElementById('appShell').inert = !user;         // ولا يمكن الوصول إليه بالكيبورد أيضاً
}

/* ---------- الحساب: الصورة، القائمة، صفحة الملف الشخصي ---------- */
const ADMIN_NAME = 'HIGHWAY Delivery';
function userName(u) { return u.label || ADMIN_NAME; }
function userRole(u) { return u.start ? 'متجر شريك' : 'مسؤول النظام'; }

function setAvatar(img, u) {
    img.onerror = () => { img.onerror = null; img.src = 'logo-icon.png'; };
    img.src = u.start ? HWBiz.logo(u.id) : `avatars/${u.id}.jpg`;   // شعار المتجر ترفعه الإدارة
}

function fillUserUI(u) {
    setAvatar(document.getElementById('avatarImg'), u);
    setAvatar(document.getElementById('umImg'), u);
    setAvatar(document.getElementById('pfImg'), u);
    document.getElementById('umName').textContent = userName(u);
    document.getElementById('umRole').textContent = userRole(u);
    document.getElementById('pfName').textContent = userName(u);
    document.getElementById('pfHandle').textContent = '@' + u.names[0];
    document.getElementById('pfChip').textContent = userRole(u);
    document.getElementById('pfUser').textContent = u.names[0];
    document.getElementById('pfType').textContent = userRole(u);
    document.getElementById('pfStart').textContent = u.start ? START_LABELS[u.start] : 'السرو وأم النعاج';
    const pdf = document.getElementById('pfPdf'), has = u.start ? HWBiz.hasPdf(u.id) : false;
    pdf.style.display = has ? '' : 'none';
    pdf.href = u.pdf || '#';
    pdf.onclick = has ? (e) => { e.preventDefault(); HWBiz.openPdf(u.id); } : null;
}

function closeUserMenu() {
    const m = document.getElementById('userMenu'), b = document.getElementById('avatarBtn');
    if (!m) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); m.inert = true;
    b.setAttribute('aria-expanded', 'false');
}
function toggleUserMenu() {
    const m = document.getElementById('userMenu');
    if (m.classList.contains('open')) return closeUserMenu();
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false'); m.inert = false;
    document.getElementById('avatarBtn').setAttribute('aria-expanded', 'true');
}
function openProfile() {
    closeUserMenu();
    if (currentUser) goTo('screen-profile');
}

/* الإطار الزجاجي يكبر ليظهر نموذج الدخول، وزر الرجوع يعيد الشاشة الافتتاحية كما كانت */
let introCtl = null;
function setLoginFocusable(on) {
    document.querySelectorAll('#loginPanel input, #loginPanel button, #loginBack').forEach(el => el.tabIndex = on ? 0 : -1);
    document.getElementById('loginPanel').setAttribute('aria-hidden', on ? 'false' : 'true');
}
function openLogin() {
    document.getElementById('splash').classList.add('login-mode');
    setLoginFocusable(true);
    if (window.matchMedia('(hover:hover)').matches) setTimeout(() => document.getElementById('loginUser').focus(), 650);
}
function closeLogin() {
    document.getElementById('splash').classList.remove('login-mode');
    setLoginFocusable(false);
    document.getElementById('loginError').textContent = '';
    ['loginUserField', 'loginPassField'].forEach(id => document.getElementById(id).classList.remove('invalid'));
    document.getElementById('loginPass').value = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}
function finishLogin() {
    document.getElementById('splash').classList.add('hide');
    if (introCtl) setTimeout(introCtl.stop, 800);
}

async function submitLogin(ev) {
    ev.preventDefault();
    const err = document.getElementById('loginError');
    const nameEl = document.getElementById('loginUser');
    const passEl = document.getElementById('loginPass');
    const btn = document.getElementById('loginBtn');
    err.textContent = '';
    ['loginUserField', 'loginPassField'].forEach(id => document.getElementById(id).classList.remove('invalid'));

    if (!nameEl.value.trim()) { document.getElementById('loginUserField').classList.add('invalid'); err.textContent = 'الرجاء إدخال اسم المستخدم'; return; }
    if (!passEl.value) { document.getElementById('loginPassField').classList.add('invalid'); err.textContent = 'الرجاء إدخال كلمة المرور'; return; }

    btn.classList.add('loading');
    await new Promise(r => setTimeout(r, 350));
    await HWBiz.storesCol.ready();
    const user = findUserByName(nameEl.value);
    const ok = user && sha256(`HIGHWAY|${user.id}|${passEl.value}`) === user.hash;
    btn.classList.remove('loading');
    if (ok && user.active === false) { err.textContent = 'الحساب موقوف، تواصل مع HIGHWAY'; passEl.value = ''; return; }

    if (!ok) {
        document.getElementById('loginUserField').classList.add('invalid');
        document.getElementById('loginPassField').classList.add('invalid');
        err.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        passEl.value = '';
        return;
    }
    saveSession(user, document.getElementById('loginRemember').checked);
    passEl.value = '';
    applyUser(user);
    resetAndGo('screen-home');
    finishLogin();
}

function togglePass() {
    const p = document.getElementById('loginPass');
    const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    document.getElementById('passToggle').setAttribute('aria-label', show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
    document.getElementById('passToggle').classList.toggle('on', show);
}

function logout() {
    clearSession();
    location.reload();
}

/* ---------- التنقل ---------- */
function showScreen(id) {
    closeUserMenu();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('headerBack').classList.toggle('show', id !== 'screen-home');
    syncTabs(id);
    window.scrollTo({ top: 0, behavior: 'auto' });
    // كل صفحة تُفتح "نظيفة" كأنها حُمّلت من جديد
    const q = document.getElementById('searchInput');
    if (q && id === 'screen-list' && q.value) { q.value = ''; if (typeof filterList === 'function') filterList(); }
}

/* الضغط على اللوجو: إعادة تحميل الموقع (بدون إعادة شاشة الدخول) */
function reloadSite() {
    try { sessionStorage.setItem('hw-skip-splash', '1'); } catch (e) {}
    location.reload();
}

function goTo(id) {
    if (screenStack[screenStack.length - 1] !== id) screenStack.push(id);
    showScreen(id);
}

function goBack() {
    if (screenStack.length > 1) {
        screenStack.pop();
        showScreen(screenStack[screenStack.length - 1]);
    }
}

function resetAndGo(id) {
    screenStack = ['screen-home'];
    if (id !== 'screen-home') screenStack.push(id);
    showScreen(id);
}

function setRegion(region) {
    currentRegion = region;
    if (currentUser && currentUser.start) {      // متجر: نقطة البدء ثابتة، لا نعرض الخيارات
        selectStartPoint(currentUser.start);
        return;
    }
    goTo('screen-start');
}

function selectStartPoint(point) {
    currentStartPoint = point;
    generateList();
    goTo('screen-list');
}

/* ---------- الترتيب الأبجدي (كأن "ال" التعريف غير موجودة) ---------- */
function sortKey(name) {
    return String(name)
        .replace(/[ً-ٰٟ]/g, '')   // التشكيل
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/[()]/g, ' ')
        .trim()
        .split(/\s+/)
        .map(w => (w.length > 3 && w.startsWith('ال')) ? w.slice(2) : w)
        .join(' ');
}

function compareNames(a, b) {
    const ka = sortKey(a.n), kb = sortKey(b.n);
    return ka < kb ? -1 : (ka > kb ? 1 : 0);
}

/* ---------- القائمة ---------- */
const START_LABELS = { sarou: 'السرو', umm_naaj: 'أم النعاج' };
const PDF_FILES = { sarou: 'highway-price-list-saro.pdf', umm_naaj: 'highway-price-list-umm-naaj.pdf' };
const REGION_TITLES ={ salt: 'التوصيل لمناطق السلط', amman: 'التوصيل لمناطق عمان' };

function generateList() {
    // كل نقطة انطلاق لها قائمتها الخاصة (السرو / أم النعاج)
    const source = HWBiz.priceList(currentStartPoint, currentRegion, (PRICES[currentStartPoint] || {})[currentRegion] || []);
    currentList = [...source].sort(compareNames);

    currentStartName = (currentUser && currentUser.label) || START_LABELS[currentStartPoint];

    document.getElementById('listTitle').textContent = REGION_TITLES[currentRegion];
    document.getElementById('listSub').innerHTML =
        `<span class="route-pill ${currentStartPoint === 'sarou' ? 'sarou' : 'umm'}">` +
        `<i class="dot"></i>قائمة أسعار ${currentStartName}</span>`;
    document.getElementById('searchInput').value = '';

    // زر الطباعة / التحميل: قائمة الأسعار الرسمية (PDF) الخاصة بنقطة الانطلاق المختارة
    const pl = document.getElementById('pdfLink');
    pl.href = (currentUser && currentUser.pdf) || PDF_FILES[currentStartPoint];
    pl.onclick = currentUser && currentUser.start && HWBiz.hasPdf(currentUser.id) ? (e) => { e.preventDefault(); HWBiz.openPdf(currentUser.id); } : null;

    skeletonList();
    clearTimeout(window.__sk);
    window.__sk = setTimeout(() => renderList(currentList), 260);
}

function skeletonList() {
    document.getElementById('pricesContainer').innerHTML = Array.from({ length: 7 }, () => '<div class="sk-row"><span class="sk-a"></span><span class="sk-b"></span></div>').join('');
}

function renderList(list) {
    const container = document.getElementById('pricesContainer');
    container.innerHTML = '';

    if (!list.length) {
        container.innerHTML = '<div class="empty-state">لا توجد نتائج مطابقة</div>';
        return;
    }

    list.forEach(item => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'price-row';
        el.innerHTML = `
            <span class="nm">
                <span class="item-name">${item.n}</span>
            </span>
            <span class="item-price">${item.p}</span>
        `;
        el.addEventListener('click', () => {
            openOrderModal('area', { area: item.n, price: item.p, startPoint: currentStartName });
        });
        container.appendChild(el);
    });
}

function filterList() {
    const raw = document.getElementById('searchInput').value.trim();
    const q = sortKey(raw);
    if (!q) { renderList(currentList); return; }
    // البحث يتجاهل "ال" التعريف والهمزات
    renderList(currentList.filter(item => sortKey(item.n).includes(q) || item.n.includes(raw)));
}

/* ---------- الحاسبة ---------- */
const KM_PRICE = 0.35;   // سعر الكيلومتر بدون فتحة عداد
const MIN_FARE = 1.50;   // أقل سعر توصيل

function calculateTotal() {
    const input = document.getElementById('distanceInput');
    const resDisplay = document.getElementById('calcResult');
    const minNote = document.getElementById('minFareNote');
    const dist = parseFloat(input.value);

    document.getElementById('distanceField').classList.remove('invalid');

    if (isNaN(dist) || dist <= 0) {
        calcState = { dist: '', total: '0.00' };
        resDisplay.innerHTML = '0.00 <small>JOD</small>';
        minNote.classList.remove('show');
        return;
    }
    const raw = dist * KM_PRICE;
    const total = Math.max(raw, MIN_FARE).toFixed(2);
    calcState = { dist: input.value, total };
    resDisplay.innerHTML = total + ' <small>JOD</small>';
    minNote.classList.toggle('show', raw < MIN_FARE);   // تنبيه عند تطبيق الحد الأدنى
}

/* ---------- نافذة تفاصيل الطلب ---------- */
const escHtml = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function openOrderModal(type, data = {}) {
    if (type === 'calc') {
        const dist = parseFloat(document.getElementById('distanceInput').value);
        if (isNaN(dist) || dist <= 0) {
            document.getElementById('distanceField').classList.add('invalid');
            document.getElementById('distanceInput').focus();
            return;
        }
    }

    pendingOrderData = { type, ...data };
    document.getElementById('modalOrderValue').value = '';
    document.getElementById('modalOrderNotes').value = '';

    const summary = document.getElementById('modalSummary');
    if (type === 'area') {
        summary.style.display = 'flex';
        summary.innerHTML =
            `<div class="rt"><i></i><small>من</small><b>${escHtml(data.startPoint)}</b></div>` +
            `<div class="rt end"><i></i><small>إلى</small><b>${escHtml(data.area)}</b></div>` +
            `<div class="rt-price">${escHtml(data.price)} دينار</div>`;
    } else if (type === 'calc') {
        summary.style.display = 'flex';
        summary.innerHTML =
            `<div class="rt"><i></i><small>المسافة</small><b>${escHtml(calcState.dist)} كم</b></div>` +
            `<div class="rt-price">${escHtml(calcState.total)} JOD</div>`;
    } else {
        summary.style.display = 'none';
        summary.innerHTML = '';
    }

    document.getElementById('orderModal').classList.add('show');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('show');
}

function submitOrder() {
    const val = document.getElementById('modalOrderValue').value.trim() || "غير محدد";
    const notes = document.getElementById('modalOrderNotes').value.trim() || "لا يوجد";
    let baseMsg = "";
    let refText = "";

    if (pendingOrderData.type === 'direct') {
        baseMsg = `مرحباً، أود استدعاء كابتن من فضلك.`;
    } else if (pendingOrderData.type === 'area') {
        baseMsg = `مرحباً HIGHWAY Delivery، أريد طلب كابتن:\n- نقطة البدء: ${pendingOrderData.startPoint}\n- الوجهة: ${pendingOrderData.area}\n- السعر: ${pendingOrderData.price} دينار`;
        refText = `${pendingOrderData.startPoint} ← ${pendingOrderData.area}`;
    } else if (pendingOrderData.type === 'calc') {
        baseMsg = `مرحباً، طلب كابتن (حساب بالكيلو):\n- المسافة: ${calcState.dist} كم\n- السعر التقديري: ${calcState.total} JOD`;
        refText = `${calcState.dist} كم • ${calcState.total} JOD`;
    }

    const finalMsg = `${baseMsg}\n- قيمة الطلب: ${val}\n- ملاحظات: ${notes}`;
    const url = `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;
    window.open(url, '_blank');

    const isArea = pendingOrderData.type === 'area', isCalc = pendingOrderData.type === 'calc';
    const myName = (currentUser && currentUser.label) || 'HIGHWAY Delivery';
    HWOrders.create({
        source: 'store', storeId: currentUser ? currentUser.id : 'guest', storeName: myName, kind: pendingOrderData.type,
        from: isArea ? pendingOrderData.startPoint : myName,
        to: isArea ? pendingOrderData.area : isCalc ? 'حسب المسافة (' + calcState.dist + ' كم)' : '',
        price: isArea ? pendingOrderData.price : isCalc ? calcState.total : '',
        distance: isCalc ? calcState.dist : '',
        orderValue: val === 'غير محدد' ? '' : val, notes: notes === 'لا يوجد' ? '' : notes
    });

    closeOrderModal();

    const ref = document.getElementById('successRef');
    if (refText) {
        ref.textContent = refText;
        ref.style.display = 'inline-block';
    } else {
        ref.style.display = 'none';
    }
    resetAndGo('screen-home');
    HWOrders.toast('تم تسجيل طلبك وإرساله لفريق العمليات');
    buzz(18);
}

/* ---------- نافذة قيد التجهيز ---------- */
function showConstruction() {
    document.getElementById('constructionModal').classList.add('show');
}
function closeConstruction() {
    document.getElementById('constructionModal').classList.remove('show');
}


/* ---------- سلوك التطبيق: الشريط السفلي، الاهتزاز، حالة الطلب ---------- */
const TAB_OF = { 'screen-menu': 'menu', 'screen-home': 'home', 'screen-success': 'home', 'screen-prices': 'prices', 'screen-start': 'prices', 'screen-list': 'prices', 'screen-calc': 'prices', 'screen-contact': 'home', 'screen-orders': 'orders', 'screen-profile': 'profile' };
function syncTabs(id) {
    document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === TAB_OF[id];
        t.classList.toggle('on', on);
        if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
}
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }
function tabGo(id) {
    buzz();
    if (id === 'screen-home') { resetAndGo('screen-home'); return; }
    screenStack = ['screen-home', id];
    showScreen(id);
}

/* البطاقة المختارة: خط بلون الهوية ثم الانتقال */
document.addEventListener('click', (e) => {
    const el = e.target.closest('.action-card, .rest-card, .price-row');
    if (!el || el.dataset.go === '1' || el.classList.contains('picked')) return;
    if (el.tagName === 'A' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.classList.add('picked'); setTimeout(() => el.classList.remove('picked'), 600); return; }
    e.preventDefault(); e.stopPropagation();
    el.classList.add('picked'); buzz(8);
    const par = el.parentElement; if (par) par.classList.add('pick-dim');
    setTimeout(() => {
        el.dataset.go = '1'; el.click(); delete el.dataset.go;
        setTimeout(() => { el.classList.remove('picked'); if (par) par.classList.remove('pick-dim'); }, 60);
    }, 130);
}, true);

/* ---------- تشغيل ---------- */
document.addEventListener('DOMContentLoaded', () => {
    buildSplashIcons();
    let skipSplash = false;
    try { skipSplash = sessionStorage.getItem('hw-skip-splash') === '1'; sessionStorage.removeItem('hw-skip-splash'); } catch (e) {}

    const saved = readSession();
    applyUser(saved);
    if (!saved) skipSplash = false;          // بدون مستخدم لا نتخطى الشاشة الافتتاحية (فهي تحمل تسجيل الدخول)
    const splash = document.getElementById('splash');
    if (skipSplash) { splash.style.transition = 'none'; splash.classList.add('hide'); }

    introCtl = skipSplash ? null : initIntroVideo();
    document.getElementById('loginForm').addEventListener('submit', submitLogin);
    document.getElementById('enterBtn').addEventListener('click', () => {
        if (saved) finishLogin();            // مستخدم محفوظ: يدخل مباشرة
        else openLogin();                    // غيره: الإطار الزجاجي يكبر لتسجيل الدخول
    });

    // صفحة مستعادة من ذاكرة المتصفح، أو تسجيل خروج/دخول من تبويب آخر: نعيد التحميل كي لا تظهر حالة قديمة
    window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });
    window.addEventListener('storage', (e) => { if (e.key === SESSION_KEY) location.reload(); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (splash.classList.contains('login-mode') && !splash.classList.contains('hide')) closeLogin();
            closeOrderModal();
            closeConstruction();
            closeOrderSheet();
            closeUserMenu();
        }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#userWrap')) closeUserMenu(); });
});


/* =========================================================
   الطلبات الحية: إحصاءات، الطلبات الحالية، تفاصيل الكابتن
   ========================================================= */
let allOrders = [], prevStatus = null, ordFilter = 'active', openSheetId = null;
const dismissedLive = {};

const iconBox = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>';

function myOrders() {
    if (!currentUser) return [];
    return currentUser.start ? allOrders.filter(o => o.storeId === currentUser.id) : allOrders;   // المدير يرى الجميع
}
const ST_MSG = {
    accepted: (o) => 'الكابتن ' + ((o.captain && o.captain.name) || '') + ' في الطريق لاستلام طلبك ' + o.code,
    picked: (o) => 'تم استلام طلبك ' + o.code + ' وهو في الطريق للتسليم',
    delivered: (o) => 'تم تسليم الطلب ' + o.code + ' ✓',
    cancelled: (o) => 'تم إلغاء الطلب ' + o.code
};

function onOrders(list) {
    allOrders = list;
    const mine = myOrders();
    if (prevStatus) {
        mine.forEach(o => {
            const was = prevStatus[o.id];
            if (was && was !== o.status && ST_MSG[o.status]) { HWOrders.toast(ST_MSG[o.status](o)); HWNotify.play('status'); buzz(24); delete dismissedLive[o.id]; }
        });
    }
    if (prevStatus) mine.forEach(o => { if (!(o.id in prevStatus) && HWOrders.isMarket(o) && o.storeState === 'pending' && currentUser && currentUser.start) { HWOrders.toast('طلب جديد ' + o.code + ' بانتظار قبولك'); HWNotify.notify('HIGHWAY · طلب جديد', o.code + ' بانتظار قبولك'); } });
    prevStatus = {}; mine.forEach(o => { prevStatus[o.id] = o.status; });
    renderOrdersUI();
}

function renderOrdersUI() {
    const mine = myOrders(), st = HWOrders.stats(mine), act = mine.filter(HWOrders.isActive);
    const hs = document.getElementById('homeStats');
    if (hs) hs.innerHTML = '<div class="stat"><b>' + st.today + '</b><small>طلبات اليوم</small></div>' +
        '<div class="stat hot"><b>' + st.active + '</b><small>قيد التنفيذ</small></div>' +
        '<div class="stat"><b>' + st.delivered + '</b><small>تم تسليمها</small></div>';
    const ha = document.getElementById('homeActive');
    if (ha) ha.innerHTML = act.length
        ? '<div class="sec-head"><div class="sec-label">الطلبات الحالية</div><button class="sec-more" type="button" onclick="tabGo(\'screen-orders\')">عرض الكل ←</button></div>' + act.slice(0, 3).map(o => HWOrders.card(o, storeActions(o), !currentUser.start)).join('')
        : '';
    const badge = document.getElementById('tabBadge');
    if (badge) { badge.textContent = act.length; badge.classList.toggle('on', act.length > 0); }

    const os = document.getElementById('ordStats');
    if (os) os.innerHTML = '<div class="stat"><b>' + st.today + '</b><small>طلبات اليوم</small></div>' +
        '<div class="stat hot"><b>' + st.active + '</b><small>قيد التنفيذ</small></div>' +
        '<div class="stat"><b>' + st.delivered + '</b><small>تم تسليمها اليوم</small></div>' +
        '<div class="stat"><b>' + st.fees.toFixed(2) + '</b><small>أجور اليوم (تقديرية)</small></div>';
    const doneCount = mine.filter(o => !HWOrders.isActive(o)).length;
    document.querySelectorAll('#ordSeg button').forEach(b => {
        const f = b.dataset.f, n = f === 'active' ? act.length : f === 'done' ? doneCount : mine.length;
        b.classList.toggle('on', f === ordFilter);
        b.innerHTML = b.textContent.replace(/\d+$/, '').trim() + '<i>' + n + '</i>';
    });
    const list = ordFilter === 'active' ? act : ordFilter === 'done' ? mine.filter(o => !HWOrders.isActive(o)) : mine;
    const ol = document.getElementById('ordList');
    if (ol) ol.innerHTML = list.length ? list.map(o => HWOrders.card(o, storeActions(o), !currentUser.start)).join('')
        : '<div class="empty-orders">' + iconBox + (ordFilter === 'active' ? 'لا توجد طلبات حالية الآن' : 'لا توجد طلبات هنا بعد') + '</div>';

    renderLive(act);
    if (openSheetId) renderSheet(openSheetId);
}

/* شريط الحالة العائم */
function liveSteps(o) { return o.status === 'new' ? 0 : o.status === 'accepted' ? 1 : o.status === 'picked' ? 2 : 3; }
function renderLive(act) {
    const bar = document.getElementById('liveBar'); if (!bar) return;
    const o = act.filter(x => dismissedLive[x.id] !== x.status)[0];
    const show = !!o && currentScreen_() !== 'screen-orders';
    bar.classList.toggle('show', show); document.body.classList.toggle('has-live', show);
    if (!o) return;
    bar.dataset.id = o.id;
    document.getElementById('lvTitle').textContent = HWOrders.isMarket(o) && o.storeState === 'pending' ? 'طلب جديد بانتظار قبولك' :
        HWOrders.isMarket(o) && o.status === 'new' ? HWOrders.label(o) :
        o.status === 'new' ? 'طلبك بانتظار كابتن' :
        o.status === 'accepted' ? 'الكابتن ' + ((o.captain && o.captain.name) || '') + ' في الطريق للمتجر' : 'طلبك في الطريق للتسليم';
    document.getElementById('lvSub').textContent = o.code + ' · ' + (o.to ? o.from + ' ← ' + o.to : o.from);
    const n = liveSteps(o);
    document.querySelectorAll('#lvTrack span').forEach((s, i) => { s.className = i < n ? 'done' : i === n ? 'act' : ''; });
}
function currentScreen_() { const a = document.querySelector('.screen.active'); return a ? a.id : ''; }
function hideLive(e) { if (e) e.stopPropagation(); const id = document.getElementById('liveBar').dataset.id; const o = HWOrders.get(id); if (o) dismissedLive[id] = o.status; renderOrdersUI(); }
function liveOpen(e) { if (e.target.closest('.lv-x')) return; openOrderSheet(document.getElementById('liveBar').dataset.id); }

/* تفاصيل الطلب */
function openOrderSheet(id) { openSheetId = id; renderSheet(id); document.getElementById('orderSheet').classList.add('show'); }
function closeOrderSheet() { openSheetId = null; document.getElementById('orderSheet').classList.remove('show'); }
function renderSheet(id) {
    const o = HWOrders.get(id), body = document.getElementById('orderSheetBody');
    if (!o) { closeOrderSheet(); return; }
    const rows = [['وقت الطلب', HWOrders.fmtTime(o.createdAt)]];
    if (o.orderValue) rows.push(['قيمة الطلب', o.orderValue + ' د.أ']);
    if (o.price) rows.push(['رسوم التوصيل', o.price + ' دينار']);
    if (o.notes) rows.push(['ملاحظات', o.notes]);
    if (o.discount) rows.push(['خصم العرض', '−' + HWOrders.money(o.discount) + ' د.أ' + (o.offerTitle ? ' (' + o.offerTitle + ')' : '')]);
    if (o.promoCode) rows.push(['كود خصم (على HIGHWAY)', o.promoCode + ' · −' + HWOrders.money(o.promoAmount) + ' د.أ']);
    if (o.scheduledFor) rows.push(['موعد التوصيل', 'مجدول ' + HWOrders.fmtTime(o.scheduledFor)]);
    if (o.rating) rows.push(['تقييم العميل', HWBiz.stars(o.rating.store) + (o.rating.comment ? ' · ' + o.rating.comment : '')]);
    const ph = o.captain && o.captain.phone ? String(o.captain.phone).replace(/[^\d+]/g, '') : '';
    body.innerHTML =
        '<div class="sh-head"><div><small>تفاصيل الطلب</small><h3>' + HWOrders.esc(o.code) + '</h3></div><span class="oc-chip" style="' + '' + '">' + HWOrders.SHORT[o.status] + '</span></div>' +
        '<div class="s-' + o.status + '">' + HWOrders.routeRows(o).replace('oc-route', 'oc-route') + '</div>' +
        HWOrders.timeline(o) + HWOrders.captainRow(o, true) +
        '<div class="sh-rows">' + rows.map(r => '<div><span>' + r[0] + '</span><b>' + HWOrders.esc(r[1]) + '</b></div>').join('') + '</div>' +
        (HWOrders.isMarket(o) ? '<div class="sh-rows">' + itemLines(o) + (o.customer ? '<div><span>العميل</span><b>' + HWOrders.esc(o.customer.name) + '</b></div>' : '') + '</div>' + (storeActions(o) ? '<div class="oc-actions" style="margin-top:10px">' + storeActions(o) + '</div>' : '') : '') +
        '<div class="sh-actions">' + (HWOrders.isMarket(o) && currentUser.start ? '<button type="button" class="ghost-btn" onclick="printTicket(\'' + o.id + '\')">طباعة التذكرة</button>' : '') + (o.status === 'new' && !HWOrders.isMarket(o) ? '<button type="button" class="ghost-btn dng" onclick="cancelOrder(\'' + o.id + '\')">إلغاء الطلب</button>' : '') +
        '<button type="button" class="ghost-btn" style="flex:1" onclick="closeOrderSheet()">إغلاق</button></div>';
    body.className = 'modal-card glass s-' + o.status;
}
function cancelOrder(id) {
    const o = HWOrders.get(id);
    if (o && o.status === 'new' && confirm('إلغاء هذا الطلب؟')) { HWOrders.update(id, { status: 'cancelled' }); closeOrderSheet(); HWOrders.toast('تم إلغاء الطلب'); }
}

document.addEventListener('click', (e) => {
    const c = e.target.closest('.oc');
    if (c && !e.target.closest('a')) { buzz(); openOrderSheet(c.dataset.id); }
    const sg = e.target.closest('#ordSeg button');
    if (sg) { ordFilter = sg.dataset.f; buzz(); renderOrdersUI(); }
});
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('oc')) { e.preventDefault(); openOrderSheet(e.target.dataset.id); } });
setInterval(() => { if (!document.hidden && allOrders.length) renderOrdersUI(); }, 30000);   // تحديث "قبل X د"

document.addEventListener('DOMContentLoaded', () => {
    HWOrders.subscribe(onOrders);
    const _show = window.showScreen;
    window.showScreen = function (id) { _show(id); renderOrdersUI(); };
});

/* ---------- تنبيه الطلبات الجديدة: رنين متكرر حتى يقبل المتجر أو يرفض (مثل أجهزة المطاعم) ---------- */
window.HWNotifyAskPerm = true;
HWOrders.subscribe(list => {
    const pend = currentUser && currentUser.start ? list.filter(o => o.storeId === currentUser.id && HWOrders.isMarket(o) && o.status === 'new' && o.storeState === 'pending') : [];
    if (pend.length) HWNotify.ring('store-new', 'order', 4000); else HWNotify.stop('store-new');
    HWNotify.keepAwake(!!(currentUser && currentUser.start));
});
