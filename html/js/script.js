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

  // ===== LANGUAGE SWITCH (Google Translate) =====
  const langSelect = document.getElementById('langSelect');
  function applyLang(lang) {
    if (lang === 'en') {
      // back to original
      if (window.google && google.translate && google.translate.TranslateElement) {
        const frame = document.querySelector('.goog-te-banner-frame, .goog-te-menu-frame');
      }
      // Google Translate doesn't have direct "restore" API; reload original by re-rendering
      location.hash = '';
      // simplest: set cookie to clear
      document.cookie = 'googtrans=; path=/;';
      // force re-render without translation: use the widget's restore
      if (window.google && google.translate && google.translate.TranslateElement && typeof google.translate.TranslateElement.instance !== 'undefined') {
        try { google.translate.TranslateElement.instance.showOriginal(); } catch(e) {}
      }
      return;
    }
    // set googtrans cookie and trigger translate
    document.cookie = 'googtrans=/en/' + lang + '; path=/;';
    if (window.google && google.translate && google.translate.TranslateElement) {
      // re-init or use existing
      if (typeof google.translate.TranslateElement.instance !== 'undefined') {
        try { google.translate.TranslateElement.instance.translateElement('en', lang); } catch(e) {}
      }
    } else {
      // wait for script to load then translate
      const check = setInterval(() => {
        if (window.google && google.translate && google.translate.TranslateElement) {
          clearInterval(check);
          try { google.translate.TranslateElement.instance.translateElement('en', lang); } catch(e) {}
        }
      }, 300);
      setTimeout(() => clearInterval(check), 10000);
    }
    localStorage.setItem('pante_lang', lang);
  }
  if (langSelect) {
    const saved = localStorage.getItem('pante_lang') || 'en';
    langSelect.value = saved;
    // Google Translate script
    const gtScript = document.createElement('script');
    gtScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateInit';
    document.head.appendChild(gtScript);
    window.googleTranslateInit = function() {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false,
        includedLanguages: 'en,zh-CN,id,vi,hi,es,fr,de,pt,ru,ja,ko,ar,tr,tl',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
      }, 'google_translate_element');
      if (saved !== 'en') setTimeout(() => applyLang(saved), 1500);
    };
    langSelect.addEventListener('change', e => applyLang(e.target.value));
  }

  // ===== SCROLL TYPEWRITER (page content only, exclude menu) =====
  const twEls = Array.from(document.querySelectorAll('.typewriter[data-type]'))
    .filter(el => !el.closest('.menu-panel'));
  twEls.forEach(el => { el.dataset.typed = '0'; });

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