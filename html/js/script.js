document.addEventListener('DOMContentLoaded', () => {
  const menuTrigger = document.getElementById('menuTrigger');
  const menuPanel   = document.getElementById('menuPanel');
  const menuBackdrop= document.getElementById('menuBackdrop');
  const menuClose   = document.getElementById('menuClose');

  // ===== TYPEWRITER ENGINE =====
  function typeWriter(el, text, speed, done) {
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    el.appendChild(cursor);
    let i = 0;
    function step() {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text.charAt(i));
        i++;
        setTimeout(step, speed);
      } else {
        cursor.remove();
        if (done) done();
      }
    }
    step();
  }

  function runTw(el) {
    if (el.dataset.typed === '1') return;
    el.dataset.typed = '1';
    const text = el.getAttribute('data-type');
    const speed = parseInt(el.getAttribute('data-speed')) || 30;
    typeWriter(el, text, speed);
  }

  function resetTw(el) {
    el.dataset.typed = '0';
    el.textContent = '';
  }

  // ===== MENU TYPEWRITER (on open) =====
  const menuTwEls = Array.from(document.querySelectorAll('.menu-panel .typewriter[data-type]'));
  menuTwEls.forEach(el => { el.dataset.typed = '0'; el.textContent = ''; });

  function typeMenu() {
    // sort by data-delay, type sequentially
    const sorted = menuTwEls.slice().sort((a,b) => (parseInt(a.dataset.delay)||0) - (parseInt(b.dataset.delay)||0));
    sorted.forEach(el => {
      const delay = parseInt(el.dataset.delay) || 0;
      setTimeout(() => runTw(el), delay);
    });
  }
  function resetMenu() {
    menuTwEls.forEach(resetTw);
  }

  const openMenu = () => {
    menuPanel.classList.add('open');
    menuBackdrop.classList.add('open');
    menuTrigger.classList.add('clicked');
    document.body.style.overflow = 'hidden';
    typeMenu();
  };
  const closeMenu = () => {
    menuPanel.classList.remove('open');
    menuBackdrop.classList.remove('open');
    menuTrigger.classList.remove('clicked');
    document.body.style.overflow = '';
    setTimeout(resetMenu, 300); // reset after slide-out
  };

  if (menuTrigger) menuTrigger.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ===== SCROLL TYPEWRITER (page content) =====
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]')).filter(el => !el.closest('.menu-panel'));
  twEls.forEach(el => { el.dataset.typed = '0'; });

  const twObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        runTw(el);
      } else {
        resetTw(el);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

  twEls.forEach(el => twObserver.observe(el));

  // Trigger in-viewport elements on load
  twEls.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) runTw(el);
  });

  // ===== BLOCK REVEAL =====
  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
      else entry.target.classList.remove('visible');
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
      ripple.style.top  = (e.clientY - rect.top - size / 2) + 'px';
      ripple.style.position = 'absolute';
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
});