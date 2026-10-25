(function () {
  'use strict';

  window.__animReady = true;

  const C = window.SITE_CONFIG || {};
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const animate = hasGsap && !reduceMotion;
  if (!animate) root.classList.remove('anim');

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const get = (path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), C);

  const waLink = (msg) =>
    `https://wa.me/${C.whatsappNumber || ''}?text=${encodeURIComponent(msg || C.defaultMessage || '')}`;

  /* ---------- Analytics ---------- */
  function initAnalytics() {
    const a = C.analytics || {};
    if (a.ga4Id) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(a.ga4Id)}`;
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', a.ga4Id);
    }
    if (a.metaPixelId) {
      /* eslint-disable */
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      window.fbq('init', a.metaPixelId);
      window.fbq('track', 'PageView');
    }
  }

  function track(event, source) {
    if (window.gtag) window.gtag('event', event, { source });
    if (window.fbq) window.fbq('track', 'Contact', { source });
  }

  /* ---------- Config → page ---------- */
  function bindConfig() {
    $$('[data-config]').forEach((el) => {
      const v = get(el.dataset.config);
      if (v != null && v !== '') el.textContent = v;
    });
    $$('[data-config-list]').forEach((el) => {
      const v = get(el.dataset.configList);
      if (Array.isArray(v)) el.textContent = v.join(', ');
    });
    $$('[data-config-items]').forEach((el) => {
      const v = get(el.dataset.configItems);
      if (!Array.isArray(v)) return;
      el.replaceChildren(...v.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      }));
    });
    $$('[data-config-href]').forEach((el) => {
      const v = get(el.dataset.configHref);
      if (!v) return;
      el.href = v;
      el.target = '_blank';
      el.rel = 'noopener';
    });
    $$('[data-social]').forEach((li) => {
      const url = C.social && C.social[li.dataset.social];
      if (!url) return;
      li.hidden = false;
      $('a', li).href = url;
    });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    const bar = $('[data-preview-bar]');
    if (bar) bar.hidden = !C.previewMode;

    if (C.businessName && !C.businessName.startsWith('[')) {
      document.title = `${C.businessName} | התקנה, תיקון וניקוי מזגנים`;
    }
  }

  function bindLinks() {
    $$('[data-wa]').forEach((a) => {
      const msg = a.dataset.waConfig ? get(a.dataset.waConfig) : a.dataset.waMessage;
      a.href = waLink(msg);
      a.target = '_blank';
      a.rel = 'noopener';
      // The form link tracks only after validation passes.
      if (a.id !== 'lead-submit') {
        a.addEventListener('click', () => track('whatsapp_click', a.dataset.waSource || 'unknown'));
      }
    });
    $$('[data-tel]').forEach((a) => {
      a.href = `tel:${C.phoneIntl || ''}`;
      a.addEventListener('click', () => track('phone_click', 'tel'));
    });
  }

  function injectSchema() {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'HVACBusiness',
      name: C.businessName,
      telephone: C.phoneIntl,
      areaServed: (C.serviceAreas || []).map((name) => ({ '@type': 'City', name })),
    };
    if (C.siteUrl) data.url = C.siteUrl;
    if (C.address) data.address = C.address;
    const sameAs = Object.values(C.social || {}).filter(Boolean);
    if (sameAs.length) data.sameAs = sameAs;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ---------- Header ---------- */
  function initHeader() {
    const header = $('#site-header');
    const progress = $('.scroll-progress span');
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 30);
      const max = root.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();

    const toggle = $('.nav-toggle');
    const nav = $('#main-nav');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ---------- Components ---------- */
  function initMarquee() {
    const track = $('.marquee-track');
    if (!track || reduceMotion) return;
    // Duplicate the list so the loop is seamless.
    $$('li', track).forEach((li) => {
      const clone = li.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  }

  function setCount(el, value) {
    const dec = Number(el.dataset.decimals || 0);
    el.textContent = Number(value).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function initBeforeAfter() {
    $$('[data-ba]').forEach((ba) => {
      const range = $('.ba-range', ba);
      const set = () => ba.style.setProperty('--pos', `${range.value}%`);
      range.addEventListener('input', set);
      set();
    });
  }

  function initCarousel() {
    const track = $('#reviews-track');
    if (!track) return;
    const prev = $('.carousel-btn[data-dir="prev"]');
    const next = $('.carousel-btn[data-dir="next"]');
    const step = () => {
      const card = $('.review', track);
      return card ? card.getBoundingClientRect().width + 20 : 300;
    };
    const update = () => {
      // In RTL scrollLeft runs from 0 to a negative number.
      const max = track.scrollWidth - track.clientWidth;
      const x = Math.abs(track.scrollLeft);
      prev.disabled = x < 4;
      next.disabled = x > max - 4;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: step() }));
    next.addEventListener('click', () => track.scrollBy({ left: -step() }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initFaq() {
    $$('.faq details').forEach((d) => {
      const summary = $('summary', d);
      const body = $('.faq-body', d);
      summary.addEventListener('click', (e) => {
        if (!animate) return;
        e.preventDefault();
        if (d.dataset.busy) return;
        d.dataset.busy = '1';
        if (d.open) {
          d.classList.add('is-closing');
          gsap.to(body, {
            height: 0, opacity: 0, duration: 0.35, ease: 'power2.inOut',
            onComplete: () => {
              d.open = false;
              d.classList.remove('is-closing');
              gsap.set(body, { clearProps: 'height,opacity' });
              delete d.dataset.busy;
            },
          });
        } else {
          d.open = true;
          gsap.fromTo(body, { height: 0, opacity: 0 }, {
            height: 'auto', opacity: 1, duration: 0.45, ease: 'power2.out',
            onComplete: () => {
              gsap.set(body, { clearProps: 'height' });
              delete d.dataset.busy;
            },
          });
        }
      });
    });
  }

  function initLeadForm() {
    const form = $('#lead-form');
    if (!form) return;
    const name = $('#lead-name');
    const city = $('#lead-city');
    const service = $('#lead-service');
    const room = $('#lead-room');
    const notes = $('#lead-notes');
    const submit = $('#lead-submit');
    const roomField = $('[data-room-field]');
    const roomHint = $('[data-room-hint]');

    const nameOk = () => name.value.trim().length > 1;
    const serviceOk = () => !!service.value;

    const buildMessage = () => {
      const lines = ['היי, הגעתי מהאתר ואשמח לקבל הצעת מחיר.'];
      if (name.value.trim()) lines.push(`שם: ${name.value.trim()}`);
      if (city.value.trim()) lines.push(`עיר: ${city.value.trim()}`);
      if (service.value) lines.push(`שירות: ${service.value}`);
      if (!roomField.hidden && room.value) lines.push(`גודל החדר: ${room.selectedOptions[0].text} (הערכה: ${room.value})`);
      if (notes.value.trim()) lines.push(`פרטים: ${notes.value.trim()}`);
      return lines.join('\n');
    };

    const showError = (input, show) => {
      const err = document.getElementById(`${input.id}-error`);
      input.setAttribute('aria-invalid', String(show));
      if (!err) return;
      err.hidden = !show;
      if (show) input.setAttribute('aria-describedby', err.id);
      else input.removeAttribute('aria-describedby');
    };

    const refresh = () => {
      const isInstall = service.value === 'התקנת מזגן חדש';
      roomField.hidden = !isInstall;
      roomHint.hidden = !(isInstall && room.value);
      if (room.value) {
        $('strong', roomHint).textContent = room.value === 'מיני-מרכזי' ? 'כנראה מערכת מיני-מרכזי' : `מזגן ${room.value}`;
      }
      if (name.getAttribute('aria-invalid') === 'true' && nameOk()) showError(name, false);
      if (service.getAttribute('aria-invalid') === 'true' && serviceOk()) showError(service, false);
      submit.href = waLink(buildMessage());
    };

    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    submit.addEventListener('click', (e) => {
      refresh();
      showError(name, !nameOk());
      showError(service, !serviceOk());
      if (!nameOk() || !serviceOk()) {
        e.preventDefault();
        (nameOk() ? service : name).focus();
        return;
      }
      track('whatsapp_click', 'form');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submit.click();
    });
    refresh();
  }

  function initPromo() {
    const section = $('[data-promo]');
    const p = C.promo || {};
    if (!section || !p.enabled || !p.endDate) return;
    const end = new Date(p.endDate).getTime();
    if (!(end > Date.now())) return;
    section.hidden = false;

    const parts = {};
    $$('[data-cd]', section).forEach((el) => { parts[el.dataset.cd] = el; });
    const pad = (n) => String(n).padStart(2, '0');
    let timer = 0;
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      const s = Math.floor(left / 1000);
      parts.days.textContent = pad(Math.floor(s / 86400));
      parts.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      parts.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      parts.seconds.textContent = pad(s % 60);
      if (left === 0) {
        clearInterval(timer);
        section.hidden = true;
        if (hasGsap) ScrollTrigger.refresh();
      }
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  /* ---------- Animations ---------- */
  function splitWords(el) {
    el.setAttribute('aria-label', el.textContent.trim());
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            const w = document.createElement('span');
            w.className = 'w';
            w.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.className = 'wi';
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
    return $$('.wi', el);
  }

  function heroIntro() {
    const temps = $$('.js-temp');
    const heat = { t: 31 };
    const showTemp = () => temps.forEach((el) => { el.textContent = Math.round(heat.t); });
    showTemp();

    const title = $('.hero-title');
    const words = splitWords(title);
    gsap.set(title, { visibility: 'visible' });

    gsap.timeline({ delay: 0.15 })
      .fromTo('[data-hero="eyebrow"]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 })
      .fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06 }, '-=0.3')
      .fromTo('[data-hero="sub"]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0 }, '-=0.5')
      .fromTo('[data-hero="ctas"]', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0 }, '-=0.6')
      .fromTo('[data-hero="trust"]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }, '-=0.6')
      .fromTo('.hero-visual', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.2)
      .fromTo('.ac-unit', { y: -40, scale: 0.92 }, { y: 0, scale: 1, duration: 1.1, ease: 'back.out(1.4)' }, 0.25)
      .fromTo('.airflow path', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.08 }, 0.8)
      .fromTo('.remote', { y: 80, rotate: -20, autoAlpha: 0 }, { y: 0, rotate: -8, autoAlpha: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.55)
      // The room cools from 31° to 24°: the warm glow fades as the cool one takes over.
      .fromTo('.hero-glow--warm', { opacity: 1 }, { opacity: 0, duration: 2.6, ease: 'power2.inOut' }, 0.6)
      .fromTo('.hero-glow--cool', { opacity: 0 }, { opacity: 1, duration: 2.6, ease: 'power2.inOut' }, 0.6)
      .to(heat, { t: 24, duration: 2.6, ease: 'power2.inOut', onUpdate: showTemp }, 0.6);

    gsap.to('.hero-visual', {
      yPercent: 14, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  function groupReveals(handled) {
    const presets = {
      cards: { from: { y: 70, scale: 0.96, rotateX: 8 }, duration: 1, stagger: 0.12 },
      usps: { from: { x: 40, y: 0 }, duration: 0.85, stagger: 0.1 },
      stats: { from: { y: 30 }, duration: 0.8, stagger: 0.1 },
      faq: { from: { y: 24 }, duration: 0.7, stagger: 0.07 },
      form: { from: { y: 24 }, duration: 0.7, stagger: 0.07 },
    };
    $$('[data-anim-group]').forEach((group) => {
      const items = $$('[data-anim]', group).filter((el) => el.closest('[data-anim-group]') === group);
      if (!items.length) return;
      items.forEach((el) => handled.add(el));
      const p = presets[group.dataset.animGroup] || { from: { y: 36 }, duration: 0.85, stagger: 0.1 };
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.fromTo(batch,
          { autoAlpha: 0, ...p.from },
          { autoAlpha: 1, x: 0, y: 0, scale: 1, rotateX: 0, duration: p.duration, stagger: p.stagger, ease: 'power3.out' }),
      });
    });
  }

  function singleReveals(handled) {
    $$('[data-anim]').filter((el) => !handled.has(el)).forEach((el) => {
      const st = { trigger: el, start: 'top 85%', once: true };
      const type = el.dataset.anim;
      if (type === 'clip') {
        // Wipes in from the right, the way Hebrew reads.
        gsap.fromTo(el,
          { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 100%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', clearProps: 'clipPath', scrollTrigger: st });
      } else if (type === 'pop') {
        gsap.fromTo(el,
          { autoAlpha: 0, scale: 0.92, y: 30 },
          { autoAlpha: 1, scale: 1, y: 0, duration: 1, ease: 'back.out(1.4)', scrollTrigger: st });
      } else {
        const delay = el.parentElement.closest('[data-anim="clip"]') ? 0.8 : 0;
        gsap.fromTo(el, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.85, delay, scrollTrigger: st });
      }
    });
  }

  function galleryReveal() {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(batch,
          { autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.out', stagger: 0.12, clearProps: 'clipPath' });
        gsap.fromTo(batch.map((t) => $('.photo-slot', t)),
          { scale: 1.25 },
          { scale: 1, duration: 1.4, ease: 'power3.out', stagger: 0.12 });
      },
    });
  }

  function processTimeline() {
    const steps = $$('[data-step]');
    const line = $('.process-line span');
    if (!steps.length || !line) return;
    const activate = (progress) => {
      steps.forEach((s, i) => s.classList.toggle('is-active', progress >= i / (steps.length - 1) - 0.02));
    };
    gsap.fromTo(steps, { autoAlpha: 0, y: 40 }, {
      autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.15,
      scrollTrigger: { trigger: '.process', start: 'top 80%', once: true },
    });
    const st = { trigger: '.process', start: 'top 70%', end: 'bottom 60%', scrub: 0.5, onUpdate: (self) => activate(self.progress) };
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: st });
    });
    mm.add('(max-width: 860px)', () => {
      gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: st });
    });
  }

  function counters() {
    $$('.count').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const obj = { v: 0 };
      setCount(el, 0);
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => gsap.to(obj, { v: target, duration: 2, ease: 'power2.out', onUpdate: () => setCount(el, obj.v) }),
      });
    });
  }

  function waves() {
    // Each band's top edge swells into a wave as the band scrolls in.
    $$('.wave--to-ice, .wave--to-navy').forEach((w) => {
      gsap.fromTo(w, { scaleY: 0 }, {
        scaleY: 1, transformOrigin: '50% 0%', ease: 'none',
        scrollTrigger: { trigger: w.parentElement, start: 'top bottom', end: 'top 50%', scrub: 0.6 },
      });
    });
  }

  function finalCta() {
    const title = $('.final-title');
    const words = splitWords(title);
    gsap.set(title, { visibility: 'visible' });
    gsap.fromTo(words, { yPercent: 110 }, {
      yPercent: 0, duration: 0.8, stagger: 0.05,
      scrollTrigger: { trigger: title, start: 'top 85%', once: true },
    });
  }

  function initTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('[data-tilt]').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        rx(-((e.clientY - r.top) / r.height - 0.5) * 8);
        ry(((e.clientX - r.left) / r.width - 0.5) * 8);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });
    const handled = new Set();
    heroIntro();
    waves();
    groupReveals(handled);
    singleReveals(handled);
    galleryReveal();
    processTimeline();
    counters();
    finalCta();
    initTilt();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  function initStatic() {
    $$('[data-step]').forEach((s) => s.classList.add('is-active'));
  }

  /* ---------- Boot ---------- */
  initAnalytics();
  bindConfig();
  bindLinks();
  injectSchema();
  initPromo();
  initHeader();
  initMarquee();
  initBeforeAfter();
  initCarousel();
  initFaq();
  initLeadForm();
  if (animate) initAnimations();
  else initStatic();
})();
