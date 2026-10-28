/* Spúšťa sa hneď v <head>, ešte pred vykreslením stránky.
   Zapne animácie len ak beží JavaScript a používateľ nemá vypnutý pohyb.
   Poistka: ak by sa script.js nenačítal, obsah sa po 2,5 s zobrazí aj tak. */
(function (d) {
  var c = d.documentElement.classList;
  c.add('js');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) c.add('motion');
  setTimeout(function () { if (!c.contains('ready')) c.add('no-anim'); }, 2500);
})(document);
