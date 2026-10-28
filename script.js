/* ==========================================================================
   MM agency – interaktivita
   Každá časť beží samostatne – ak jedna zlyhá, ostatné fungujú ďalej.
   Knižnice GSAP a Lenis sú voliteľné: bez nich web funguje, len bez efektov.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const motion = root.classList.contains('motion');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (gsap && SplitText) gsap.registerPlugin(SplitText);

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* Spustí časť kódu; pri chybe zobrazí obsah bez animácií. */
  const run = (name, fn) => {
    try { fn(); } catch (err) {
      root.classList.add('no-anim');
      console.warn(`[MM agency] ${name}:`, err);
    }
  };

  root.classList.add('ready');

  let lenis = null;
  const headerOffset = () => -($('.site-header')?.offsetHeight || 0);

  /* ---------- Rok v pätičke ---------- */
  run('year', () => {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  });

  /* ---------- Plynulý scroll (Lenis) ---------- */
  run('lenis', () => {
    if (!motion || !window.Lenis) return;
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });

    if (gsap && ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  });

  /* ---------- Odkazy na sekcie (#kotvy) ---------- */
  run('anchors', () => {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = id === '#top' ? document.body : $(id);
      if (!target) return;

      e.preventDefault();
      closeMenu();

      if (lenis) {
        lenis.scrollTo(id === '#top' ? 0 : target, { offset: headerOffset() });
      } else if (id === '#top') {
        window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' });
      } else {
        target.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' });
      }

      // Presun fokusu pre klávesnicu a čítačky obrazovky
      if (id !== '#top') {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      history.replaceState(null, '', id);
    });
  });

  /* ---------- Hlavička a mobilné menu ---------- */
  const header = $('.site-header');
  const toggle = $('.nav-toggle');
  const menu = $('#nav-menu');

  function closeMenu() {
    if (!toggle || toggle.getAttribute('aria-expanded') !== 'true') return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.sr-only').textContent = 'Otvoriť menu';
    menu.classList.remove('is-open');
    header.classList.remove('menu-open');
    lenis?.start();
  }

  run('header', () => {
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      if (!open) return closeMenu();
      toggle.setAttribute('aria-expanded', 'true');
      toggle.querySelector('.sr-only').textContent = 'Zavrieť menu';
      menu.classList.add('is-open');
      header.classList.add('menu-open');
      lenis?.stop();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });
  });

  /* ---------- Zvýraznenie aktívnej sekcie v menu ---------- */
  run('active-link', () => {
    const links = $$('.nav-link');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        const link = map.get(entry.target.id);
        if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => io.observe(s));
  });

  /* ---------- Postupné zobrazovanie prvkov pri scrollovaní ---------- */
  run('reveal', () => {
    const items = $$('.reveal');
    if (!motion) return;
    if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }

    // Prvky v jednom rodičovi sa objavia postupne (jemný „stagger“)
    items.forEach((el) => {
      const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const i = siblings.indexOf(el);
      el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  });

  /* ---------- Nadpisy sekcií po slovách (GSAP SplitText) ---------- */
  run('split', () => {
    const heads = $$('[data-split]');
    if (!motion || !gsap || !SplitText || !ScrollTrigger) {
      heads.forEach((h) => h.classList.add('is-split'));
      return;
    }
    const doSplit = () => heads.forEach((el) => {
      const split = SplitText.create(el, { type: 'words', mask: 'words' });
      el.classList.add('is-split');
      gsap.from(split.words, {
        yPercent: 110,
        opacity: 0,
        duration: 0.9,
        ease: 'power4.out',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    // Počkáme na fonty, aby sa slová rozdelili správne
    (document.fonts?.ready || Promise.resolve()).then(doSplit, doSplit);
  });

  /* ---------- Hero nadpis sa „dešifruje“ (inšpirované React Bits DecryptedText) ---------- */
  run('scramble', () => {
    const lines = $$('[data-scramble]');
    if (!lines.length) return;
    if (!motion) { lines.forEach((l) => l.classList.add('is-scrambling')); return; }

    const glyphs = '!<>-_\\/[]{}=+*^?#01';
    const rand = () => glyphs[Math.floor(Math.random() * glyphs.length)];

    const scramble = (el, startDelay) => new Promise((resolve) => {
      const final = el.textContent;
      const chars = Array.from(final);
      const resolveAt = chars.map((_, i) => Math.floor(i * 1.15 + Math.random() * 14) + 8);
      const end = Math.max(...resolveAt);
      let frame = 0;

      // Pevná výška počas animácie, aby stránka neposkakovala
      el.style.minHeight = `${el.offsetHeight}px`;
      el.classList.add('is-scrambling');

      const tick = () => {
        let out = '';
        chars.forEach((c, i) => {
          if (c === ' ' || frame >= resolveAt[i]) out += c;
          else out += `<span class="scr">${rand()}</span>`;
        });
        el.innerHTML = out;
        if (frame++ < end) requestAnimationFrame(tick);
        else { el.textContent = final; el.style.minHeight = ''; resolve(); }
      };
      setTimeout(() => requestAnimationFrame(tick), startDelay);
    });

    // Začneme až keď sú načítané fonty
    (document.fonts?.ready || Promise.resolve()).then(() => {
      lines.forEach((l, i) => scramble(l, 150 + i * 380));
    });
  });

  /* ---------- Rotujúce slová (inšpirované React Bits RotatingText) ---------- */
  run('rotator', () => {
    const el = $('.rotator-word');
    if (!el) return;
    const words = el.dataset.words.split('|');
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      el.classList.add('is-out');
      setTimeout(() => {
        el.textContent = words[i];
        el.classList.remove('is-out');
        el.classList.add('is-in');
        void el.offsetWidth; // vynúti prepočet, aby animácia nabehla zdola
        el.classList.remove('is-in');
      }, 350);
    }, 2400);
  });

  /* ---------- Terminál, ktorý „píše“ príkazy ---------- */
  run('terminal', () => {
    const code = $('[data-terminal]');
    if (!code) return;
    const lines = $$('.t-line', code).map((l) => ({
      cls: l.className,
      cmd: !!l.querySelector('.t-prompt'),
      text: l.textContent.replace(/^\$\s*/, ''),
    }));
    const cursorLine = () => {
      const line = document.createElement('span');
      line.className = 't-line';
      line.innerHTML = '<span class="t-prompt">$</span><span class="t-cursor"></span>';
      return line;
    };

    if (!motion) { code.appendChild(cursorLine()); return; }

    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(code);
    }
    const waitVisible = async () => { while (!visible || document.hidden) await sleep(300); };

    const play = async () => {
      code.textContent = '';
      for (const l of lines) {
        await waitVisible();
        const line = document.createElement('span');
        line.className = l.cls;
        code.appendChild(line);
        if (l.cmd) {
          line.innerHTML = '<span class="t-prompt">$</span>';
          const cur = document.createElement('span');
          cur.className = 't-cursor';
          const txt = document.createTextNode('');
          line.append(txt, cur);
          await sleep(350);
          for (const ch of l.text) { txt.data += ch; await sleep(28 + Math.random() * 40); }
          await sleep(300);
          cur.remove();
        } else {
          await sleep(420);
          line.textContent = l.text;
          if (gsap) gsap.from(line, { opacity: 0, x: -6, duration: 0.35, ease: 'power2.out' });
        }
      }
      code.appendChild(cursorLine());
      await sleep(5200);
      play();
    };
    play();
  });

  /* ---------- Napočítavanie čísel (inšpirované React Bits CountUp) ---------- */
  run('countup', () => {
    const nums = $$('[data-count]');
    if (!motion || !nums.length || !('IntersectionObserver' in window)) return;
    const animate = (el) => {
      const to = parseFloat(el.dataset.count);
      const from = parseFloat(el.dataset.from || 0);
      const dur = 1600;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    nums.forEach((el) => { el.textContent = el.dataset.from || 0; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        setTimeout(() => animate(e.target), 400);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => io.observe(el));
  });

  /* ---------- Pohyblivá mriežka v pozadí hero (inšpirované React Bits Squares) ---------- */
  run('grid', () => {
    const canvas = $('.hero-grid');
    if (!canvas) return;
    const hero = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const size = 48;
    let w = 0, h = 0, off = 0, raf = 0, running = false;
    let mouse = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const o = off % size;
      // zvýraznený štvorček pod kurzorom
      if (mouse) {
        const cx = Math.floor((mouse.x + o) / size) * size - o;
        const cy = Math.floor((mouse.y + o) / size) * size - o;
        ctx.fillStyle = 'rgba(198, 242, 78, 0.09)';
        ctx.fillRect(cx, cy, size, size);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -o; x <= w; x += size) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = -o; y <= h; y += size) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
    };

    const loop = () => {
      off += 0.18;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!running && motion) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    window.addEventListener('resize', resize);

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (!running) draw();
      });
      hero.addEventListener('pointerleave', () => { mouse = null; if (!running) draw(); });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
    } else start();
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  });

  /* ---------- Spotlight na kartách (inšpirované React Bits SpotlightCard) ---------- */
  run('spotlight', () => {
    if (!finePointer) return;
    $$('.spotlight').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  });

  /* ---------- Magnetické tlačidlá (inšpirované React Bits Magnet) ---------- */
  run('magnet', () => {
    if (!finePointer || !motion) return;
    $$('[data-magnet]').forEach((btn) => {
      const set = (x, y) => {
        if (gsap) gsap.to(btn, { x, y, duration: 0.5, ease: 'power3.out' });
        else btn.style.transform = `translate(${x}px, ${y}px)`;
      };
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        set((e.clientX - r.left - r.width / 2) * 0.22, (e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener('pointerleave', () => set(0, 0));
    });
  });

  /* ---------- Čiara procesu sa vypĺňa pri scrollovaní ---------- */
  run('steps', () => {
    const wrap = $('.steps-wrap');
    if (!wrap || !motion || !gsap || !ScrollTrigger) return;
    wrap.style.setProperty('--p', 0);
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top 75%',
      end: 'bottom 55%',
      scrub: true,
      onUpdate: (self) => wrap.style.setProperty('--p', self.progress.toFixed(3)),
    });
  });

  /* ---------- Kalkulačka úspory ---------- */
  const calcState = { cost: 0, hours: 0, save: 0 };
  run('calc', () => {
    const calc = $('#calc');
    if (!calc) return;
    const WEEKS = 46;          // pracovné týždne v roku (bez dovoleniek a sviatkov)
    const AUTOMATABLE = 0.6;   // podiel rutiny, ktorý sa dá typicky zautomatizovať
    const fmt = (n) => Math.round(n).toLocaleString('sk-SK');
    const inp = { hours: $('#c-hours'), people: $('#c-people'), rate: $('#c-rate') };

    const update = () => {
      const h = +inp.hours.value, p = +inp.people.value, r = +inp.rate.value;
      $('#c-hours-out').textContent = `${h} h`;
      $('#c-people-out').textContent = p;
      $('#c-rate-out').textContent = `${r} €`;
      calcState.hours = h * p * WEEKS;
      calcState.cost = calcState.hours * r;
      calcState.save = calcState.cost * AUTOMATABLE;
      $('#c-cost').textContent = fmt(calcState.cost);
      $('#c-hours-year').textContent = fmt(calcState.hours);
      $('#c-days').textContent = fmt(calcState.hours / 8);
      $('#c-save').textContent = fmt(calcState.save);
      // vyplnenie „dráhy“ jazdca akcentovou farbou
      Object.values(inp).forEach((el) => {
        el.style.setProperty('--fill', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);
      });
    };
    calc.addEventListener('input', update);
    calc.addEventListener('submit', (e) => e.preventDefault());
    update();
  });

  /* ---------- Predvyplnenie formulára z kariet služieb a kalkulačky ---------- */
  run('prefill', () => {
    const form = $('#contact-form');
    if (!form) return;
    const services = { web: 'Webstránka', automatizacia: 'Automatizácia', softver: 'Softvér na mieru' };
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-service]');
      if (card) {
        const radio = form.querySelector(`input[name="sluzba"][value="${services[card.dataset.service]}"]`);
        if (radio) radio.checked = true;
      }
      if (e.target.closest('#calc-cta')) {
        const msg = form.elements.sprava;
        const auto = form.querySelector('input[name="sluzba"][value="Automatizácia"]');
        if (auto) auto.checked = true;
        if (msg && !msg.value.trim()) {
          const n = (v) => Math.round(v).toLocaleString('sk-SK');
          msg.value = `Podľa kalkulačky nás rutina stojí približne ${n(calcState.hours)} hodín (${n(calcState.cost)} €) ročne. Zaujíma ma, čo by sa u nás dalo zautomatizovať.`;
        }
      }
    });
  });

  /* ---------- Plávajúce tlačidlo na mobile ---------- */
  run('sticky-cta', () => {
    const btn = $('.sticky-cta');
    const hero = $('.hero');
    const contact = $('#kontakt');
    if (!btn || !hero || !contact || !('IntersectionObserver' in window)) return;
    let pastHero = false, atContact = false;
    const sync = () => btn.classList.toggle('is-visible', pastHero && !atContact);
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; sync(); }).observe(hero);
    new IntersectionObserver(([e]) => { atContact = e.isIntersecting; sync(); }, { rootMargin: '0px 0px -20% 0px' }).observe(contact);
  });

  /* ---------- Kontaktný formulár – validácia a odoslanie (Formspree) ---------- */
  run('form', () => {
    const form = $('#contact-form');
    if (!form) return;
    const status = $('.form-status', form);
    const submitBtn = $('button[type="submit"]', form);
    const btnText = $('.btn-text', submitBtn);
    const btnLabel = btnText.textContent;
    const loadedAt = Date.now();
    const wantsCall = () => form.elements.kontakt_cez?.value === 'Telefón';

    // Pri „Zavolajte mi“ je telefón povinný
    const phoneOpt = $('#f-phone-opt');
    form.addEventListener('change', (e) => {
      if (e.target.name !== 'kontakt_cez') return;
      const call = wantsCall();
      form.elements.telefon.required = call;
      if (phoneOpt) phoneOpt.textContent = call ? '(povinné, zavoláme vám)' : '(nepovinné)';
      if (!call) validate(form.elements.telefon);
    });

    const rules = {
      meno: (el) => el.value.trim().length >= 2 || 'Zadajte, prosím, vaše meno (aspoň 2 znaky).',
      email: (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) || 'Zadajte platný e-mail, napr. jan@firma.sk.',
      telefon: (el) => {
        const v = el.value.trim();
        if (!v) return !wantsCall() || 'Zadajte telefónne číslo, aby sme vám mohli zavolať.';
        return /^\+?[0-9\s()/-]{9,20}$/.test(v) || 'Zadajte platné telefónne číslo, napr. +421 900 123 456.';
      },
      sprava: (el) => el.value.trim().length >= 10 || 'Napíšte nám, prosím, aspoň pár slov (min. 10 znakov).',
      suhlas: (el) => el.checked || 'Na odoslanie potrebujeme váš súhlas so spracovaním údajov.',
    };

    const validate = (el) => {
      const rule = rules[el.name];
      if (!rule) return true;
      const result = rule(el);
      const err = document.getElementById(el.getAttribute('aria-describedby'));
      const ok = result === true;
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (err) err.textContent = ok ? '' : result;
      return ok;
    };

    const fields = Object.keys(rules).map((n) => form.elements[n]).filter(Boolean);
    fields.forEach((el) => {
      el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') validate(el); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
      el.addEventListener('change', () => { if (el.type === 'checkbox') validate(el); });
    });

    const setStatus = (msg, type) => {
      status.textContent = msg;
      status.className = `form-status mono ${type ? `is-${type}` : ''}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const invalid = fields.filter((el) => !validate(el));
      if (invalid.length) {
        invalid[0].focus();
        setStatus('Skontrolujte, prosím, označené polia.', 'error');
        return;
      }

      // Ochrana proti spamu: roboti vyplnia formulár okamžite alebo vyplnia skryté pole.
      // Tvárime sa, že sa odoslal, aby robot neskúšal znova.
      if (Date.now() - loadedAt < 2500 || form.elements._gotcha.value) {
        form.reset();
        setStatus('✓ Ďakujeme! Správa bola odoslaná.', 'ok');
        return;
      }

      // Jednoduchý limit: najviac 1 odoslanie za minútu z jedného prehliadača
      let last = 0;
      try { last = +sessionStorage.getItem('mm-last-submit') || 0; } catch (_) { /* úložisko nedostupné */ }
      if (Date.now() - last < 60000) {
        setStatus('Správu sme už dostali. Ak chcete niečo doplniť, skúste to o minútu.', 'error');
        return;
      }

      if (form.action.includes('[FORMSPREE_ID]') || form.action.includes('%5BFORMSPREE_ID%5D')) {
        setStatus('Formulár ešte nie je prepojený. Doplňte Formspree ID v súbore index.html.', 'error');
        return;
      }

      submitBtn.disabled = true;
      btnText.textContent = 'Odosielam…';
      setStatus('', '');

      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(res.status);
        try { sessionStorage.setItem('mm-last-submit', String(Date.now())); } catch (_) { /* úložisko nedostupné */ }
        const call = wantsCall();
        form.reset();
        form.elements.telefon.required = false;
        if (phoneOpt) phoneOpt.textContent = '(nepovinné)';
        fields.forEach((el) => el.removeAttribute('aria-invalid'));
        setStatus(call
          ? '✓ Ďakujeme! Zavoláme vám do 24 hodín (v pracovné dni).'
          : '✓ Ďakujeme! Správa bola odoslaná. Ozveme sa vám do 24 hodín.', 'ok');
      } catch (err) {
        setStatus('Správu sa nepodarilo odoslať. Skúste to znova alebo nám napíšte priamo na e-mail.', 'error');
      } finally {
        submitBtn.disabled = false;
        btnText.textContent = btnLabel;
      }
    });
  });
})();
