(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shell = document.querySelector('main.wrap');
  if (!shell) return;

  const currentPath = location.pathname;
  const isExplore = currentPath === '/' || currentPath.endsWith('/index.html') || currentPath.endsWith('/');
  const isPossibilities = currentPath.endsWith('/possibilites.html');
  const ENTRY_KEY = 'rangs-motion-entry';

  const clearEntryState = () => {
    try { sessionStorage.removeItem(ENTRY_KEY); } catch (_) {}
    delete document.documentElement.dataset.motionEntry;
    document.documentElement.classList.remove('motion-entry-ready');
  };

  if (document.documentElement.dataset.motionEntry && !reduceMotion) {
    requestAnimationFrame(() => {
      document.documentElement.classList.add('motion-entry-ready');
      setTimeout(clearEntryState, 650);
    });
  } else {
    clearEntryState();
  }

  const peek = document.createElement('div');
  peek.className = 'motion-swipe-peek';
  peek.setAttribute('aria-hidden', 'true');
  document.body.appendChild(peek);

  let navigating = false;

  function setIncoming(exitDirection) {
    try {
      sessionStorage.setItem(ENTRY_KEY, exitDirection === 'right' ? 'from-left' : 'from-right');
    } catch (_) {}
  }

  function goTo(target, exitDirection, fromGesture = false) {
    if (navigating) return;
    navigating = true;
    setIncoming(exitDirection);

    if (reduceMotion) {
      location.href = target;
      return;
    }

    peek.classList.remove('motion-peek-visible');

    if (fromGesture) {
      shell.style.transition = 'transform .30s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .25s ease';
      shell.style.transform = exitDirection === 'right' ? 'translate3d(108vw,0,0)' : 'translate3d(-108vw,0,0)';
      shell.style.opacity = '.12';
      shell.style.filter = 'blur(10px)';
    } else {
      shell.classList.add(exitDirection === 'right' ? 'motion-exit-right' : 'motion-exit-left');
    }

    setTimeout(() => { location.href = target; }, fromGesture ? 300 : 430);
  }

  /* Accueil = panneau de gauche. Mes possibilités = panneau de droite. */
  document.querySelectorAll('.nav-link[href]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute('href') || '';
      const goesToPoss = href.includes('possibilites.html');
      const goesToExplore = href === './' || href === '/' || href.includes('index.html');

      if (isExplore && goesToPoss) {
        event.preventDefault();
        goTo(link.href, 'left');
      } else if (isPossibilities && goesToExplore) {
        event.preventDefault();
        goTo(link.href, 'right');
      }
    });
  });

  let touch = null;
  let horizontalGesture = false;
  const forbiddenStart = 'input,textarea,select,button,a,canvas,.multi-menu,.table-scroll,.info-modal,[contenteditable="true"]';

  /* Swipe gauche depuis l'accueil -> possibilités.
     Swipe droite depuis possibilités -> accueil. */
  function allowedDirection(dx) {
    return (isExplore && dx < 0) || (isPossibilities && dx > 0);
  }

  function resetDrag(animated = true) {
    shell.style.transition = animated ? 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .22s ease, filter .22s ease' : 'none';
    shell.style.transform = 'translate3d(0,0,0)';
    shell.style.opacity = '1';
    shell.style.filter = 'blur(0)';
    peek.classList.remove('motion-peek-visible');
    peek.style.opacity = '0';
    setTimeout(() => {
      shell.style.removeProperty('transition');
      shell.style.removeProperty('transform');
      shell.style.removeProperty('opacity');
      shell.style.removeProperty('filter');
    }, animated ? 300 : 0);
  }

  document.addEventListener('touchstart', event => {
    if (reduceMotion || navigating || event.touches.length !== 1) return;
    if (event.target.closest(forbiddenStart)) return;

    const point = event.touches[0];
    /* Sur la page de droite, on préserve le geste système Safari depuis le bord gauche. */
    if (isPossibilities && point.clientX < 28) return;

    touch = {
      x: point.clientX,
      y: point.clientY,
      time: performance.now(),
      lastX: point.clientX
    };
    horizontalGesture = false;
  }, { passive: true });

  document.addEventListener('touchmove', event => {
    if (!touch || event.touches.length !== 1 || navigating) return;
    const point = event.touches[0];
    const dx = point.clientX - touch.x;
    const dy = point.clientY - touch.y;

    if (!horizontalGesture) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx) * .78) {
        touch = null;
        return;
      }
      if (!allowedDirection(dx)) {
        touch = null;
        return;
      }
      horizontalGesture = true;
      peek.textContent = isExplore ? 'Mes possibilités' : 'Explorer les rangs';
      peek.className = 'motion-swipe-peek ' + (isExplore ? 'motion-peek-right' : 'motion-peek-left');
    }

    event.preventDefault();
    touch.lastX = point.clientX;
    const max = window.innerWidth * .86;
    const translated = Math.sign(dx) * Math.min(Math.abs(dx), max);
    const progress = Math.min(Math.abs(translated) / (window.innerWidth * .55), 1);

    shell.style.transition = 'none';
    shell.style.transform = `translate3d(${translated}px,0,0)`;
    shell.style.opacity = String(1 - progress * .18);
    shell.style.filter = `blur(${progress * 4}px)`;
    peek.style.opacity = String(.15 + progress * .75);
    peek.classList.add('motion-peek-visible');
  }, { passive: false });

  function finishTouch(event) {
    if (!touch) return;
    const endX = event.changedTouches?.[0]?.clientX ?? touch.lastX;
    const dx = endX - touch.x;
    const elapsed = Math.max(performance.now() - touch.time, 1);
    const velocity = Math.abs(dx) / elapsed;
    const threshold = Math.min(115, window.innerWidth * .22);
    const shouldNavigate = horizontalGesture && allowedDirection(dx) && (Math.abs(dx) >= threshold || velocity > .55);

    touch = null;
    horizontalGesture = false;

    if (shouldNavigate) {
      if (isExplore) goTo('possibilites.html', 'left', true);
      else if (isPossibilities) goTo('./', 'right', true);
    } else {
      resetDrag(true);
    }
  }

  document.addEventListener('touchend', finishTouch, { passive: true });
  document.addEventListener('touchcancel', () => {
    touch = null;
    horizontalGesture = false;
    resetDrag(true);
  }, { passive: true });

  /* La page d'accueil empile uniquement les grandes étapes utiles. */
  const stackCandidates = isExplore
    ? [
        document.querySelector('.selection-panel'),
        document.querySelector('.chart-stage'),
        document.querySelector('.evolution-stage'),
        document.querySelector('.table-stage')
      ].filter(Boolean)
    : [...shell.children].filter(el => el.matches('.panel'));

  function configureStack() {
    stackCandidates.forEach((el, index) => {
      el.classList.add('motion-stack-card');
      el.style.setProperty('--stack-i', String(Math.min(index, 6)));
      const tooTall = el.getBoundingClientRect().height > window.innerHeight * .84;
      el.classList.toggle('motion-stack-static', tooTall);
    });
  }

  configureStack();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(configureStack, 120);
  }, { passive: true });

  /* Révélation progressive, sans animer les conteneurs sticky eux-mêmes. */
  const exploreReveal = [
    '.hero-simple .hero-main',
    '.selection-summary',
    '.selection-panel .controls',
    '.chart-stage .chart-head',
    '.chart-stage .chart-wrap',
    '.evolution-stage .data-stage-head',
    '.evolution-stage .evolution-panel',
    '.table-stage .data-stage-head',
    '.table-stage .table-panel'
  ];
  const possibilitiesReveal = [
    '.hero-main',
    '.hero-note',
    '.panel > *',
    '.rank-card',
    '.upload-box',
    '.group-result'
  ];

  const revealTargets = [...new Set(
    (isExplore ? exploreReveal : possibilitiesReveal)
      .flatMap(selector => [...shell.querySelectorAll(selector)])
  )];

  revealTargets.forEach((el, index) => {
    el.classList.add('motion-reveal');
    el.style.setProperty('--motion-delay', `${Math.min(index, 4) * 55}ms`);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('motion-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: .08,
      rootMargin: '0px 0px -7% 0px'
    });

    revealTargets.forEach(el => observer.observe(el));
  }
})();