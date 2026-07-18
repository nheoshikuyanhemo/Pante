document.addEventListener('DOMContentLoaded', () => {
  const menuTrigger  = document.getElementById('menuTrigger');
  const menuPanel    = document.getElementById('menuPanel');
  const menuBackdrop = document.getElementById('menuBackdrop');
  const menuClose    = document.getElementById('menuClose');

  // ===== TYPEWRITER ENGINE =====
  function typeWriter(el, text, speed) {
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    el.appendChild(cursor);
    let i = 0;
    (function step() {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text.charAt(i++));
        setTimeout(step, speed);
      } else {
        cursor.remove();
        // min-height stays reserved (set by reserveAll)
      }
    })();
  }

  // ===== MENU TYPEWRITER (sequential on open) =====
  const menuTw = Array.from(document.querySelectorAll('.menu-panel .typewriter[data-type]'));
  function resetMenuEl(el) {
    el.dataset.typed = '0';
    el.textContent = '';
  }
  menuTw.forEach(resetMenuEl);

  function typeMenu() {
    menuTw
      .slice()
      .sort((a, b) => (parseInt(a.dataset.delay) || 0) - (parseInt(b.dataset.delay) || 0))
      .forEach(el => setTimeout(() => {
        if (el.dataset.typed === '1') return;
        el.dataset.typed = '1';
        typeWriter(el, el.getAttribute('data-type'), parseInt(el.getAttribute('data-speed')) || 30);
      }, parseInt(el.dataset.delay) || 0));
  }
  function resetMenu() { menuTw.forEach(resetMenuEl); }

  // ===== MENU OPEN / CLOSE =====
  function openMenu() {
    if (!menuPanel) return;
    menuPanel.classList.add('open');
    menuBackdrop.classList.add('open');
    menuTrigger.classList.add('clicked');
    document.body.style.overflow = 'hidden';
    typeMenu();
  }
  function closeMenu() {
    if (!menuPanel) return;
    menuPanel.classList.remove('open');
    menuBackdrop.classList.remove('open');
    menuTrigger.classList.remove('clicked');
    document.body.style.overflow = '';
    setTimeout(resetMenu, 300);
  }

  if (menuTrigger)  menuTrigger.addEventListener('click', openMenu);
  if (menuClose)    menuClose.addEventListener('click', closeMenu);
  if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ===== SCROLL TYPEWRITER ELEMENTS (defined early for reuse) =====
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]'))
    .filter(el => !el.closest('.menu-panel') && !el.closest('.hero'));
  twEls.forEach(el => { el.dataset.typed = '0'; });

  // reserve space for all typewriter elements up-front (prevents layout jump on scroll)
  function reserveAll() {
    twEls.forEach(el => {
      const text = el.getAttribute('data-type') || '';
      if (!text) return;
      const prev = el.textContent;
      el.textContent = text;
      el.style.minHeight = el.offsetHeight + 'px';
      el.textContent = prev;
    });
  }

  // ===== LANGUAGE SWITCH (i18n manual) =====
  const langSelect = document.getElementById('langSelect');
  function applyLang(lang) {
    if (!I18N[lang]) lang = 'en';
    document.documentElement.lang = lang;

    // 1) Update all static [data-i18n] text (headings, paragraphs, buttons, etc.)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (I18N[lang][key] !== undefined) {
        el.textContent = I18N[lang][key];
        if (el.hasAttribute('data-type')) el.setAttribute('data-type', I18N[lang][key]);
      }
    });

    // 2) Update every typewriter's data-type from its i18n key (covers menu + scroll els)
    document.querySelectorAll('.typewriter[data-type]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k && I18N[lang][k] !== undefined) {
        el.setAttribute('data-type', I18N[lang][k]);
      }
    });

    // 3) Re-type elements that are currently visible/typed in the new language
    document.querySelectorAll('.typewriter[data-type]').forEach(el => {
      if (el.dataset.typed === '1' || el.closest('.reveal-block.visible') || el.closest('.hero') || el.closest('.menu-panel.open')) {
        el.dataset.typed = '0';
        el.textContent = '';
        if (el.closest('.menu-panel') && !menuPanel.classList.contains('open')) return; // skip closed menu
        openEl(el);
      }
    });

    localStorage.setItem('pante_lang', lang);
    reserveAll();
    // Re-run reveal for any in-viewport blocks (checkReveal replaced by IO; force-show all as safety)
    setTimeout(() => {
      document.querySelectorAll('.reveal-block').forEach(blk => {
        blk.classList.add('visible');
        blk.querySelectorAll('.typewriter[data-type]').forEach(openEl);
      });
    }, 50);
  }
  if (langSelect) {
    const saved = localStorage.getItem('pante_lang') || 'en';
    langSelect.value = saved;
    applyLang(saved);
    langSelect.addEventListener('change', e => applyLang(e.target.value));
  }

  reserveAll();

  // ===== REVEAL CHECK (IntersectionObserver — robust, no inverted math) =====
  // Elements appear as soon as they enter the viewport (small rootMargin so no far scroll needed)
  function openEl(el) {
    if (el.dataset.typed === '1') return;
    el.dataset.typed = '1';
    const txt = el.getAttribute('data-type') || el.textContent;
    typeWriter(el, txt, parseInt(el.getAttribute('data-speed')) || 30);
  }

  // Hero forced open immediately
  document.querySelectorAll('.hero').forEach(h => {
    h.classList.add('visible');
    h.querySelectorAll('.typewriter[data-type]').forEach(openEl);
  });

  // Observe all reveal-blocks; add .visible + type their inner typewriters when intersecting
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const blk = entry.target;
          blk.classList.add('visible');
          blk.querySelectorAll('.typewriter[data-type]').forEach(openEl);
          io.unobserve(blk); // reveal once, no flicker / no blank on scroll back
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal-block').forEach(blk => io.observe(blk));
  } else {
    // Fallback: no IO support — just show everything
    document.querySelectorAll('.reveal-block').forEach(blk => {
      blk.classList.add('visible');
      blk.querySelectorAll('.typewriter[data-type]').forEach(openEl);
    });
  }

  // FAILSAFE: if anything is still hidden after 1.5s (e.g. observer quirk), force-show all
  setTimeout(() => {
    document.querySelectorAll('.reveal-block').forEach(blk => {
      blk.classList.add('visible');
      blk.querySelectorAll('.typewriter[data-type]').forEach(openEl);
    });
  }, 1500);

  // ===== RIPPLE CLICK =====
  document.querySelectorAll('.feature-card, .menu-contents a').forEach(el => {
    el.addEventListener('click', function (e) {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
      ripple.style.position = 'absolute';
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
});