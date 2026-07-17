document.addEventListener('DOMContentLoaded', () => {
  const menuTrigger = document.getElementById('menuTrigger');
  const menuPanel   = document.getElementById('menuPanel');
  const menuBackdrop= document.getElementById('menuBackdrop');
  const menuClose   = document.getElementById('menuClose');

  const openMenu = () => {
    menuPanel.classList.add('open');
    menuBackdrop.classList.add('open');
    menuTrigger.classList.add('clicked');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    menuPanel.classList.remove('open');
    menuBackdrop.classList.remove('open');
    menuTrigger.classList.remove('clicked');
    document.body.style.overflow = '';
  };

  if (menuTrigger) menuTrigger.addEventListener('click', openMenu);
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menuBackdrop) menuBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // ===== TYPEWRITER ENGINE =====
  function typeWriter(el, text, speed) {
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

  // Collect all typewriter targets
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]'));
  twEls.forEach(el => { el.dataset.typed = '0'; });

  // ===== PER-ELEMENT OBSERVER (REPEATING) =====
  const twObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) {
        runTw(el);
      } else {
        el.dataset.typed = '0';
        el.textContent = '';
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });

  twEls.forEach(el => twObserver.observe(el));

  // Immediately trigger elements already in viewport on load (fixes about/whitepaper top sections)
  twEls.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) runTw(el);
  });

  // ===== BLOCK REVEAL (fade-in container) =====
  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
      else entry.target.classList.remove('visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-block').forEach(el => blockObserver.observe(el));
  document.querySelectorAll('.reveal-block').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) el.classList.add('visible');
  });

  // ===== RIPPLE CLICK EFFECT =====
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