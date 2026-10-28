/* HIGHWAY — يصغّر الشريط السفلي أثناء التمرير ويعيده عند التوقف (مثل إنستغرام) */
(function () {
  var timer = null, last = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (Math.abs(y - last) > 3 && y > 20) document.body.classList.add('bar-mini');
    last = y; clearTimeout(timer);
    timer = setTimeout(function () { document.body.classList.remove('bar-mini'); }, 260);
  }, { passive: true });
})();
