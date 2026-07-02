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
  const searchSuggestions = document.querySelector('.search-suggestions');
  document.querySelector('.nav__search-btn')?.addEventListener('click', () => {
    searchOverlay?.classList.add('open');
    setTimeout(() => searchInput?.focus(), 100);
    initSearchIndex();
  });
  document.querySelector('.search-overlay__close')?.addEventListener('click', () => {
    searchOverlay?.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchOverlay?.classList.remove('open');
  });

  // ── Global Search ──
  let searchIndex = [];
  let searchIndexReady = false;

  // Shared project data — reads from localStorage, falls back to hardcoded
  function getLightingProjects() {
    try {
      const stored = localStorage.getItem('dingqi_lighting_projects');
      if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [
      { id:'proj_1', name:'Hotel Bécquer', type:'Project', category:'Hospitality', location:'Seville, Spain', img:'', text:'Hotel lighting project featuring DINGQI recessed downlights and track systems.', url:'pages/projects.html' },
      { id:'proj_2', name:'Dentop Clinic', type:'Project', category:'Healthcare', location:'Bucharest, Romania', img:'', text:'Healthcare lighting with high CRI downlights for clinical environments.', url:'pages/projects.html' },
      { id:'proj_3', name:'ChiroHype GmbH', type:'Project', category:'Office', location:'Germany', img:'', text:'Modern office lighting with surface mounted LED downlights.', url:'pages/projects.html' },
      { id:'proj_4', name:'Casa Duna', type:'Project', category:'Residential', location:'Alicante, Spain', img:'', text:'Residential villa with magnetic LED track lighting throughout.', url:'pages/projects.html' },
      { id:'proj_5', name:'GEMÜ Holding GmbH', type:'Project', category:'Office', location:'Germany', img:'', text:'Corporate headquarters illuminated with DINGQI track and recessed lighting.', url:'pages/projects.html' },
      { id:'proj_6', name:'Roca Flagship', type:'Project', category:'Retail', location:'Barcelona, Spain', img:'', text:'Flagship retail store featuring precise accent track lighting.', url:'pages/projects.html' },
      { id:'proj_7', name:'Catholic University', type:'Project', category:'Education', location:'Valencia, Spain', img:'', text:'Educational facility with efficient LED lighting throughout classrooms.', url:'pages/projects.html' },
      { id:'proj_8', name:'Casa Pujol', type:'Project', category:'Residential', location:'Barcelona, Spain', img:'', text:'Residential project with recessed downlights and decorative luminaires.', url:'pages/projects.html' },
      { id:'proj_9', name:"Jenkin's", type:'Project', category:'Retail', location:'Madrid, Spain', img:'', text:'Retail space with track lighting for merchandise display.', url:'pages/projects.html' },
      { id:'proj_10', name:'Raymat Castle', type:'Project', category:'Heritage', location:'Lleida, Spain', img:'', text:'Heritage building with architectural LED lighting solutions.', url:'pages/projects.html' },
      { id:'proj_11', name:'G01 Residential Villa', type:'Project', category:'Residential', location:'United Arab Emirates', img:'', text:'Luxury villa with full DINGQI lighting system.', url:'pages/projects.html' },
      { id:'proj_12', name:'Bākkō', type:'Project', category:'Restaurant', location:'Tokyo, Japan', img:'', text:'Restaurant ambiance lighting with warm-toned LED track lights.', url:'pages/projects.html' }
    ];
  }

  const staticPages = [
    { name: 'Products', type: 'Page', url: 'pages/products.html' },
    { name: 'Projects', type: 'Page', url: 'pages/projects.html' },
    { name: 'About Us', type: 'Page', url: 'pages/about.html' },
    { name: 'Contact', type: 'Page', url: 'pages/contact.html' }
  ];

  function getSearchBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : '';
  }

  async function initSearchIndex() {
    if (searchIndexReady) return;
    searchIndex = [...staticPages, ...getLightingProjects()];

    // Load product data if not already available
    if (typeof productData === 'undefined') {
      await loadScript(getSearchBasePath() + 'js/product-data.js');
    }

    if (typeof productData !== 'undefined' && Array.isArray(productData)) {
      productData.forEach(cat => {
        if (!cat || !cat.series) return;
        cat.series.forEach(ser => {
          if (!ser || !ser.models) return;
          ser.models.forEach(model => {
            if (!model) return;
            searchIndex.push({
              name: model.name || '',
              type: 'Product',
              category: `${cat.categoryName} / ${ser.name}`,
              url: 'pages/products.html'
            });
          });
        });
      });
    }

    searchIndexReady = true;
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  function renderSearchResults(query) {
    if (!searchSuggestions) return;
    searchSuggestions.classList.remove('search-suggestions--results');
    const q = query.trim().toLowerCase();
    if (!q) {
      searchSuggestions.innerHTML = `
        <span class="search-suggestion">Recessed</span>
        <span class="search-suggestion">Magnetic</span>
        <span class="search-suggestion">Track</span>
        <span class="search-suggestion">Casa Duna</span>
        <span class="search-suggestion">Hotel Bécquer</span>
        <span class="search-suggestion">Downlight</span>
        <span class="search-suggestion">LED Tube</span>
        <span class="search-suggestion">Project</span>
      `;
      return;
    }

    const results = searchIndex.filter(item =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q)
    ).slice(0, 12);

    if (results.length === 0) {
      searchSuggestions.innerHTML = '<p style="color:#999;font-size:13px;padding:8px 0;">No matching products or projects found.</p>';
      return;
    }

    searchSuggestions.classList.add('search-suggestions--results');
    searchSuggestions.innerHTML = results.map(r => `
      <a href="${getSearchBasePath()}${r.url}" class="search-result" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;text-decoration:none;color:#111;transition:background .15s;" onmouseover="this.style.background='#f9f9f9'" onmouseout="this.style.background='transparent'">
        <div>
          <p style="margin:0;font-size:14px;font-weight:500;">${escapeHtml(r.name)}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#999;">${escapeHtml(r.type)} · ${escapeHtml(r.category || '')}</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </a>
    `).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  searchInput?.addEventListener('input', (e) => {
    initSearchIndex().then(() => renderSearchResults(e.target.value));
  });

  // initial render of suggestions
  renderSearchResults('');

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
  document.querySelector('.newsletter__form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('.newsletter__input');
    const btn = e.target.querySelector('.newsletter__submit');
    const email = input.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('请输入有效的邮箱地址。');
      return;
    }

    const db = typeof getSupabase === 'function' ? getSupabase() : null;

    if (db) {
      try {
        const { error } = await db.from('email_subscriptions').upsert(
          { email, active: true, subscribed_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
        if (!error) {
          btn.textContent = '已订阅 ✓';
          btn.style.background = '#2d8a2d';
          input.value = '';
          setTimeout(() => {
            btn.textContent = 'Subscribe';
            btn.style.background = '';
          }, 3000);
          return;
        }
      } catch (err) {
        console.warn('Supabase subscription failed, showing local only:', err);
      }
    }

    // Fallback: local only
    btn.textContent = 'Subscribed ✓';
    btn.style.background = '#2d8a2d';
    input.value = '';
    setTimeout(() => {
      btn.textContent = 'Subscribe';
      btn.style.background = '';
    }, 3000);
  });

  // ── Contact form ──
  document.querySelector('.contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Thank you for your message. We will get back to you shortly.');
  });

  // ── Homepage Product Range ──
  function initHomeProductRange() {
    const grid = document.getElementById('homeProductGrid');
    if (!grid) return;

    const allModels = [];
    if (typeof productData !== 'undefined' && Array.isArray(productData)) {
      productData.forEach(cat => {
        if (!cat || !cat.series) return;
        cat.series.forEach(ser => {
          if (!ser || !ser.models) return;
          ser.models.forEach(model => {
            if (!model) return;
            allModels.push({
              id: model.id,
              name: model.name,
              img: model.realImg,
              series: ser.name,
              category: cat.categoryName
            });
          });
        });
      });
    }

    // Shuffle and pick 6
    for (let i = allModels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allModels[i], allModels[j]] = [allModels[j], allModels[i]];
    }
    const selected = allModels.slice(0, 6);

    grid.innerHTML = selected.map(p => `
      <a href="pages/products.html" class="product-card">
        <img class="product-card__img" src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg, #2c2c2c, #1a1a1a)';">
        <div class="product-card__overlay"></div>
        <div class="product-card__info">
          <p class="product-card__name">${escapeHtml(p.name)}</p>
          <p class="product-card__cat">${escapeHtml(p.series)} · ${escapeHtml(p.category)}</p>
        </div>
      </a>
    `).join('');
  }

  // ── Homepage Projects ──
  function initHomeProjects() {
    const bento = document.getElementById('homeProjectsBento');
    if (!bento) return;

    // Shuffle projects and pick 6
    const allProjects = getLightingProjects();
    const shuffled = [...allProjects].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);

    // Array of gradient backgrounds for variety
    const gradients = [
      'linear-gradient(145deg, #1a2030, #2a3040, #1a2030)',
      'linear-gradient(145deg, #f5f0e8, #e8e0d0, #f0ece4)',
      'linear-gradient(145deg, #1a1a1a, #2c2c2c, #1a1a1a)',
      'linear-gradient(145deg, #2a1a10, #3a2a1a, #2a1a10)',
      'linear-gradient(145deg, #e8f0f8, #d8e8f8, #e8f0f8)',
      'linear-gradient(145deg, #102018, #203028, #102018)'
    ];

    bento.innerHTML = selected.map((p, i) => `
      <a href="pages/project-detail.html" class="project-card" style="grid-column:span 1;aspect-ratio:4/3;background:${gradients[i % gradients.length]};">
        <div class="project-card__overlay"></div>
        <div class="project-card__info">
          <p class="project-card__type">${escapeHtml(p.category)}</p>
          <h3 class="project-card__name">${escapeHtml(p.name)}</h3>
          <p class="project-card__location">${escapeHtml(p.location || '')}</p>
        </div>
      </a>
    `).join('');
  }

  initHomeProductRange();
  initHomeProjects();

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
