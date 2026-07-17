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

  menuTrigger.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menuBackdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

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
        // speed up slightly on spaces for natural feel
        setTimeout(step, speed);
      } else if (done) {
        done();
      }
    }
    step();
  }

  // Collect all typewriter targets (text stored in data-type)
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]'));
  // Pre-clear their text (hide until scrolled into view)
  twEls.forEach(el => { el.textContent = ''; el.dataset.typed = '0'; });

  // ===== INTERSECTION OBSERVER: block reveal + trigger typewriter =====
  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // type out any typewriter children inside this block
        entry.target.querySelectorAll('.typewriter[data-type]').forEach(runTw);
        blockObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal-block').forEach(el => blockObserver.observe(el));

  // Hero typewriters (above the fold) run immediately
  document.querySelectorAll('.hero .typewriter[data-type]').forEach(runTw);

  function runTw(el) {
    if (el.dataset.typed === '1') return;
    el.dataset.typed = '1';
    const text = el.getAttribute('data-type');
    const speed = parseInt(el.getAttribute('data-speed')) || 30;
    typeWriter(el, text, speed);
  }

  // ===== RIPPLE CLICK EFFECT ON FEATURE CARDS & MENU LINKS =====
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