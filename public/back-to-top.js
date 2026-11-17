/* Back-to-top button for the long machine list pages (/machines/ and its pages, /machines/all/, the certification lists).
   Progressive enhancement: a fixed button that appears after about two screens of scrolling and is gone before that, so it never moves the layout.
   On a phone it is a round icon button that shows only while scrolling up (or at the end of the page), so it never sits over the rows being read.
   The column headers stay sticky on their own (CSS, table.list thead th). After the jump focus goes to the search form or toolbar when the page has one.
   No network, no storage. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  function init() {
    if (!document.querySelector('table.list')) return;
    var top = document.createElement('button');
    top.type = 'button';
    top.className = 'btn btn-secondary btn-sm tf-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML =
      '<svg class="tf-top-i" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7"/></svg><span class="tf-top-t">Back to top</span>';
    top.hidden = true;
    document.body.appendChild(top);
    document.body.classList.add('has-tf-top');

    var shown = false;
    var lastY = window.pageYOffset;
    var away = false;
    var phone = window.matchMedia('(max-width: 639px)');
    function onScroll() {
      var y = window.pageYOffset;
      var want = y > window.innerHeight * 1.5;
      if (want !== shown) {
        shown = want;
        top.hidden = !want;
      }
      // Direction: away while scrolling down, back as soon as the page scrolls up a little; the end of the page always shows it.
      if (y > lastY + 4) away = true;
      else if (y < lastY - 4) away = false;
      if (Math.abs(y - lastY) > 4) lastY = y;
      var atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 80;
      top.classList.toggle('tf-top-away', phone.matches && away && !atEnd);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    top.addEventListener('click', function () {
      window.scrollTo(0, 0);
      var form = document.querySelector('#main .tf');
      if (form) {
        form.setAttribute('tabindex', '-1');
        form.focus({ preventScroll: true });
      }
    });
    onScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
