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

  // ===== SCROLL REVEAL (IntersectionObserver) =====
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  revealEls.forEach(el => observer.observe(el));

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