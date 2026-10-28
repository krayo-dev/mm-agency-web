/* Aktuálny rok v pätičke podstránok (samostatný súbor kvôli prísnej CSP). */
document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
