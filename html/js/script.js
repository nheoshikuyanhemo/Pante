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

  // ===== WALLET CONNECT =====
  const walletBtn = document.getElementById('walletBtn');
  async function connectWallet() {
    if (!walletBtn) return;
    if (typeof window.ethereum === 'undefined') {
      alert('No Ethereum wallet found. Please install MetaMask.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = accounts[0];
      const short = addr.slice(0, 6) + '...' + addr.slice(-4);
      walletBtn.textContent = short;
      walletBtn.classList.add('connected');
      walletBtn.title = addr;
    } catch (e) {
      alert('Connection rejected.');
    }
  }
  if (walletBtn) {
    walletBtn.addEventListener('click', connectWallet);
    // auto-show if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      const a = window.ethereum.selectedAddress;
      walletBtn.textContent = a.slice(0,6) + '...' + a.slice(-4);
      walletBtn.classList.add('connected');
    }
  }

  // ===== LANGUAGE SWITCH (i18n manual) =====
  const langSelect = document.getElementById('langSelect');
  function applyLang(lang) {
    if (!I18N[lang]) lang = 'en';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (I18N[lang][key] !== undefined) {
        el.textContent = I18N[lang][key];
        if (el.hasAttribute('data-type')) el.setAttribute('data-type', I18N[lang][key]);
      }
    });
    document.querySelectorAll('.typewriter[data-type]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k && I18N[lang][k] !== undefined) el.setAttribute('data-type', I18N[lang][k]);
    });
    localStorage.setItem('pante_lang', lang);
    reserveAll();
    // re-type in-viewport elements in new language
    setTimeout(checkReveal, 50);
  }
  if (langSelect) {
    const saved = localStorage.getItem('pante_lang') || 'en';
    langSelect.value = saved;
    applyLang(saved);
    langSelect.addEventListener('change', e => applyLang(e.target.value));
  }

  reserveAll();

  // ===== REVEAL CHECK (scroll-based, manual position) =====
  const TRIGGER_LINE = 0.9; // fire when element top reaches 90% of viewport height

  function openEl(el) {
    if (el.dataset.typed === '1') return;
    el.dataset.typed = '1';
    const txt = el.getAttribute('data-type') || el.textContent;
    typeWriter(el, txt, parseInt(el.getAttribute('data-speed')) || 30);
  }
  function closeEl(el) {
    el.dataset.typed = '0';
    el.textContent = '';
  }

  function checkReveal() {
    const vh = window.innerHeight;
    // hero forced open
    document.querySelectorAll('.hero').forEach(h => {
      h.classList.add('visible');
      h.querySelectorAll('.typewriter[data-type]').forEach(openEl);
    });
    // scroll typewriter elements (exclude hero + menu)
    twEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * TRIGGER_LINE && r.bottom > 0) {
        el.closest('.reveal-block')?.classList.add('visible');
        openEl(el);
      } else if (r.top > vh) {
        closeEl(el);
        el.closest('.reveal-block')?.classList.remove('visible');
      }
    });
    // standalone reveal-blocks (no typewriter inside, e.g. wrappers)
    document.querySelectorAll('.reveal-block').forEach(blk => {
      if (blk.closest('.hero')) return;
      if (blk.querySelector('.typewriter')) return; // handled above
      const r = blk.getBoundingClientRect();
      if (r.top < vh * TRIGGER_LINE) blk.classList.add('visible');
      else if (r.top > vh) blk.classList.remove('visible');
    });
  }

  window.addEventListener('scroll', checkReveal, { passive: true });
  window.addEventListener('resize', checkReveal);
  // run on load (rAF + fallback)
  requestAnimationFrame(checkReveal);
  setTimeout(checkReveal, 150);

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