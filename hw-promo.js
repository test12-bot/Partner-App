/* HIGHWAY — العروض وصور الأغلفة (مشتركة بين تطبيق المتاجر وتطبيق العملاء)
   offers : { id, storeId, title, sub, percent, minOrder, endsAt, active, demo }
   صور الأغلفة تضعها HIGHWAY في الكود: HW_CONFIG.covers = { storeId: 'covers/اسم-الصورة.jpg' } */
(function (g) {
  var offers = g.HWDB.col('offers'), CFG = g.HW_CONFIG || {};
  function live(o, now) { now = now || Date.now(); return o && o.active !== false && (!o.endsAt || o.endsAt > now); }
  function forStore(sid) { return offers.list().filter(function (o) { return o.storeId === sid && live(o); }).sort(function (a, b) { return (b.percent || 0) - (a.percent || 0); }); }
  function best(sid, itemsTotal) {                     /* أفضل عرض خصم ينطبق على قيمة السلة */
    var l = forStore(sid).filter(function (o) { return (o.percent || 0) > 0 && (itemsTotal == null || itemsTotal >= (o.minOrder || 0)); });
    return l[0] || null;
  }
  function discount(sid, itemsTotal) { var o = best(sid, itemsTotal); return o ? { offer: o, amount: Math.round(itemsTotal * o.percent) / 100 } : { offer: null, amount: 0 }; }
  function cover(sid) { return (CFG.covers && CFG.covers[sid]) || ''; }
  g.HWPromo = { offers: offers, live: live, forStore: forStore, best: best, discount: discount, cover: cover };
})(window);
