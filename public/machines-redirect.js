/* /machines/ is page 1 of the paged machine list; search and tag filtering live on /machines/all/.
   Old links of the form /machines/?tag=<tag> or /machines/?q=<text> are sent there, carrying only those two parameters. */
(function () {
  'use strict';
  var p = new URLSearchParams(location.search);
  var out = new URLSearchParams();
  ['tag', 'q'].forEach(function (k) {
    var v = p.get(k);
    if (v) out.set(k, v);
  });
  var qs = out.toString();
  if (qs) location.replace('/machines/all/?' + qs);
})();
