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
  push: { server: false,   // اجعلها true بعد تشغيل خادم HIGHWAY-Server
          publicKey: "BIoQtkBzCV2-Gbzws0Tk9ZcP2u-eVpXZQTxMQiJgqLDByRQo50y9bWwIW5wgF0FkDXk-7qKlhhtocWfGkqt7yfo" },

  commissionRate: 0.10,   // عمولة الشركة من أجرة التوصيل (10%)
  rangePolicy: "max",     // أجرة نطاقها (2.00 - 2.50): "max" تُحتسب الأعلى، "min" تُحتسب الأدنى
  offerSeconds: 45,       // مهلة قبول عرض الطلب عند الكابتن
  travelMin: 15,          // زمن الطريق التقريبي (دقيقة) لتقدير وقت وصول الطلب

  /* التسعير بالمسافة (طلبات العملاء): كيلومتر × السعر، مع حد أدنى */
  kmPrice: 0.35,
  minFee: 1.50,
  maxKm: 12,              // أقصى مسافة توصيل افتراضية من المتجر (كم) — تُعدّل لكل متجر من لوحة الإدارة
  minOrder: 0,            // الحد الأدنى للطلب الافتراضي (د.أ) — يُعدّل لكل متجر من لوحة الإدارة
  roadFactor: 1.3,        // تقدير المسافة الطرقية من الخط المستقيم عند تعذر خدمة التوجيه
  center: [32.0392, 35.7272],   // مركز الخريطة الافتراضي (السلط)
  mapTilerKey: "",        // مفتاح MapTiler للخرائط: maptiler.com → Account → API keys (الخطة المجانية للتجربة فقط، التجاري يبدأ بخطة Flex)
  orsKey: "",             // مفتاح OpenRouteService لحساب المسافة الطرقية: openrouteservice.org → Dashboard (الخطة المجانية: 2000 مسار يوميًا)
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",   // بدّله بمزوّد خرائط مدفوع عند الإطلاق
  routeUrl: "https://router.project-osrm.org/route/v1/driving/",
  routeUrl2: "https://routing.openstreetmap.de/routed-car/route/v1/driving/",   // احتياطي إن تعطّل الأول
  tileUrl2: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",                    // بلاطات احتياطية إن رُفضت الأولى

  /* التحقق من رقم العميل برسالة SMS (Firebase Authentication → Phone). اتركه فارغًا لإيقافه.
     التعبئة من: Firebase Console → Project settings → General → Your apps → Web app (apiKey و authDomain و projectId) */
  otp: { apiKey: "", authDomain: "", projectId: "" },
  cashLimit: 3,           // حد النقد الافتراضي مع الكابتن (د.أ) — يُعدّل من لوحة الإدارة
};
