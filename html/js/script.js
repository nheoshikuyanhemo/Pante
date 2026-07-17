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
      }
    }
    step();
  }

  // Collect all typewriter targets
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]'));
  twEls.forEach(el => { el.dataset.typed = '0'; });

  // ===== PER-ELEMENT OBSERVER (REPEATING) =====
  // Types when scrolled into view; clears when scrolled out (so it retypes on next scroll-down).
  const twObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const el = entry.target;
      const text = el.getAttribute('data-type');
      const speed = parseInt(el.getAttribute('data-speed')) || 30;

      if (entry.isIntersecting) {
        // scrolled INTO view → type it out
        if (el.dataset.typed !== '1') {
          el.dataset.typed = '1';
          typeWriter(el, text, speed);
        }
      } else {
        // scrolled OUT of view → reset (hidden), ready to retype
        el.dataset.typed = '0';
        el.textContent = '';
      }
    });
  }, { threshold: 0.3, rootMargin: '0px 0px -5% 0px' });

  twEls.forEach(el => twObserver.observe(el));

  // ===== BLOCK REVEAL (fade-in container) =====
  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-block').forEach(el => blockObserver.observe(el));

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