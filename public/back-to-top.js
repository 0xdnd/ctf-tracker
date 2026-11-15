/* Back-to-top button for the long machine list pages (/machines/ and its pages, /machines/all/, the certification lists).
   Progressive enhancement: a fixed button that appears after about two screens of scrolling and is gone before that, so it never moves the layout.
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
    top.setAttribute('aria-label', 'Back to top of the list');
    top.textContent = 'Back to top';
    top.hidden = true;
    document.body.appendChild(top);

    var shown = false;
    function onScroll() {
      var want = window.pageYOffset > window.innerHeight * 1.5;
      if (want !== shown) {
        shown = want;
        top.hidden = !want;
      }
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
