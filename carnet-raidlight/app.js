/* Carnet d’Endurance — interactions & motion */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

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

  /* ---------- Header, progress ---------- */
  const header = $('#site-header');
  const bar = $('#progress-bar');
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
    if (!menuOpen && y > innerHeight * 0.9 && y > lastY + 2) header.classList.add('is-hidden');
    if (y < lastY - 2 || y < innerHeight * 0.9) header.classList.remove('is-hidden');
    lastY = y;
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (btRing) btRing.style.strokeDashoffset = String(132 * (1 - p));
    backTop?.classList.toggle('is-visible', y > innerHeight * 0.8);
  }
  if (lenis) lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Background hue per chapter ---------- */
  /* Journey: the section crossing mid-screen sets both the ground colour and the landscape
     shown in the fixed band; the next landscape on the route is preloaded. */
  const journey = $('#journey');
  const scenes = journey ? Object.fromEntries($$('img[data-scene]', journey).map((img) => [img.dataset.scene, img])) : {};
  const sceneOrder = $$('[data-scene]:not(img)').map((el) => el.dataset.scene);
  const loadScene = (name) => { const img = scenes[name]; if (img && !img.getAttribute('src')) img.src = img.dataset.src; };
  let currentScene = null;
  function setScene(name, strength) {
    if (!journey) return;
    journey.style.setProperty('--jo', strength);
    if (name === currentScene) return;
    currentScene = name;
    loadScene(name);
    const i = sceneOrder.indexOf(name);
    const next = sceneOrder.slice(i + 1).find((n) => n !== name && n !== 'none');
    if (next) loadScene(next);
    Object.entries(scenes).forEach(([n, img]) => img.classList.toggle('is-on', n === name));
  }
  const bgSections = $$('[data-bg]');
  if (bgSections.length && 'IntersectionObserver' in window) {
    const bgIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        document.body.style.backgroundColor = en.target.dataset.bg;
        if (en.target.dataset.scene) setScene(en.target.dataset.scene, en.target.dataset.sceneO || '.5');
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    bgSections.forEach((s) => bgIO.observe(s));
  }
  if (journey && !reduce) {
    let jt = false;
    const drift = () => {
      jt = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      journey.style.setProperty('--jy', `${(3 - (max > 0 ? scrollY / max : 0) * 6).toFixed(2)}vh`);
    };
    addEventListener('scroll', () => { if (!jt) { jt = true; requestAnimationFrame(drift); } }, { passive: true });
  }

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
    // split every text node into letters, keeping nested spans (the size in gold) and spaces
    const splitNode = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 1) { splitNode(n); return; }
        if (n.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach((c) => {
          if (/\s/.test(c)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; frag.appendChild(s);
        });
        n.replaceWith(frag);
      });
    };
    $$('.w-row', word).forEach(splitNode);
    word.classList.add('is-split');
  }

  /* ---------- Hero stats glow ---------- */
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
        el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - k, 4))));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- FreeLock knob: turns with the page, and by hand ---------- */
  const knob = $('#knob');
  const knobFace = $('#knob-face');
  const knobRibs = $('.knob-ribs');
  const dirTight = $('.knob-tight');
  const dirLoose = $('.knob-loose');
  let scrollAngle = 0, handAngle = 0, lastAngle = 0, dirTimer = 0;
  function paintKnob() {
    const a = scrollAngle + handAngle;
    const tr = `rotate(${a}deg)`;
    if (knobFace) knobFace.style.transform = tr;
    if (knobRibs) knobRibs.style.transform = tr;
    const d = a - lastAngle;
    if (Math.abs(d) > 0.3) {
      dirTight?.classList.toggle('is-on', d > 0);
      dirLoose?.classList.toggle('is-on', d < 0);
      clearTimeout(dirTimer);
      dirTimer = setTimeout(() => { dirTight?.classList.remove('is-on'); dirLoose?.classList.remove('is-on'); }, 700);
    }
    lastAngle = a;
  }
  if (knob) {
    let dragging = false, prev = 0;
    const angleAt = (e) => { const r = knob.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    knob.addEventListener('pointerdown', (e) => { dragging = true; prev = angleAt(e); knob.setPointerCapture(e.pointerId); });
    knob.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const a = angleAt(e); let d = a - prev; if (d > 180) d -= 360; if (d < -180) d += 360;
      prev = a; handAngle += d; paintKnob();
    });
    const stop = () => { dragging = false; };
    knob.addEventListener('pointerup', stop); knob.addEventListener('pointercancel', stop);
    knob.tabIndex = 0;
    knob.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { handAngle += 15; paintKnob(); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { handAngle -= 15; paintKnob(); e.preventDefault(); }
    });
  }

  /* ---------- Motion (GSAP) ---------- */
  if (hasGsap && !reduce) {
    const mm = gsap.matchMedia();
    const heroLand = $('.hero-land'), heroFg = $('.hero-fg');
    const chars = $$('#hero-word .ch');

    // Hero intro: photo settles, letters rise behind the subject
    gsap.timeline({ defaults: { ease: 'expo.out' }, onStart: () => runCounters($('.hero-stats')) })
      .from(heroLand, { scale: 1.16, duration: 2.8, ease: 'power3.out' }, 0)
      .from(heroFg, { scale: 1.08, yPercent: 4, duration: 2.4, ease: 'power3.out', transformOrigin: '50% 100%' }, 0)
      .from(chars, { yPercent: 110, opacity: 0, duration: 1.4, stagger: 0.035 }, 0.25)
      .from('.hero-copy > *', { y: 28, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.7)
      .from('.hero-photo-label', { opacity: 0, x: 20, duration: 1 }, 1.1)
      .from('.hero-stats .stat', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 1)
      .from('.site-header', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.5);

    // Hero scroll depth: photo + cut-out drift together, the word drifts faster
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to(heroLand, { yPercent: 14, ease: 'none' }, 0)
      .to('#hero-word', { yPercent: 55, opacity: 0.2, ease: 'none' }, 0)
      .to(heroFg, { yPercent: 4, ease: 'none' }, 0)
      .to('.hero-content', { y: -60, opacity: 0, ease: 'none' }, 0);

    mm.add('(pointer: fine) and (min-width: 901px)', () => {
      const hero = $('.hero');
      const xW = gsap.quickTo('#hero-word', 'x', { duration: 1.2, ease: 'power3' });
      const xB = gsap.quickTo(heroLand, 'x', { duration: 1.6, ease: 'power3' });
      const xF = gsap.quickTo(heroFg, 'x', { duration: 1.3, ease: 'power3' });
      const move = (e) => { const k = e.clientX / innerWidth - 0.5; xB(k * 10); xW(k * -18); xF(k * -34); };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    });

    // Prologue: words light up as you read
    const deck = $('#deck');
    if (deck) {
      const parts = deck.textContent.split(/(\s+)/);
      deck.textContent = '';
      parts.forEach((p) => {
        if (/^\s+$/.test(p)) { deck.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span'); s.className = 'word'; s.textContent = p; deck.appendChild(s);
      });
      gsap.fromTo('#deck .word', { opacity: 0.25 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: deck, start: 'top 82%', end: 'bottom 50%', scrub: true } });
    }

    // Section titles rise
    $$('.sec-head').forEach((h) => {
      gsap.from($$('.eyebrow, h2', h), { y: 40, opacity: 0.2, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });

    // Generic reveals, from a visible lowered state
    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 50, opacity: 0.25, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });

    // Parallax helpers
    $$('[data-speed]').forEach((el) => {
      const s = Number(el.dataset.speed) || 0;
      gsap.fromTo(el, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.feature-media img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.closest('.feature'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Bars
    gsap.from('.weigh-bar i', { scaleX: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.weigh', start: 'top 85%', once: true } });
    gsap.from('.litres i', { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.range-row', start: 'top 80%', once: true } });

    // Knob follows the scroll
    if (knob) {
      const st = { a: 0 };
      gsap.to(st, { a: 540, ease: 'none', onUpdate: () => { scrollAngle = st.a; paintKnob(); }, scrollTrigger: { trigger: '.spotlight', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
    }

    // Verdict scene
    gsap.fromTo('.vs-word', { yPercent: 40, opacity: 0.3 }, { yPercent: -10, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.verdict-scene', start: 'top 90%', end: 'center 45%', scrub: true } });
    // photo and its cut-out zoom as ONE layer so they never drift apart
    gsap.fromTo(['.vs-bg', '.vs-fg'], { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.verdict-scene', start: 'top bottom', end: 'bottom top', scrub: true } });

    gsap.fromTo('.contact-inner > *', { y: 40, opacity: 0.25 }, { y: 0, opacity: 1, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 75%', once: true } });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  } else {
    runCounters($('.hero-stats'));
  }

  /* ---------- Vignette cards: gentle 3D tilt ---------- */
  if (finePointer && !reduce) {
    $$('.vcard').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `translateY(-6px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  }

  /* ---------- Context scrollytelling ---------- */
  const steps = $$('.story-step');
  const frames = $$('.story-frame .frame-item');
  const dots = $$('.story-dots span');
  if (steps.length) {
    /* Each paragraph stays fully lit while it is being read: it brightens as it
       climbs into the screen and only dims once its LAST line has gone past the
       upper third. The photo only changes once the next paragraph has climbed past mid-screen,
       i.e. when the previous one has been read. */
    const story = $('.story');
    const ramp = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
    let current = '0', ticking = false;
    const update = () => {
      ticking = false;
      const H = innerHeight;
      let active = steps[0].dataset.step;
      steps.forEach((s) => {
        const r = s.getBoundingClientRect();
        const lit = Math.min(ramp(H * .96 - r.top, 0, H * .26), ramp(r.bottom, H * .06, H * .3));
        s.style.setProperty('--lit', (.32 + .68 * lit).toFixed(3));
        if (r.top < H * .5) active = s.dataset.step;
      });
      if (active !== current) {
        current = active;
        steps.forEach((s) => s.classList.toggle('is-on', s.dataset.step === active));
        frames.forEach((f) => f.classList.toggle('is-on', f.dataset.step === active));
        dots.forEach((d, n) => d.classList.toggle('is-on', String(n) === active));
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    if (story && 'IntersectionObserver' in window) {
      let live = false;
      new IntersectionObserver(([en]) => {
        if (en.isIntersecting && !live) { live = true; addEventListener('scroll', onScroll, { passive: true }); update(); }
        else if (!en.isIntersecting && live) { live = false; removeEventListener('scroll', onScroll); }
      }).observe(story);
    } else { addEventListener('scroll', onScroll, { passive: true }); }
    addEventListener('resize', onScroll);
    update();
  }

  /* ---------- Side contents + mobile pill ---------- */
  const rail = $('#toc-rail');
  const railLinks = $$('#toc-rail a');
  const pill = $('#toc-pill');
  const sheet = $('#toc-sheet');
  const chapters = $$('.chapter[data-title]');
  if (sheet && rail) railLinks.forEach((a) => { const c = a.cloneNode(true); sheet.appendChild(c); });
  const sheetLinks = $$('a', sheet || document.createElement('div'));
  function setActive(id) {
    railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    sheetLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    const a = railLinks.find((l) => l.getAttribute('href') === '#' + id);
    if (a) $('#toc-pill-label').textContent = a.textContent;
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting && en.target.id && railLinks.some((l) => l.getAttribute('href') === '#' + en.target.id)) setActive(en.target.id); });
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
  pill?.addEventListener('click', () => { const open = sheet.hidden; sheet.hidden = !open; pill.setAttribute('aria-expanded', String(open)); });

  /* ---------- Instagram reel: embed when the host allows it, link card otherwise ---------- */
  const reelFrame = $('.reel-frame');
  const reelIframe = reelFrame?.querySelector('iframe');
  if (reelFrame && reelIframe) {
    let alive = false;
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://www.instagram.com') return;
      alive = true;
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'MEASURE' && d.details && d.details.height > 200) {
          reelFrame.style.aspectRatio = 'auto';
          reelFrame.style.height = d.details.height + 'px';
        }
      } catch (_) { /* not JSON */ }
    });
    const giveUp = () => { if (!alive && reelIframe.isConnected) reelIframe.remove(); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); setTimeout(giveUp, 7000); } });
      io.observe(reelFrame);
    } else setTimeout(giveUp, 9000);
  }

  /* ---------- FreeLock video ---------- */
  const video = $('#freelock-demo');
  const vToggle = $('#video-toggle');
  let userPaused = false;
  if (video && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      if (en.isIntersecting && !userPaused && !reduce) video.play().catch(() => vToggle?.classList.add('is-paused'));
      else if (!en.isIntersecting) video.pause();
    }, { threshold: 0.35 }).observe(video);
    if (reduce) vToggle?.classList.add('is-paused');
  }
  vToggle?.addEventListener('click', () => {
    if (video.paused) { userPaused = false; video.play().catch(() => {}); vToggle.setAttribute('aria-label', 'Mettre la vidéo en pause'); }
    else { userPaused = true; video.pause(); vToggle.setAttribute('aria-label', 'Lire la vidéo'); }
  });
  video?.addEventListener('play', () => vToggle?.classList.remove('is-paused'));
  video?.addEventListener('pause', () => vToggle?.classList.add('is-paused'));

  /* ---------- Improvement pins: the idea appears on the photo ---------- */
  const improve = $('.improve');
  const pins = $$('.pin');
  const ideas = {};
  $$('#ideas li').forEach((li) => { ideas[li.dataset.s] = { title: li.querySelector('strong').textContent, text: li.querySelector('span').textContent }; });
  if (improve && pins.length) {
    improve.classList.add('js-pins');
    const closeAll = () => {
      pins.forEach((p) => { p.classList.remove('is-active'); p.setAttribute('aria-expanded', 'false'); });
      $$('.pin-note').forEach((n) => { n.hidden = true; n.innerHTML = ''; n.parentElement.classList.remove('has-note'); });
    };
    pins.forEach((p) => p.addEventListener('click', () => {
      const wasActive = p.classList.contains('is-active');
      closeAll();
      if (wasActive) return;
      const idea = ideas[p.dataset.s]; if (!idea) return;
      const box = p.closest('.annotated');
      const note = $('.pin-note', box);
      note.innerHTML = `<div class="pn-head"><span class="pn-n">${p.dataset.s}</span><strong></strong></div><p></p><button class="pn-close" type="button" aria-label="Fermer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
      note.querySelector('strong').textContent = idea.title;
      note.querySelector('p').textContent = idea.text;
      note.querySelector('.pn-close').addEventListener('click', closeAll);
      const y = parseFloat(getComputedStyle(p).getPropertyValue('--y')) || 0;
      note.classList.toggle('at-top', y > 55);
      note.hidden = false;
      box.classList.add('has-note');
      p.classList.add('is-active'); p.setAttribute('aria-expanded', 'true');
    }));
  }

  /* ---------- Gallery rail ---------- */
  const railEl = $('#rail');
  const track = $('#rail-track');
  const pauseBtn = $('#gallery-pause');
  let autoplay = !reduce;
  if (railEl && track) {
    $$('figure', track).forEach((f) => { const c = f.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('button', c).forEach((b) => b.tabIndex = -1); track.appendChild(c); });
    let hover = false, dragging = false, startX = 0, startScroll = 0, inView = false;
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
    railEl.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; dragging = true; startX = e.clientX; startScroll = railEl.scrollLeft; });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) railEl.classList.add('is-dragging');
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
    lbCount.textContent = `${idx + 1} / ${group.length}`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.zoomable');
    if (!b || !lb) return;
    if (b.closest('.rail.is-dragging')) return;
    const inRail = b.closest('#rail-track');
    group = inRail ? $$('.zoomable', track).filter((x) => !x.closest('[aria-hidden="true"]')) : $$('.zoomable').filter((x) => !x.closest('#rail-track'));
    let i = group.indexOf(b);
    if (i < 0) i = group.findIndex((x) => x.dataset.zoom === b.dataset.zoom);
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
    hits.forEach((h) => {
      const at = norm(h.text).indexOf(t);
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
        const target = h.el.closest('.story-step, .feature, .ledger-row, .v-col, .fit-card, .sheet, .seam-story, .spotlight, .vcard, .board') || h.el;
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

  /* ---------- Mail (address never written in the page) ---------- */
  const mailBtn = $('.mail-btn');
  const address = mailBtn ? mailBtn.dataset.mail.split('').reverse().join('') : '';
  const toast = $('#toast');
  function say(msg) { if (!toast) return; toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('is-on'), 2600); }
  function openMail(subject, body) {
    let url = 'mailto:' + address;
    const qs = [];
    if (subject) qs.push('subject=' + encodeURIComponent(subject));
    if (body) qs.push('body=' + encodeURIComponent(body));
    if (qs.length) url += '?' + qs.join('&');
    window.location.href = url;
  }
  mailBtn?.addEventListener('click', () => openMail('Proposition de test pour Carnet d’Endurance', ''));

  /* ---------- Comment form ---------- */
  const form = $('#comment-form');
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  }
  let mailDraft = null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#name').value.trim(), msg = $('#message').value.trim();
    const err = $('#form-error');
    if (!name || !msg) { err.hidden = false; (!name ? $('#name') : $('#message')).focus(); return; }
    err.hidden = true;
    mailDraft = { subject: 'Retour sur le test Raidlight Ultralight 24–30 L', body: `Salut Malik,\n\n${msg}\n\n${name}` };
    $('#mp-body').textContent = `Objet : ${mailDraft.subject}\n\n${mailDraft.body}`;
    $('#comment-preview').hidden = false;
  });
  $('#mp-open')?.addEventListener('click', () => { if (mailDraft) openMail(mailDraft.subject, mailDraft.body); });
  $('#mp-copy')?.addEventListener('click', async () => {
    if (!mailDraft) return;
    say((await copyText(`${mailDraft.subject}\n\n${mailDraft.body}`)) ? 'Message copié' : 'Sélectionne le texte pour le copier');
  });
})();
