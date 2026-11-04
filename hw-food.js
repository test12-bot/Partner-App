/* HIGHWAY — مكتبة رسومات الطعام بنفس أسلوب شاشة الدخول (خط رفيع 1.6، أشكال بسيطة مفتوحة) */
(function (g) {
  var A = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">';
  var P = {
    /* الستة الأصلية من شاشة الدخول */
    burger: '<path d="M4 11c0-3.5 3.6-6 8-6s8 2.5 8 6H4Z"/><path d="M3 14.5h18"/><path d="M5 17.5h14v.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-.5Z"/>',
    pizza: '<path d="M12 3C8 3 4.5 4.5 2.5 7L12 21 21.5 7C19.5 4.5 16 3 12 3Z"/><circle cx="10" cy="9" r="1.2"/><circle cx="14" cy="11" r="1.2"/><circle cx="12" cy="15" r="1"/>',
    coffee: '<path d="M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V8Z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3v2M11 3v2M14 3v2"/>',
    cutlery: '<path d="M6 3v7a2 2 0 0 0 2 2v9"/><path d="M10 3v7a2 2 0 0 1-2 2"/><path d="M17 3c-2 1.5-3 4-3 7h3v11"/>',
    icecream: '<path d="M7 11a5 5 0 0 1 10 0"/><path d="M6.5 11h11L12 21 6.5 11Z"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    /* مطاعم */
    wrap: '<g transform="rotate(-45 12 12)"><rect x="1.5" y="8.5" width="21" height="7" rx="3.5"/><path d="M9.5 8.5v7M12 8.5v7"/></g>',
    mansaf: '<path d="M3 17h18"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M10 10.5c.8-1.3 2.4-1.3 3 0"/><path d="M6 20h12"/>',
    drumstick: '<ellipse cx="15.5" cy="8.5" rx="5.5" ry="4.3" transform="rotate(-45 15.5 8.5)"/><path d="M12.2 11.8 7.5 16.5"/><circle cx="5.8" cy="16.8" r="1.4"/><circle cx="7.2" cy="18.2" r="1.4"/>',
    skewer: '<path d="M4 20 20 4"/><rect x="6.5" y="12.5" width="5" height="5" rx="1.5" transform="rotate(-45 9 15)"/><rect x="12.5" y="6.5" width="5" height="5" rx="1.5" transform="rotate(-45 15 9)"/>',
    steak: '<path d="M6 8c2-3.5 9-4.5 12.5-1.2 3 2.7 2 7.4-1.5 9-3 1.4-5 .4-7.5 2.2C7 20 3.6 17.5 4 14c.3-2.3.8-4 2-6Z"/><path d="M10 11.5c1.5-.8 3-.6 4 .6"/>',
    fries: '<path d="M6 10h12l-1.5 10h-9L6 10Z"/><path d="M8.5 10V4.5M11 10V3.5M13.5 10V4M16 10V5"/>',
    rings: '<circle cx="9" cy="10" r="5"/><circle cx="9" cy="10" r="2"/><circle cx="15.5" cy="15" r="4.5"/><circle cx="15.5" cy="15" r="1.8"/>',
    hotdog: '<path d="M4 13c0 3 2 5 5 5h6c3 0 5-2 5-5"/><path d="M3 12.5c0-1.4 1.1-2.5 2.5-2.5h13c1.4 0 2.5 1.1 2.5 2.5"/><path d="M7 12c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0"/>',
    sandwich: '<path d="M3 18 12 5l9 13H3Z"/><path d="M5.5 14.5h13"/>',
    falafel: '<circle cx="8" cy="15" r="3.5"/><circle cx="16" cy="15" r="3.5"/><circle cx="12" cy="8.5" r="3.5"/>',
    egg: '<path d="M6 9.5c1.2-4 6.5-5 9.5-2.5 2.3 1.9 4.7 2.6 4.5 6-.3 4-5 6.5-9 5.5-3.6-.9-6.2-4.6-5-9Z"/><circle cx="12" cy="12.5" r="2.8"/>',
    rice: '<path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z"/><path d="M6.5 12c0-2.8 2.5-4.8 5.5-4.8s5.5 2 5.5 4.8"/>',
    soup: '<path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M9 7.5c-.7-1 .7-1.6 0-2.8M12.5 7.5c-.7-1 .7-1.6 0-2.8M16 7.5c-.7-1 .7-1.6 0-2.8"/>',
    salad: '<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M7.5 12c-.5-2.5 1-4.5 3.5-4.5M12 12c0-3 1.5-5.5 4-6"/>',
    hummus: '<path d="M3 11.5h18c0 4.4-4 7.8-9 7.8s-9-3.4-9-7.8Z"/><path d="M8 11.5c0-2 1.8-3.6 4-3.6s4 1.6 4 3.6"/>',
    fish: '<path d="M3 12c3-4.5 9-6 14-2l4-3v10l-4-3c-5 4-11 2.5-14-2Z"/><path d="M7.5 11h.01"/>',
    pasta: '<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M8 12c0-2 2-2 2-4M12 12c0-2 2-2 2-4M10 8l6-5M12.5 8l6-5"/>',
    /* معجنات ومخبوزات */
    manakish: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 10h.01M14.5 10.5h.01M12 14.5h.01"/>',
    fatayer: '<path d="M11 4.6a1.2 1.2 0 0 1 2 0l7.6 13a1.2 1.2 0 0 1-1 1.9H4.4a1.2 1.2 0 0 1-1-1.9L11 4.6Z"/><path d="M12 10v5"/>',
    croissant: '<path d="M4 15.5C5.5 10 8.5 7 12 7s6.5 3 8 8.5"/><path d="M4 15.5c1.8 1 3.6.8 4.6-.5M20 15.5c-1.8 1-3.6.8-4.6-.5"/><path d="M9.5 8.5l1.3 5.5M14.5 8.5l-1.3 5.5"/>',
    bread: '<path d="M5 10.5A3.5 3.5 0 0 1 6.5 4h11A3.5 3.5 0 0 1 19 10.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-8.5Z"/>',
    /* حلويات */
    cake: '<path d="M3 12 17 6l4 6v8H3v-8Z"/><path d="M3 12h18"/><circle cx="17" cy="3.8" r="1.2"/>',
    cupcake: '<path d="M6 13h12l-1.5 7.5h-9L6 13Z"/><path d="M5.5 13a3 3 0 0 1 1.8-5.5A4.8 4.8 0 0 1 16.7 7.5 3 3 0 0 1 18.5 13"/><path d="M10 13.5l.6 6.5M14 13.5l-.6 6.5"/>',
    donut: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M8 7.5l.8.8M15.5 7l-.6 1M17 13.5l-1 .3M8 16l.9-.6"/>',
    cookie: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h.01M14.5 8.5h.01M15 14h.01M9.5 15h.01M12 12h.01"/>',
    choco: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 9h12M6 15h12M12 3v18"/>',
    kunafa: '<rect x="3" y="7" width="18" height="11" rx="2.5"/><path d="M6 11c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0"/><path d="M6 14.5c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0"/>',
    baklava: '<path d="M7.5 5 12 12l-4.5 7L3 12l4.5-7Z"/><path d="M16.5 5 21 12l-4.5 7L12 12l4.5-7Z"/>',
    qatayef: '<path d="M3.5 16.5a8.5 8.5 0 0 1 17 0H3.5Z"/><path d="M7 16.5c.4-2 1.6-3.5 3-4"/>',
    cheese: '<path d="M3 17V10l12-5 6 5v7H3Z"/><path d="M3 10h18"/><circle cx="8" cy="14" r="1.2"/><circle cx="15" cy="13.5" r="1.5"/>',
    /* مشروبات */
    mug: '<path d="M5 7h11v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7Z"/><path d="M16 9.5h1.5a2.5 2.5 0 0 1 0 5H16"/>',
    tea: '<path d="M7.5 4h9l-1.2 7c-.3 1.4.3 2.7.3 4l-.8 5h-5.6l-.8-5c0-1.3.6-2.6.3-4L7.5 4Z"/><path d="M5 21h14"/>',
    juice: '<path d="M6 8h12l-1.5 13h-9L6 8Z"/><path d="M13.5 8l2-5h3"/>',
    lemonade: '<path d="M6 8h12l-1.5 13h-9L6 8Z"/><circle cx="17.5" cy="7" r="3"/><path d="M6.5 12.5h11"/>',
    shake: '<path d="M7 9h10l-1.5 12h-7L7 9Z"/><path d="M6 9a6 6 0 0 1 12 0"/><path d="M13 4l2-2"/>',
    can: '<rect x="7" y="4" width="10" height="17" rx="2"/><path d="M7 7.5h10M10.5 2.5h3"/>',
    bottle: '<path d="M10 2.5h4v3l2 3V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V8.5l2-3v-3Z"/><path d="M8 12h8"/>',
    pickles: '<rect x="6" y="7.5" width="12" height="13.5" rx="2.5"/><path d="M7 4h10v3.5H7z"/>',
    cloche: '<path d="M3 18.5h18"/><path d="M4.5 18.5a7.5 7.5 0 0 1 15 0"/><path d="M12 9V7M10.5 7h3"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'
  };
  var RULES = [
    [/حلقات\s*بصل/, 'rings'], [/شاورما|عربي\s*شاورما/, 'wrap'], [/منسف|مناسف|جميد/, 'mansaf'], [/برغر|برجر|burger/i, 'burger'],
    [/هوت\s*دوغ|نقانق|سجق/, 'hotdog'], [/فلافل/, 'falafel'], [/بيض|عجة|شكشوكة|فطور/, 'egg'], [/معكرونة|باستا|سباغيتي|نودلز/, 'pasta'],
    [/بطاطا|بطاطس|فرايز/, 'fries'], [/كنافة|كنافه/, 'kunafa'], [/بقلاوة|بقلاوه|هريسة|بسبوسة/, 'baklava'], [/قطايف/, 'qatayef'],
    [/دونات/, 'donut'], [/كب\s*كيك|مافن/, 'cupcake'], [/كوكيز|بسكويت|معمول/, 'cookie'], [/شوكولا|نوتيلا/, 'choco'],
    [/بوظة|آيس|ايس كريم|مثلجات|جيلاتو/, 'icecream'], [/ميلك\s*شيك|شيك|فرابيه/, 'shake'], [/كعك|كيك|تشيز\s*كيك|تورتة|حلويات|حلو/, 'cake'],
    [/نسكافيه|كابتشينو|لاتيه|موكا|هوت\s*شوكليت/, 'mug'], [/قهوة|قهوه|اسبريسو|إسبريسو/, 'coffee'], [/شاي/, 'tea'],
    [/ليمون|ليموناضة/, 'lemonade'], [/عصير|كوكتيل|سموذي|برتقال|فراولة|مانجا/, 'juice'], [/غازي|بيبسي|كولا|سفن|ميرندا/, 'can'], [/لبن|حليب|عيران|ماء|مياه/, 'bottle'],
    [/سلطة|فتوش/, 'salad'], [/حمص|متبل|مقبلات|تبولة|بابا/, 'hummus'], [/شوربة|شوربه/, 'soup'], [/سمك|جمبري|روبيان|سي\s*فود/, 'fish'],
    [/برياني|كبسة|مندي|مقلوبة|أرز|ارز|رز|مجبوس/, 'rice'], [/ساندويش|سندويش|ساندوتش|توست/, 'sandwich'], [/مخلل/, 'pickles'],
    [/بيتزا/, 'pizza'], [/مناقيش|منقوشة|مناقيشة|زعتر/, 'manakish'], [/فطيرة|فطاير|فطائر|سمبوسة|سمبوسك/, 'fatayer'],
    [/كرواسون|معجنات|كعكة/, 'croissant'], [/جبنة|جبن/, 'cheese'], [/خبز|صمون|كماج/, 'bread'], [/دجاج|دجاجة|فروج|جاج|بروستد|زنجر|ناجتس/, 'drumstick'],
    [/مشاوي|مشوي|كباب|شيش|شقف|كفتة|تكا/, 'skewer'], [/لحم|ستيك/, 'steak']
  ];
  var CAT = { 'الكل': 'grid', 'حلويات': 'cake', 'مطاعم': 'cutlery', 'برغر': 'burger', 'مناسف': 'mansaf', 'شاورما': 'wrap', 'قهوة': 'coffee', 'معجنات': 'croissant', 'مشروبات': 'juice', 'بيتزا': 'pizza', 'مشاوي': 'skewer', 'فطور': 'egg', 'سوبر ماركت': 'bag', 'بقالة': 'bag' };
  function svg(k) { return A + (P[k] || P.cloche) + '</svg>'; }
  function keyFor(text) { text = String(text || ''); for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(text)) return RULES[i][1]; return null; }
  function forCat(cat) { return svg(CAT[cat] || keyFor(cat) || 'cutlery'); }
  function forItem(name, desc, catName, storeCat) { return svg(keyFor(name) || keyFor(catName) || keyFor(desc) || CAT[storeCat] || 'cloche'); }
  function splashSet() { return Object.keys(P).filter(function (k) { return k !== 'grid' && k !== 'cloche'; }).map(svg); }
  g.HWFood = { svg: svg, keyFor: keyFor, forCat: forCat, forItem: forItem, keys: Object.keys(P), splashSet: splashSet };
})(window);
