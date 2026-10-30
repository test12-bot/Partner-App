/* إعدادات منصة HIGHWAY — نفس الملف في المواقع الأربعة (المتاجر، المنسقين، العملاء، الكباتن)

   dbUrl فارغ  = وضع تجريبي: كل شيء يُحفظ داخل المتصفح (تعمل المواقع الأربعة معًا على نفس الجهاز والمتصفح).
   dbUrl معبّأ = وضع حقيقي: رابط Firebase Realtime Database مثل
                 https://اسم-مشروعك-default-rtdb.firebaseio.com
                 فتتزامن البيانات بين كل الأجهزة. */
window.HW_CONFIG = {
  dbUrl: "https://highway-delivery-fd2b3-default-rtdb.firebaseio.com",
  pollMs: 3000,

  /* الإشعارات الحقيقية (تعمل مع الوضع الحقيقي + خادم HIGHWAY-Server).
     publicKey هو المفتاح العام لـ VAPID — المفتاح الخاص يبقى سرًّا في الخادم فقط */
  push: { publicKey: "BIoQtkBzCV2-Gbzws0Tk9ZcP2u-eVpXZQTxMQiJgqLDByRQo50y9bWwIW5wgF0FkDXk-7qKlhhtocWfGkqt7yfo" },

  commissionRate: 0.10,   // عمولة الشركة من أجرة التوصيل (10%)
  rangePolicy: "max",     // أجرة نطاقها (2.00 - 2.50): "max" تُحتسب الأعلى، "min" تُحتسب الأدنى
  offerSeconds: 45,       // مهلة قبول عرض الطلب عند الكابتن
  travelMin: 15,          // زمن الطريق التقريبي (دقيقة) لتقدير وقت وصول الطلب

  /* التسعير بالمسافة (طلبات العملاء): كيلومتر × السعر، مع حد أدنى */
  kmPrice: 0.35,
  minFee: 1.50,
  roadFactor: 1.3,        // تقدير المسافة الطرقية من الخط المستقيم عند تعذر خدمة التوجيه
  center: [32.0392, 35.7272],   // مركز الخريطة الافتراضي (السلط)
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",   // بدّله بمزوّد خرائط مدفوع عند الإطلاق
  routeUrl: "https://router.project-osrm.org/route/v1/driving/",

  /* صور أغلفة المتاجر (تضيفها HIGHWAY): ضع الصورة داخل مجلد covers واكتب اسمها هنا، مثل
     covers: { hamada: "covers/hamada.jpg" }   — المتجر بلا صورة تظهر له رسمة قسمه */
  covers: {},

  captains: [],           // أسماء كباتن جاهزة للاقتراح (اختياري)

  /* المتاجر الشريكة (نفس حسابات موقع المتاجر). start = نقطة الانطلاق لقائمة أسعار التوصيل */
  stores: [
    { id: "nafeeseh", name: "حلويات نفيسة",               start: "umm_naaj", cat: "حلويات", emoji: "🍰" },
    { id: "hamada",   name: "مطعم حماده",                  start: "sarou",    cat: "مطاعم",  emoji: "🍽️" },
    { id: "bullgurz", name: "Bullgurz",                    start: "sarou",    cat: "برغر",   emoji: "🍔" },
    { id: "abuahmad", name: "مطعم أبو أحمد النسور للمناسف", start: "sarou",    cat: "مناسف",  emoji: "🍖" },
    { id: "reef",     name: "شاورما الريف",                start: "sarou",    cat: "شاورما", emoji: "🌯" },
    { id: "abusaleh", name: "قهوة أبو صالح",               start: "sarou",    cat: "قهوة",   emoji: "☕" },
    { id: "gulf",     name: "مطعم الخليج",                 start: "sarou",    cat: "مطاعم",  emoji: "🍽️" },
    { id: "julnar",   name: "معجنات جلنار",                start: "sarou",    cat: "معجنات", emoji: "🥐" }
  ]
};
