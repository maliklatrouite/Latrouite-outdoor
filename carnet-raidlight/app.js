/* Carnet d’Endurance — interactions & motion */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const TOTAL_KM = 644;

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    try {
      lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true });
      if (hasGsap) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } catch (e) { lenis = null; }
  }
  if (!lenis) document.documentElement.classList.add('no-lenis');

  const headerOffset = () => ($('#site-header')?.offsetHeight || 70) + 12;
  function scrollToTarget(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: -headerOffset(), duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - headerOffset(), behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.getElementById(id.slice(1));
    if (!t) return;
    e.preventDefault();
    closeMenu(); closeSheet();
    if (id === '#haut') { lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    scrollToTarget(t);
  });

  /* ---------- Header, odometer, progress ---------- */
  const header = $('#site-header');
  const bar = $('#progress-bar');
  const odo = $('#odo');
  const backTop = $('#back-top');
  const btRing = $('#bt-ring');
  const article = $('#article');
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = !$('#mobile-menu').hidden;
    header.classList.toggle('is-hidden', !menuOpen && y > innerHeight * 0.9 && y > lastY + 2);
    if (y < lastY - 2) header.classList.remove('is-hidden');
    lastY = y;
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (btRing) btRing.style.strokeDashoffset = String(132 * (1 - p));
    backTop?.classList.toggle('is-visible', y > innerHeight * 0.8);
    if (odo && article) {
      const r = article.getBoundingClientRect();
      const ap = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / r.height));
      odo.textContent = String(Math.round(ap * TOTAL_KM)).padStart(3, '0');
    }
  }
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menu-open');
  const menu = $('#mobile-menu');
  function closeMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false');
    lenis?.start();
  }
  menuBtn?.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    if (open) { lenis?.stop(); header.classList.remove('is-hidden'); } else lenis?.start();
  });

  /* ---------- Hero: split word ---------- */
  const word = $('#hero-word');
  if (word && !reduce) {
    $$('.w-row', word).forEach((row) => {
      const txt = row.textContent;
      row.textContent = '';
      [...txt].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; row.appendChild(s); });
    });
    word.classList.add('is-split');
  }

  /* ---------- Hero stats glow (cycles through the four figures) ---------- */
  const stats = $$('.hero-stats .stat');
  const glow = $('.stats-glow');
  if (glow && stats.length && !reduce) {
    let i = 0;
    setInterval(() => {
      i = (i + 1) % stats.length;
      const cols = getComputedStyle($('.hero-stats')).gridTemplateColumns.split(' ').length;
      const col = i % cols, row = Math.floor(i / cols);
      glow.style.transform = `translate(${col * 100}%, ${row * (stats[0].offsetHeight + 16)}px)`;
    }, 2600);
  }

  /* ---------- Counters ---------- */
  function runCounters(scope) {
    $$('.count', scope).forEach((el) => {
      const end = Number(el.dataset.count);
      if (!end || reduce) return;
      const fmt = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ');
      const t0 = performance.now(); const dur = 1800;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(Math.round(end * e));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Ridge profile (stylised, seeded) ---------- */
  const ridgeLine = $('#ridge-line');
  const ridgeArea = $('#ridge-area');
  const walker = $('#ridge-walker');
  let ridgePts = [];
  if (ridgeLine) {
    let seed = 644;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const W = 1200, H = 220, N = 140;
    const peaks = Array.from({ length: 26 }, () => ({ x: rnd(), h: 0.35 + rnd() * 0.65, w: 0.012 + rnd() * 0.035 }));
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      let h = 0.18 + 0.12 * Math.sin(x * Math.PI);
      peaks.forEach((p) => { h += p.h * 0.55 * Math.exp(-Math.pow((x - p.x) / p.w, 2)); });
      h += (rnd() - 0.5) * 0.05;
      h *= x < 0.04 ? x / 0.04 * 0.7 + 0.3 : 1;
      h *= x > 0.95 ? Math.max(0.05, (1 - x) / 0.05) : 1;
      ridgePts.push([x * W, H - Math.min(0.96, h) * H * 0.92]);
    }
    const d = ridgePts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    ridgeLine.setAttribute('d', d);
    ridgeArea.setAttribute('d', d + ` L ${W} ${H} L 0 ${H} Z`);
    const len = ridgeLine.getTotalLength();
    ridgeLine.style.strokeDasharray = String(len);
    const setRidge = (k) => {
      ridgeLine.style.strokeDashoffset = String(len * (1 - k));
      const pt = ridgeLine.getPointAtLength(len * k);
      walker.setAttribute('cx', pt.x); walker.setAttribute('cy', pt.y);
    };
    setRidge(1);
    if (hasGsap && !reduce) {
      const st = { k: 0 };
      setRidge(0.001);
      gsap.to(st, { k: 1, ease: 'none', onUpdate: () => setRidge(st.k), scrollTrigger: { trigger: '.ridge', start: 'top 85%', end: 'bottom 45%', scrub: 0.6 } });
    }
  }

  /* ---------- FreeLock dial ticks ---------- */
  const ticks = $('#dial-ticks');
  if (ticks) {
    const ns = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const r1 = major ? 70 : 76, r2 = 84;
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', 100 + Math.sin(a) * r1); l.setAttribute('y1', 100 - Math.cos(a) * r1);
      l.setAttribute('x2', 100 + Math.sin(a) * r2); l.setAttribute('y2', 100 - Math.cos(a) * r2);
      if (major) l.setAttribute('class', 'major');
      ticks.appendChild(l);
    }
  }

  /* ---------- Motion (GSAP) ---------- */
  if (hasGsap && !reduce) {
    const mm = gsap.matchMedia();

    // Hero intro: photo settles, letters rise between photo and cut-out
    const heroBg = $('.hero-bg'), heroFg = $('.hero-fg');
    const chars = $$('#hero-word .ch');
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, onStart: () => runCounters($('.hero-stats')) });
    intro
      .from([heroBg, heroFg], { scale: 1.14, duration: 2.6, ease: 'power3.out', transformOrigin: '50% 60%' }, 0)
      .from(chars, { yPercent: 115, opacity: 0, rotate: 4, duration: 1.5, stagger: 0.045 }, 0.25)
      .from('.hero-copy > *', { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.7)
      .from('.hero-photo-label', { opacity: 0, x: 20, duration: 1 }, 1.1)
      .from('.hero-stats .stat', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 1)
      .from('.site-header', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.5);

    // Hero scroll depth: photo + cut-out drift together, the word drifts faster and fades
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to([heroBg, heroFg], { yPercent: 9, ease: 'none' }, 0)
      .to('#hero-word', { yPercent: 70, opacity: 0.15, ease: 'none' }, 0)
      .to('.hero-content', { y: -60, opacity: 0, ease: 'none' }, 0);

    // Hero pointer depth (desktop only)
    mm.add('(pointer: fine) and (min-width: 901px)', () => {
      const hero = $('.hero');
      const xW = gsap.quickTo('#hero-word', 'x', { duration: 1.2, ease: 'power3' });
      const xL = gsap.quickTo([heroBg, heroFg], 'x', { duration: 1.4, ease: 'power3' });
      const move = (e) => {
        const k = e.clientX / innerWidth - 0.5;
        xW(k * -26); xL(k * 10);
      };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    });

    // Prologue deck: words light up as you read
    const deck = $('#deck');
    if (deck) {
      const parts = deck.textContent.split(/(\s+)/);
      deck.textContent = '';
      parts.forEach((p) => {
        if (/^\s+$/.test(p)) { deck.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span'); s.className = 'word'; s.textContent = p; deck.appendChild(s);
      });
      gsap.fromTo('#deck .word', { opacity: 0.22 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: deck, start: 'top 82%', end: 'bottom 45%', scrub: true } });
    }

    // Section heads: ghost numbers drift, titles rise
    $$('.sec-head').forEach((h) => {
      const num = $('.sec-num', h);
      if (num) gsap.fromTo(num, { yPercent: 25 }, { yPercent: -25, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from($$('.eyebrow, h2', h), { y: 40, opacity: 0.2, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
    });

    // Generic reveals (start from a visible, slightly lowered state)
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 50, opacity: 0.25, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // Parallax elements
    $$('[data-speed]').forEach((el) => {
      const s = Number(el.dataset.speed) || 0;
      gsap.fromTo(el, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Feature photos: inner parallax
    $$('.feature-media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.closest('.feature'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.ghost').forEach((g) => {
      gsap.fromTo(g, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: g.closest('.feature'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Weight bars
    gsap.from('.weigh-bar i', { scaleX: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.weigh', start: 'top 80%', once: true } });
    gsap.from('.litres i', { scaleX: 0, transformOrigin: 'left', duration: 1.4, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.range-row', start: 'top 80%', once: true } });

    // Interlude word slides across
    gsap.fromTo('.interlude-word', { xPercent: 12 }, { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.interlude', start: 'top bottom', end: 'bottom top', scrub: true } });

    // FreeLock dial turns with the scroll
    gsap.fromTo('#dial', { rotate: -90 }, { rotate: 270, ease: 'none', scrollTrigger: { trigger: '.spotlight', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });

    // Verdict scene: the word sits between sea and Malik
    gsap.fromTo('.vs-word', { yPercent: 40, opacity: 0.3 }, { yPercent: -10, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.verdict-scene', start: 'top 90%', end: 'center 45%', scrub: true } });
    gsap.fromTo('.vs-bg', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.verdict-scene', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Contact backdrop
    gsap.fromTo('.contact-inner > *', { y: 40, opacity: 0.25 }, { y: 0, opacity: 1, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 75%', once: true } });

    // Footer word
    gsap.fromTo('.footer-word', { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Re-measure once images settle
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    runCounters($('.hero-stats'));
  }

  /* ---------- Context scrollytelling ---------- */
  const steps = $$('.story-step');
  const frames = $$('.story-frame img');
  const storyIndex = $('#story-index');
  if (steps.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = en.target.dataset.step;
        steps.forEach((s) => s.classList.toggle('is-on', s === en.target));
        frames.forEach((f) => f.classList.toggle('is-on', f.dataset.step === i));
        if (storyIndex) storyIndex.textContent = String(Number(i) + 1).padStart(2, '0');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------- Chapter rail + mobile pill ---------- */
  const rail = $('#toc-rail');
  const railLinks = $$('#toc-rail a');
  const pill = $('#toc-pill');
  const sheet = $('#toc-sheet');
  const chapters = $$('.chapter[data-title]');
  if (sheet && rail) sheet.innerHTML = rail.querySelector('ol').innerHTML.replace(/<li>|<\/li>/g, '');
  const sheetLinks = $$('a', sheet || document.createElement('div'));
  function setActive(id) {
    railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    sheetLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    const a = railLinks.find((l) => l.getAttribute('href') === '#' + id);
    if (a && pill) { $('#toc-pill-num').textContent = a.querySelector('span').textContent; $('#toc-pill-label').textContent = a.textContent.replace(a.querySelector('span').textContent, '').trim(); }
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    chapters.forEach((c) => io.observe(c));
    const vis = new IntersectionObserver(([en]) => {
      rail?.classList.toggle('is-visible', en.isIntersecting);
      pill?.classList.toggle('is-visible', en.isIntersecting);
      if (!en.isIntersecting) closeSheet();
    }, { rootMargin: '-30% 0px -30% 0px' });
    if (article) vis.observe(article);
  }
  function closeSheet() { if (sheet && !sheet.hidden) { sheet.hidden = true; pill.setAttribute('aria-expanded', 'false'); } }
  pill?.addEventListener('click', () => {
    const open = sheet.hidden;
    sheet.hidden = !open; pill.setAttribute('aria-expanded', String(open));
  });

  /* ---------- FreeLock video ---------- */
  const video = $('#freelock-demo');
  const vToggle = $('#video-toggle');
  let userPaused = false;
  if (video && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !userPaused && !reduce) { video.play().catch(() => vToggle?.classList.add('is-paused')); }
      else if (!en.isIntersecting) video.pause();
    }, { threshold: 0.35 });
    io.observe(video);
    if (reduce) vToggle?.classList.add('is-paused');
  }
  vToggle?.addEventListener('click', () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); vToggle.classList.remove('is-paused'); vToggle.setAttribute('aria-label', 'Mettre la vidéo en pause'); }
    else { userPaused = true; video.pause(); vToggle.classList.add('is-paused'); vToggle.setAttribute('aria-label', 'Lire la vidéo'); }
  });
  video?.addEventListener('play', () => vToggle?.classList.remove('is-paused'));
  video?.addEventListener('pause', () => vToggle?.classList.add('is-paused'));

  /* ---------- Improvement pins ↔ list ---------- */
  const board = $('.board');
  const pins = $$('.pin');
  const ideas = $$('.ideas li');
  function activate(n, scrollTo) {
    pins.forEach((p) => p.classList.toggle('is-active', p.dataset.s === n));
    ideas.forEach((li) => li.classList.toggle('is-active', li.dataset.s === n));
    board?.classList.toggle('has-active', !!n);
    if (scrollTo === 'idea') { const li = $(`#suggestion-${n}`); if (li && innerWidth < 900) scrollToTarget(li); }
    if (scrollTo === 'pin') { const p = pins.find((x) => x.dataset.s === n); if (p && innerWidth < 900) scrollToTarget(p.closest('.board-view')); }
  }
  pins.forEach((p) => p.addEventListener('click', () => activate(p.dataset.s, 'idea')));
  ideas.forEach((li) => {
    li.querySelector('button').addEventListener('click', () => activate(li.dataset.s, 'pin'));
    li.addEventListener('mouseenter', () => { if (matchMedia('(pointer: fine)').matches) activate(li.dataset.s); });
  });

  /* ---------- Gallery rail ---------- */
  const railEl = $('#rail');
  const track = $('#rail-track');
  const pauseBtn = $('#gallery-pause');
  let autoplay = !reduce;
  if (railEl && track) {
    // clone once for a seamless loop
    const originals = $$('figure', track);
    originals.forEach((f) => { const c = f.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('button', c).forEach((b) => b.tabIndex = -1); track.appendChild(c); });
    let hover = false, dragging = false, startX = 0, startScroll = 0, moved = 0, inView = false;
    const half = () => track.scrollWidth / 2;
    const wrap = () => { if (railEl.scrollLeft >= half()) railEl.scrollLeft -= half(); if (railEl.scrollLeft < 0) railEl.scrollLeft += half(); };
    let last = performance.now();
    const loop = (t) => {
      const dt = Math.min(48, t - last); last = t;
      if (autoplay && !hover && !dragging && inView) { railEl.scrollLeft += dt * 0.045; wrap(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; }).observe(railEl);
    railEl.addEventListener('mouseenter', () => { hover = true; });
    railEl.addEventListener('mouseleave', () => { hover = false; });
    railEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      dragging = true; moved = 0; startX = e.clientX; startScroll = railEl.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX; moved = Math.abs(dx);
      if (moved > 4) railEl.classList.add('is-dragging');
      railEl.scrollLeft = startScroll - dx; wrap();
    });
    window.addEventListener('pointerup', () => { if (!dragging) return; dragging = false; setTimeout(() => railEl.classList.remove('is-dragging'), 0); });
    railEl.addEventListener('touchstart', () => { hover = true; }, { passive: true });
    railEl.addEventListener('touchend', () => { setTimeout(() => { hover = false; }, 2500); }, { passive: true });
    const step = () => Math.min(railEl.clientWidth * 0.8, 900);
    $('#gallery-next')?.addEventListener('click', () => railEl.scrollBy({ left: step(), behavior: 'smooth' }));
    $('#gallery-prev')?.addEventListener('click', () => { if (railEl.scrollLeft < step()) railEl.scrollLeft += half(); railEl.scrollBy({ left: -step(), behavior: 'smooth' }); });
    railEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { railEl.scrollBy({ left: 300, behavior: 'smooth' }); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { railEl.scrollBy({ left: -300, behavior: 'smooth' }); e.preventDefault(); }
    });
    if (pauseBtn) {
      if (reduce) { pauseBtn.textContent = 'Lancer le défilement'; pauseBtn.setAttribute('aria-pressed', 'true'); }
      pauseBtn.addEventListener('click', () => {
        autoplay = !autoplay;
        pauseBtn.textContent = autoplay ? 'Mettre en pause' : 'Lancer le défilement';
        pauseBtn.setAttribute('aria-pressed', String(!autoplay));
      });
    }
  }

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img'), lbCap = $('#lb-caption'), lbCount = $('#lb-count');
  let group = [], idx = 0;
  function showLb(i) {
    idx = (i + group.length) % group.length;
    const b = group[idx];
    lbImg.src = b.dataset.zoom;
    lbImg.alt = b.dataset.caption || '';
    lbCap.textContent = b.dataset.caption || '';
    lbCount.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(group.length).padStart(2, '0')}`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.zoomable');
    if (!b || !lb) return;
    if (b.closest('.rail.is-dragging')) return;
    const inRail = b.closest('#rail-track');
    group = inRail ? $$('.zoomable', track).filter((x) => !x.closest('[aria-hidden="true"]')) : $$('.zoomable').filter((x) => !x.closest('#rail-track'));
    let i = group.indexOf(b);
    if (i < 0) { const src = b.dataset.zoom; i = group.findIndex((x) => x.dataset.zoom === src); }
    showLb(Math.max(0, i));
    lb.showModal(); lenis?.stop();
  });
  $('#lb-prev')?.addEventListener('click', () => showLb(idx - 1));
  $('#lb-next')?.addEventListener('click', () => showLb(idx + 1));
  lb?.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') showLb(idx - 1); if (e.key === 'ArrowRight') showLb(idx + 1); });
  lb?.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  let tx = 0;
  lb?.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb?.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) showLb(idx + (dx < 0 ? 1 : -1)); }, { passive: true });

  $$('dialog').forEach((d) => {
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => d.close()));
    d.addEventListener('close', () => lenis?.start());
  });

  /* ---------- Search ---------- */
  const search = $('#search');
  const q = $('#query');
  const results = $('#results');
  const index = [];
  const seen = new Set();
  // most specific blocks first, so each paragraph is indexed once under its closest heading
  $$('#freelock-detail, #couture-reparation, .chapter[id], #contact').forEach((sec) => {
    const title = sec.dataset.title || sec.querySelector('h2, h3')?.textContent.trim() || '';
    $$('p, li, h3, h4, dd, summary', sec).forEach((el) => {
      if (seen.has(el)) return;
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (text.length > 14) { seen.add(el); index.push({ id: sec.id, title, text, el }); }
    });
  });
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function render(term) {
    const t = norm(term.trim());
    if (t.length < 2) { results.innerHTML = '<p class="empty">Essaie « FreeLock », « couture », « roll-top » ou « poids ».</p>'; return; }
    const hits = index.filter((x) => norm(x.text).includes(t)).slice(0, 8);
    if (!hits.length) { results.innerHTML = `<p class="empty">Rien trouvé pour « ${esc(term)} ».</p>`; return; }
    results.innerHTML = '';
    hits.forEach((h, n) => {
      const nt = norm(h.text); const at = nt.indexOf(t);
      const from = Math.max(0, at - 50);
      let snippet = h.text.slice(from, at + t.length + 90);
      const local = norm(snippet).indexOf(t);
      snippet = esc(snippet.slice(0, local)) + '<mark>' + esc(snippet.slice(local, local + t.length)) + '</mark>' + esc(snippet.slice(local + t.length));
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.innerHTML = `<span>${esc(h.title)}</span><p>${from > 0 ? '…' : ''}${snippet}…</p>`;
      a.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        search.close();
        const det = h.el.closest('details'); if (det) det.open = true;
        const target = h.el.closest('.story-step, .feature, .ledger-row, li, .v-col, .fit-card, .sheet, .seam-story, .spotlight') || h.el;
        setTimeout(() => { scrollToTarget(target); target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash'); }, 60);
      });
      results.appendChild(a);
    });
  }
  function openSearch() { if (!search) return; search.showModal(); lenis?.stop(); q.value = ''; render(''); setTimeout(() => q.focus(), 30); }
  $('#search-open')?.addEventListener('click', openSearch);
  q?.addEventListener('input', () => render(q.value));
  search?.addEventListener('click', (e) => { if (e.target === search) search.close(); });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
    if (e.key === 'Escape') { closeMenu(); closeSheet(); }
  });

  /* ---------- Comment form ---------- */
  const form = $('#comment-form');
  const toast = $('#toast');
  function say(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('is-on'), 2400); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  }
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#name').value.trim(), msg = $('#message').value.trim();
    const err = $('#form-error');
    if (!name || !msg) { err.hidden = false; (!name ? $('#name') : $('#message')).focus(); return; }
    err.hidden = true;
    const subject = `Retour sur le test Raidlight Ultralight 24–30 L`;
    const body = `Salut Malik,\n\n${msg}\n\n${name}`;
    $('#mp-body').textContent = `Objet : ${subject}\n\n${body}`;
    $('#mp-open').href = `mailto:malik.latrouite@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#comment-preview').hidden = false;
    $('#mp-copy').onclick = async () => { say((await copyText(`${subject}\n\n${body}`)) ? 'Message copié' : 'Sélectionne le texte pour le copier'); };
  });
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    say((await copyText(b.dataset.copy)) ? 'Adresse copiée' : 'Sélectionne l’adresse pour la copier');
  }));
})();
