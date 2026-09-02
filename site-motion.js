(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shell = document.querySelector('main.wrap');
  if (!shell) return;

  /* Fallback pour les panneaux d'information sur les pages qui n'ont pas
     le gestionnaire inline de la page Explorer. */
  if (!window.RangsOverlays) {
    let fallbackOverlay = null;
    const openFallback = overlay => {
      if (!overlay) return;
      fallbackOverlay = overlay;
      overlay.hidden = false;
      document.documentElement.classList.add('info-overlay-open');
      requestAnimationFrame(() => overlay.classList.add('open'));
    };
    const closeFallback = overlay => {
      if (!overlay || overlay.hidden) return;
      overlay.classList.remove('open');
      document.documentElement.classList.remove('info-overlay-open');
      setTimeout(() => { overlay.hidden = true; }, 180);
      if (fallbackOverlay === overlay) fallbackOverlay = null;
    };
    window.RangsOverlays = { open: openFallback, close: closeFallback };
    document.addEventListener('click', event => {
      const opener = event.target.closest('[data-info-open]');
      if (opener) {
        openFallback(document.getElementById(opener.dataset.infoOpen));
        return;
      }
      const closer = event.target.closest('[data-info-close]');
      if (closer) closeFallback(closer.closest('.info-overlay'));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && fallbackOverlay) closeFallback(fallbackOverlay);
    });
  }

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
  const forbiddenStart = 'input,textarea,select,button,a,canvas,.multi-menu,.table-scroll,.info-overlay,.selection-summary .metric,[contenteditable="true"]';

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

  /* Navigation verticale par carte active.
     Une nouvelle carte commence à effacer la précédente bien avant d'atteindre le haut. */
  const stackCandidates = isExplore
    ? [
        document.querySelector('.hero-simple'),
        document.querySelector('.selection-panel'),
        document.querySelector('.chart-stage'),
        document.querySelector('.evolution-stage'),
        document.querySelector('.table-stage')
      ].filter(Boolean)
    : [...shell.children].filter(el => el.matches('.panel'));

  const evolutionStage = document.querySelector('.evolution-stage');
  const evolutionScroll = document.querySelector('.evolution-stage .evolution-panel');
  const tableStage = document.querySelector('.table-stage');
  const tableScroll = document.querySelector('.table-stage .table-scroll');
  const legalOverlay = document.getElementById('legalInfoOverlay');
  const legalFooter = document.querySelector('.legal-footer');
  const sourceNote = document.querySelector('.source-note');

  if (isExplore) {
    if (sourceNote) sourceNote.classList.add('preview-source-hidden');
    if (tableStage && legalFooter) tableStage.appendChild(legalFooter);

    if (tableStage && !document.querySelector('.stack-tail-spacer')) {
      const spacer = document.createElement('div');
      spacer.className = 'stack-tail-spacer';
      tableStage.after(spacer);
    }
  }

  let activeIndex = 0;
  let stackFrame = null;
  let resizeTimer = null;
  let finalLock = null;
  let verticalTouch = null;
  let legalOpening = false;
  let lastWindowY = window.scrollY;

  const clamp01 = value => Math.max(0, Math.min(1, value));

  function stickyTop(el) {
    const value = parseFloat(getComputedStyle(el).top);
    return Number.isFinite(value) ? value : 0;
  }

  function targetScrollY(el) {
    const rect = el.getBoundingClientRect();
    return Math.max(0, window.scrollY + rect.top - stickyTop(el));
  }

  function scrollToCard(index) {
    const card = stackCandidates[index];
    if (!card) return;
    window.scrollTo({
      top: targetScrollY(card),
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
  }

  function canScrollDown(el) {
    if (!el) return false;
    return el.scrollHeight - el.clientHeight - el.scrollTop > 3;
  }

  function canScrollUp(el) {
    return !!el && el.scrollTop > 3;
  }

  function updateInternalPriority() {
    if (!isExplore) return;

    if (evolutionScroll) {
      const enabled = stackCandidates[activeIndex] === evolutionStage;
      evolutionScroll.classList.toggle('inner-scroll-active', enabled);
      evolutionScroll.style.overflowY = enabled ? 'auto' : 'hidden';
    }

    if (tableScroll) {
      const enabled = stackCandidates[activeIndex] === tableStage;
      tableScroll.classList.toggle('inner-scroll-active', enabled);
      tableScroll.style.overflow = enabled ? 'auto' : 'hidden';
    }
  }

  function openLegalOverlay() {
    if (!legalOverlay || legalOpening || !legalOverlay.hidden) return;
    legalOpening = true;
    window.RangsOverlays?.open(legalOverlay);
    setTimeout(() => { legalOpening = false; }, 450);
  }

  function computeFinalLock() {
    if (!tableStage) {
      finalLock = null;
      return;
    }
    finalLock = targetScrollY(tableStage);
  }

  function updateStackState() {
    if (!isExplore || !stackCandidates.length) return;

    const vh = window.innerHeight;
    const coverStart = vh * .88;
    const coverEnd = vh * .48;
    let nextActive = 0;

    stackCandidates.forEach((card, index) => {
      card.classList.add('motion-stack-card');
      card.style.setProperty('--stack-i', String(Math.min(index, 6)));
      card.classList.remove('motion-stack-static');

      if (index > 0 && card.getBoundingClientRect().top <= vh * .55) {
        nextActive = index;
      }
    });

    stackCandidates.forEach((card, index) => {
      if (index === stackCandidates.length - 1) {
        card.classList.remove('motion-covered');
        card.style.removeProperty('clip-path');
        card.style.setProperty('--stack-content-opacity', '1');
        return;
      }

      const next = stackCandidates[index + 1];
      const nextTop = next.getBoundingClientRect().top;
      const progress = clamp01((coverStart - nextTop) / Math.max(coverStart - coverEnd, 1));
      const height = card.getBoundingClientRect().height;
      const strip = 9;
      const visibleHeight = Math.max(strip, height - ((height - strip) * progress));
      const clipBottom = Math.max(0, height - visibleHeight);

      card.style.clipPath = `inset(0 0 ${clipBottom.toFixed(1)}px 0 round 20px)`;
      card.style.setProperty('--stack-content-opacity', String(clamp01(1 - progress * 1.18)));
      card.classList.toggle('motion-covered', progress > .985);
    });

    if (activeIndex !== nextActive) {
      activeIndex = nextActive;
      updateInternalPriority();
    }

    stackCandidates.forEach((card,index)=>{
      card.classList.toggle('motion-current', index === activeIndex);
      card.classList.toggle('motion-inactive', index !== activeIndex);
    });

    if (tableStage) {
      computeFinalLock();
      const currentY = window.scrollY;
      const movingDown = currentY >= lastWindowY;
      if (stackCandidates[activeIndex] === tableStage && finalLock !== null && currentY > finalLock + 1 && movingDown) {
        window.scrollTo(0, finalLock);
      }
      lastWindowY = window.scrollY;
    }
  }

  function configureStack() {
    if (!isExplore) {
      stackCandidates.forEach((el,index)=>{
        el.classList.add('motion-stack-card');
        el.style.setProperty('--stack-i', String(Math.min(index, 6)));
        const tooTall = el.getBoundingClientRect().height > window.innerHeight * .84;
        el.classList.toggle('motion-stack-static', tooTall);
      });
      return;
    }

    updateStackState();
    computeFinalLock();
  }

  configureStack();
  updateInternalPriority();

  window.addEventListener('scroll', () => {
    if (stackFrame) return;
    stackFrame = requestAnimationFrame(() => {
      stackFrame = null;
      updateStackState();
    });
  }, { passive: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(configureStack, 120);
  }, { passive: true });

  if ('ResizeObserver' in window && isExplore) {
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(configureStack, 80);
    });
    if (evolutionStage) ro.observe(evolutionStage);
    if (tableStage) ro.observe(tableStage);
  }

  /* Petit geste = scroll interne de la carte active.
     Grand geste vertical = passage à la carte précédente/suivante. */
  if (isExplore) {
    document.addEventListener('touchstart', event => {
      if (event.touches.length !== 1 || event.target.closest('.info-overlay')) return;
      const point = event.touches[0];
      const container = event.target.closest('.evolution-panel,.table-scroll');
      const card = container?.closest('.motion-stack-card') || event.target.closest('.motion-stack-card');

      verticalTouch = {
        y: point.clientY,
        time: performance.now(),
        container,
        card,
        activeAtStart: stackCandidates[activeIndex]
      };
    }, { passive: true });

    document.addEventListener('touchend', event => {
      if (!verticalTouch) return;
      const endY = event.changedTouches?.[0]?.clientY ?? verticalTouch.y;
      const dy = endY - verticalTouch.y;
      const elapsed = Math.max(performance.now() - verticalTouch.time, 1);
      const absDy = Math.abs(dy);
      const fastGesture = absDy > 125 && elapsed < 560;
      const startedOnActive = verticalTouch.card === verticalTouch.activeAtStart;

      if (fastGesture && startedOnActive) {
        if (dy < 0) {
          if (activeIndex < stackCandidates.length - 1) {
            scrollToCard(activeIndex + 1);
          } else {
            const atTableEnd = !tableScroll || !canScrollDown(tableScroll);
            if (atTableEnd) openLegalOverlay();
          }
        } else if (dy > 0 && activeIndex > 0) {
          scrollToCard(activeIndex - 1);
        }
      }

      verticalTouch = null;
    }, { passive: true });

    /* À la dernière carte, la page ne descend plus.
       Une tentative de scroll supplémentaire ouvre automatiquement les mentions légales. */
    document.addEventListener('touchmove', event => {
      if (!tableStage || finalLock === null || !verticalTouch || event.touches.length !== 1) return;
      if (stackCandidates[activeIndex] !== tableStage) return;
      if (window.scrollY < finalLock - 3) return;

      const dy = event.touches[0].clientY - verticalTouch.y;
      if (dy >= -64) return;

      const startedInsideTable = !!verticalTouch.container?.classList.contains('table-scroll');
      if (startedInsideTable && canScrollDown(tableScroll)) return;

      openLegalOverlay();
    }, { passive: true });

    window.addEventListener('wheel', event => {
      if (!tableStage || finalLock === null || event.deltaY <= 35) return;
      if (stackCandidates[activeIndex] !== tableStage) return;
      if (window.scrollY < finalLock - 3) return;
      if (tableScroll && canScrollDown(tableScroll)) return;
      openLegalOverlay();
    }, { passive: true });
  }

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