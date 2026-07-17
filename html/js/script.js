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

  function runTw(el) {
    if (el.dataset.typed === '1') return;
    el.dataset.typed = '1';
    typeWriter(el, el.getAttribute('data-type'), parseInt(el.getAttribute('data-speed')) || 30);
  }
  function resetTw(el) {
    el.dataset.typed = '0';
    el.textContent = '';
    // keep min-height reserved (set by reserveAll) to avoid layout jump
  }

  // ===== MENU TYPEWRITER (sequential on open) =====
  const menuTw = Array.from(document.querySelectorAll('.menu-panel .typewriter[data-type]'));
  menuTw.forEach(resetTw);

  function typeMenu() {
    menuTw
      .slice()
      .sort((a, b) => (parseInt(a.dataset.delay) || 0) - (parseInt(b.dataset.delay) || 0))
      .forEach(el => setTimeout(() => runTw(el), parseInt(el.dataset.delay) || 0));
  }
  function resetMenu() { menuTw.forEach(resetTw); }

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
    .filter(el => !el.closest('.menu-panel'));
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
    twEls.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { el.dataset.typed = '0'; runTw(el); }
    });
  }
  if (langSelect) {
    const saved = localStorage.getItem('pante_lang') || 'en';
    langSelect.value = saved;
    applyLang(saved);
    langSelect.addEventListener('change', e => applyLang(e.target.value));
  }

  reserveAll();

  // ===== SCROLL TYPEWRITER OBSERVER =====
  const twObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) runTw(entry.target);
      else resetTw(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

  twEls.forEach(el => twObserver.observe(el));
  // fire immediately for elements already in viewport on load
  twEls.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) runTw(el);
  });

  // ===== BLOCK REVEAL =====
  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('visible', entry.isIntersecting);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-block').forEach(el => {
    blockObserver.observe(el);
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) el.classList.add('visible');
  });

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