// Sajt: preloader, reveal animacije, scramble tekst, kursor, skrol reveal, work preview
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // redoslijed za stagger animacije
  document.querySelectorAll('.rv').forEach((el, i) => el.style.setProperty('--i', i));
  document.querySelectorAll('.card').forEach((el, i) => el.style.setProperty('--i', i));

  const reveal = () => requestAnimationFrame(() => document.body.classList.add('is-in'));

  // PRELOADER: brojač 000 -> 100, prikazuje se jednom po sesiji
  const loader = document.querySelector('.loader');
  let seen = false;
  try { seen = sessionStorage.getItem('alex-loader') === '1'; } catch (e) {}

  if (!loader || reduce || seen) {
    root.classList.add('skip-loader');
    reveal();
  } else {
    try { sessionStorage.setItem('alex-loader', '1'); } catch (e) {}
    const count = loader.querySelector('.loader-count');
    const bar = loader.querySelector('.loader-bar i');
    const dur = 1400;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      bar.style.transform = `scaleX(${eased})`;
      if (p < 1) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add('done');
        setTimeout(reveal, 350);
        setTimeout(() => loader.remove(), 1100);
      }, 180);
    };
    requestAnimationFrame(tick);
  }


  // SCRAMBLE tekst na hover
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>';
  document.querySelectorAll('[data-scramble]').forEach((el) => {
    const original = el.textContent;
    let raf = 0;
    const host = el.closest('a') || el;
    host.addEventListener('mouseenter', () => {
      if (reduce) return;
      cancelAnimationFrame(raf);
      let frame = 0;
      const total = original.length * 2.2;
      const run = () => {
        el.textContent = original.split('').map((c, i) => {
          if (c === ' ' || i < frame / 2.2) return c;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        if (++frame <= total) raf = requestAnimationFrame(run);
        else el.textContent = original;
      };
      run();
    });
  });

  // KURSOR (samo miš)
  const cursor = document.querySelector('.cursor');
  if (cursor && window.matchMedia('(pointer: fine)').matches && !reduce) {
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; cursor.classList.add('on'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('on'));
    const loop = () => {
      cx += (x - cx) * 0.2;
      cy += (y - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.querySelectorAll('a, .photo, .lab-media, .lab-lb button').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('big'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
    });
  }

  // OTKRIVANJE NA SKROL (.sr = brzi fade slika, .sf = fade)
  const srEls = document.querySelectorAll('.sr, .sf');
  if (srEls.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      srEls.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px 0px 0px' });
      srEls.forEach((el) => io.observe(el));
    }
  }

  // LAB: filter tabovi (opis grupe ispod tabova, prazna grupa = "coming soon")
  const tabs = document.querySelectorAll('.lab-tab');
  if (tabs.length) {
    const items = [...document.querySelectorAll('.lab-item')];
    const desc = document.querySelector('.lab-desc');
    const empty = document.querySelector('.lab-empty');
    tabs.forEach((tab) => {
      const cat = tab.dataset.cat;
      const n = cat === 'all' ? items.length : items.filter((it) => it.dataset.cat === cat).length;
      tab.querySelector('sup').textContent = String(n).padStart(2, '0');
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-pressed', t === tab);
        });
        items.forEach((it) => { it.hidden = cat !== 'all' && it.dataset.cat !== cat; });
        if (desc) desc.textContent = tab.dataset.desc;
        if (empty) empty.hidden = n > 0;
      });
    });
  }

  // LAB: lightbox (jedna slika, galerija ili scroll za koncept sajta)
  const lb = document.querySelector('.lab-lb');
  if (lb) {
    const stage = lb.querySelector('.lab-lb-stage');
    const title = lb.querySelector('.lab-lb-title');
    const count = lb.querySelector('.lab-lb-count');
    const closeBtn = lb.querySelector('.lab-lb-close');
    let slides = [], idx = 0, lastFocus = null;

    // "ph-2" = placeholder, sve ostalo = putanja do slike
    const media = (src, alt) => {
      if (/^ph-/.test(src)) {
        const d = document.createElement('div');
        d.className = 'lab-ph ' + src;
        return d;
      }
      const im = document.createElement('img');
      im.src = src; im.alt = alt; im.decoding = 'async';
      return im;
    };
    const sources = (item) => {
      if (item.dataset.gallery) return item.dataset.gallery.split(',').map((s) => s.trim()).filter(Boolean);
      const own = item.querySelector('.lab-media img, .lab-media .lab-ph');
      if (!own) return [];
      return [own.tagName === 'IMG' ? own.getAttribute('src') : [...own.classList].find((c) => c.startsWith('ph-'))];
    };
    const pad = (n) => String(n).padStart(2, '0');

    const show = (i) => {
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('on', k === idx));
      count.textContent = `${pad(idx + 1)} / ${pad(slides.length)}`;
    };

    const open = (item) => {
      const list = sources(item);
      if (!list.length) return;
      const name = item.querySelector('figcaption span')?.textContent || '';
      const alt = item.querySelector('.lab-media img')?.alt || name;
      const scroll = item.dataset.mode === 'scroll';
      stage.innerHTML = '';
      slides = [];
      if (scroll) {
        const wrap = document.createElement('div');
        wrap.className = 'lab-scroll';
        list.forEach((src) => wrap.appendChild(media(src, alt)));
        stage.appendChild(wrap);
        stage.scrollTop = 0;
        count.textContent = 'SCROLL';
      } else {
        list.forEach((src) => {
          const s = document.createElement('div');
          s.className = 'lab-slide';
          s.appendChild(media(src, alt));
          stage.appendChild(s);
          slides.push(s);
        });
        show(0);
        if (slides.length === 1) count.textContent = '';
      }
      title.textContent = name;
      lb.classList.toggle('scroll', scroll);
      lb.classList.toggle('single', !scroll && slides.length === 1);
      lastFocus = document.activeElement;
      lb.classList.add('open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lb-lock');
      closeBtn.focus({ preventScroll: true });
    };

    const close = () => {
      lb.classList.remove('open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lb-lock');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    // .lab-item kao <a> = link (case study / live sajt), bez lightboxa
    document.querySelectorAll('.lab-item:not(a)').forEach((item) => {
      const list = sources(item);
      if (list.length > 1) {
        const b = document.createElement('span');
        b.className = 'lab-badge mono';
        b.textContent = item.dataset.mode === 'scroll' ? 'SITE' : `+${list.length - 1}`;
        item.querySelector('.lab-media').appendChild(b);
      }
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.addEventListener('click', () => open(item));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item); }
      });
    });

    closeBtn.addEventListener('click', close);
    lb.querySelector('.lab-lb-prev').addEventListener('click', () => show(idx - 1));
    lb.querySelector('.lab-lb-next').addEventListener('click', () => show(idx + 1));
    // klik na prazan prostor zatvara
    stage.addEventListener('click', (e) => {
      if (e.target === stage || e.target.classList.contains('lab-slide')) close();
    });
    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (slides.length > 1 && e.key === 'ArrowLeft') show(idx - 1);
      if (slides.length > 1 && e.key === 'ArrowRight') show(idx + 1);
    });
    // swipe na telefonu
    let sx = 0;
    stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (slides.length > 1 && Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    });
  }
})();
