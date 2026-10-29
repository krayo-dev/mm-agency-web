/* Spúšťa sa hneď v <head>, ešte pred vykreslením stránky.
   Zapne animácie len ak beží JavaScript a používateľ nemá vypnutý pohyb.
   Poistka: ak by sa script.js nenačítal, obsah sa po 2,5 s zobrazí aj tak. */
(function (d) {
  var root = d.documentElement, c = root.classList;
  c.add('js');
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) c.add('motion');
  setTimeout(function () { if (!c.contains('ready')) c.add('no-anim'); }, 2500);

  // Svetlý / tmavý režim – predvolený je svetlý, voľba sa zapamätá v prehliadači
  var KEY = 'mm-theme';
  function setTheme(t) {
    root.dataset.theme = t;
    var m = d.querySelector('meta[name="theme-color"]');
    if (m) m.content = t === 'light' ? '#F6F7F2' : '#0A0E14';
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  setTheme(saved === 'dark' ? 'dark' : 'light');

  d.addEventListener('DOMContentLoaded', function () {
    var label = function () { return root.dataset.theme === 'light' ? 'Zapnúť tmavý režim' : 'Zapnúť svetlý režim'; };
    d.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', label());
      btn.addEventListener('click', function () {
        var next = root.dataset.theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        btn.setAttribute('aria-label', label());
        window.dispatchEvent(new Event('themechange'));
      });
    });
  });
})(document);
