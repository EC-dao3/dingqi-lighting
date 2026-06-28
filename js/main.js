// ============================================
// ARKOSLIGHT - Main JavaScript
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Nav scroll effect ──
  const nav = document.querySelector('.nav');
  const handleNavScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ── Active nav link ──
  const currentPage = window.location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href !== '#' && currentPage.includes(href.split('/').filter(Boolean).pop())) {
      link.classList.add('active');
    }
  });

  // ── Mega Menu ──
  const megaTrigger = document.querySelector('[data-mega]');
  const megaMenu = document.querySelector('.nav__mega');
  let megaTimeout;
  if (megaTrigger && megaMenu) {
    megaTrigger.addEventListener('mouseenter', () => {
      clearTimeout(megaTimeout);
      megaMenu.classList.add('open');
    });
    megaTrigger.addEventListener('mouseleave', () => {
      megaTimeout = setTimeout(() => megaMenu.classList.remove('open'), 200);
    });
    megaMenu.addEventListener('mouseenter', () => clearTimeout(megaTimeout));
    megaMenu.addEventListener('mouseleave', () => {
      megaTimeout = setTimeout(() => megaMenu.classList.remove('open'), 200);
    });
  }

  // ── Hero Slider ──
  const slides = document.querySelectorAll('.hero__slide');
  const dots   = document.querySelectorAll('.hero__dot');
  const counter = document.querySelector('.hero__counter');
  let current = 0;
  let heroTimer;

  const goToSlide = (n) => {
    slides[current]?.classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current]?.classList.add('active');
    dots[current]?.classList.add('active');
    if (counter) counter.textContent = `${String(current + 1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
  };

  if (slides.length > 0) {
    goToSlide(0);
    heroTimer = setInterval(() => goToSlide(current + 1), 6000);
    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      clearInterval(heroTimer);
      goToSlide(i);
      heroTimer = setInterval(() => goToSlide(current + 1), 6000);
    }));
  }

  // ── Scroll Reveal ──
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => observer.observe(el));
  }

  // ── Cookie Bar ──
  const cookieBar = document.querySelector('.cookie-bar');
  if (cookieBar && !localStorage.getItem('ark_cookie')) {
    setTimeout(() => cookieBar.classList.add('show'), 2000);
    document.querySelector('.cookie-accept')?.addEventListener('click', () => {
      cookieBar.classList.remove('show');
      localStorage.setItem('ark_cookie', '1');
    });
    document.querySelector('.cookie-decline')?.addEventListener('click', () => {
      cookieBar.classList.remove('show');
    });
  }

  // ── Search Overlay ──
  const searchOverlay = document.querySelector('.search-overlay');
  const searchInput   = document.querySelector('.search-overlay__input');
  document.querySelector('.nav__search-btn')?.addEventListener('click', () => {
    searchOverlay?.classList.add('open');
    setTimeout(() => searchInput?.focus(), 100);
  });
  document.querySelector('.search-overlay__close')?.addEventListener('click', () => {
    searchOverlay?.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchOverlay?.classList.remove('open');
  });

  // ── Product Tabs ──
  document.querySelectorAll('.product-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.product-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.product-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(target)?.classList.add('active');
    });
  });

  // ── Filter Buttons ──
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-filter-group]');
      if (group) {
        group.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      } else {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
    });
  });

  // ── Sidebar links ──
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.sidebar__link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // ── Horizontal scroll drag ──
  document.querySelectorAll('.h-scroll-section').forEach(el => {
    let isDown = false, startX, scrollLeft;
    el.addEventListener('mousedown', e => {
      isDown = true; el.classList.add('active');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });
    el.addEventListener('mouseleave', () => { isDown = false; });
    el.addEventListener('mouseup', () => { isDown = false; });
    el.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX) * 1.4;
    });
  });

  // ── Smooth page transitions ──
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#') && !href.startsWith('http') && !href.startsWith('mailto')) {
      link.addEventListener('click', (e) => {
        // just let it navigate normally for local files
      });
    }
  });

  // ── Newsletter form ──
  document.querySelector('.newsletter__form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.newsletter__submit');
    const originalText = btn.textContent;
    btn.textContent = 'Subscribed ✓';
    btn.style.background = '#2d8a2d';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 3000);
  });

  // ── Contact form ──
  document.querySelector('.contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you for your message. We will get back to you shortly.');
  });

});

// ── Animate counter numbers ──
function animateCounter(el, target, suffix = '') {
  let start = 0;
  const duration = 2000;
  const startTime = performance.now();
  const update = (time) => {
    const elapsed = time - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Observe stat counters ──
const statEls = document.querySelectorAll('[data-counter]');
if (statEls.length > 0) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCounter(el, parseInt(el.dataset.counter), el.dataset.suffix || '');
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  statEls.forEach(el => counterObserver.observe(el));
}
