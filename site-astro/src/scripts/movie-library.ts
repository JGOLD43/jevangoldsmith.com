import { readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';

interface LibraryMovie {
  id: string;
  title: string;
  subtitle: string;
  cover: string;
  href: string;
  tier: string;
  tierLabel: string;
  tierColor: string;
  collection: string;
}

type LibrarySort = 'az' | 'tiers' | 'collection';
const sortNames: Record<LibrarySort, string> = { az: 'A–Z', tiers: 'By tiers', collection: 'By genre' };
const parseSort = (value: string | null | undefined): LibrarySort => value === 'tiers' || value === 'collection' ? value : 'az';

function initMovieLibrary() {
  const library = document.querySelector<HTMLElement>('#movie-library');
  const stage = library?.querySelector<HTMLElement>('.movie-library-stage');
  const track = library?.querySelector<HTMLElement>('.movie-library-track');
  const shadowTrack = library?.querySelector<HTMLElement>('.movie-library-contact-shadows');
  const title = library?.querySelector<HTMLAnchorElement>('.movie-library-title');
  const subtitle = library?.querySelector<HTMLElement>('.movie-library-subtitle');
  const detailsLink = library?.querySelector<HTMLAnchorElement>('.movie-library-details');
  const sortMenu = library?.querySelector<HTMLDetailsElement>('.movie-library-sort');
  const groupLabel = library?.querySelector<HTMLElement>('.movie-library-group');
  const controls = library?.querySelector<HTMLElement>('.movie-library-controls');
  const sortStatus = library?.querySelector<HTMLElement>('[data-disc-sort-status]');
  if (!library || !stage || !track || !title || !subtitle || !detailsLink) return;

  const allMovies = readInlineJson<LibraryMovie[]>('jg-movie-library') || [];
  let movies = [...allMovies];
  let sortMode: LibrarySort = 'az';
  let sorting = false;
  let sortAnimations: Animation[] = [];
  let outgoingShelf: HTMLElement | null = null;
  const picker = document.querySelector<HTMLDetailsElement>('.movies-view-picker');
  const summary = picker?.querySelector<HTMLElement>('summary');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const volumes = new Map<number, HTMLButtonElement>();
  const shadows = new Map<number, HTMLElement>();
  const inertElements = new Map<HTMLElement, boolean>();
  const wrap = (index: number) => ((index % movies.length) + movies.length) % movies.length;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  let active = false;
  let position = 0;
  let target = 0;
  let velocity = 0;
  let openAmount = 1;
  let openTarget = 1;
  let selected = -1;
  let frame = 0;
  let lastTime = 0;
  let snapTimer = 0;
  let scale = 1;
  let pitch = 62;
  let gap = 280;
  let sceneryPosition = 0;
  let drag: { id: number; x: number; y: number; start: number; moved: boolean; movie: number | null;
    mode: 'browse' | 'rotate'; pitch: number; yaw: number } | null = null;
  let lastTap: { movie: number; x: number; y: number; time: number } | null = null;
  let openingDetail = false;
  let inspectedMovie: number | null = null;
  let hoverBounds: DOMRect | null = null;
  let hoverPointer: { x: number; y: number } | null = null;
  let tiltX = 0;
  let tiltY = 0;
  let tiltTargetX = 0;
  let tiltTargetY = 0;
  let ignoreDoubleClickUntil = 0;

  function resetInspection(immediate = false) {
    hoverBounds = null;
    tiltTargetX = tiltTargetY = 0;
    if (immediate) { tiltX = tiltY = 0; inspectedMovie = null; }
    else schedule();
  }

  function updateHover() {
    if (!hoverPointer || drag || openingDetail) return;
    // Wait for the movie to finish pulling out, then respond even if the
    // mouse has stayed still while it moved into place.
    if (Math.abs(position - target) > .001 || Math.abs(openAmount - 1) > .001) return;
    const movie = Math.round(target);
    const node = volumes.get(movie);
    if (!node) return;
    // Use a stable rectangle, not the rotated faces beneath the pointer:
    // turning the movie must not accidentally end its own hover interaction.
    const bounds = hoverBounds ||= node.getBoundingClientRect();
    const x = (hoverPointer.x - bounds.left) / bounds.width * 2 - 1;
    const y = (hoverPointer.y - bounds.top) / bounds.height * 2 - 1;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) {
      tiltTargetX = tiltTargetY = 0;
      return;
    }
    inspectedMovie = movie;
    // A small greeting tilt makes entering the centre visible too.
    // Reduced motion keeps this direct pointer control, without easing.
    tiltTargetY = 8 + x * 32;
    tiltTargetX = 5 - y * 18;
  }

  function releaseDrag() {
    const finished = drag;
    drag = null;
    stage!.removeAttribute('data-dragging');
    stage!.removeAttribute('data-rotating');
    if (finished && stage!.hasPointerCapture(finished.id)) stage!.releasePointerCapture(finished.id);
    return finished;
  }

  function orderMovies(mode: LibrarySort) {
    const tierRank: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };
    sortMode = mode;
    movies = [...allMovies].sort((a, b) => {
      const groupOrder = mode === 'tiers' ? (tierRank[a.tier] ?? 5) - (tierRank[b.tier] ?? 5)
        : mode === 'collection' ? a.collection.localeCompare(b.collection, 'en') : 0;
      return groupOrder || a.title.localeCompare(b.title, 'en', { numeric: true }) || a.id.localeCompare(b.id);
    });
    for (const node of volumes.values()) node.remove();
    for (const node of shadows.values()) node.remove();
    volumes.clear();
    shadows.clear();
    selected = -1;
    library!.querySelectorAll<HTMLButtonElement>('[data-disc-sort]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.discSort === mode));
    });
    sortMenu?.querySelector('summary')?.setAttribute('aria-label', `Sort movies: ${sortNames[mode]}`);
  }

  function finishSortTransition() {
    const animations = sortAnimations;
    sortAnimations = [];
    animations.forEach((animation) => animation.cancel());
    outgoingShelf?.remove();
    outgoingShelf = null;
    sorting = false;
    stage!.inert = false;
    if (controls) controls.inert = false;
    library!.removeAttribute('data-sorting');
    library!.removeAttribute('aria-busy');
  }

  function changeSort(mode: LibrarySort) {
    if (!active || openingDetail || !movies.length) return;
    if (sortMenu) sortMenu.open = false;
    sortMenu?.querySelector('summary')?.focus({ preventScroll: true });
    if (mode === sortMode) return;
    finishSortTransition();
    releaseDrag();
    hoverPointer = null;
    lastTap = null;
    window.clearTimeout(snapTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    resetInspection(true);
    render();
    if (!reducedMotion.matches) {
      // The old shelf travels up while the newly ordered shelf rises from
      // below, like moving the camera down one level of the same bookcase.
      outgoingShelf = stage!.cloneNode(true) as HTMLElement;
      outgoingShelf.classList.add('movie-library-stage-outgoing');
      outgoingShelf.inert = true;
      outgoingShelf.setAttribute('aria-hidden', 'true');
      outgoingShelf.removeAttribute('tabindex');
      outgoingShelf.style.setProperty('--wood-offset', library!.style.getPropertyValue('--wood-offset'));
      stage!.before(outgoingShelf);
    }
    sceneryPosition += position;
    orderMovies(mode);
    position = target = velocity = 0;
    openAmount = openTarget = 1;
    render();
    updateCaption();
    saveView();
    if (sortStatus) sortStatus.textContent = `Disc shelf sorted ${mode === 'az' ? 'A to Z' : mode === 'tiers' ? 'by tier, S to D' : 'by genre'}.`;
    if (!outgoingShelf) return;
    sorting = true;
    library!.dataset.sorting = 'true';
    library!.setAttribute('aria-busy', 'true');
    stage!.inert = true;
    if (controls) controls.inert = true;
    const travel = library!.clientHeight + 80;
    const timing: KeyframeAnimationOptions = { duration: 1000, easing: 'cubic-bezier(.45, 0, .18, 1)', fill: 'both' };
    const incoming = stage!.animate([{ transform: `translateY(${travel}px)` }, { transform: 'translateY(0)' }], timing);
    sortAnimations = [incoming,
      outgoingShelf.animate([{ transform: 'translateY(0)' }, { transform: `translateY(-${travel}px)` }], timing)];
    if (controls) sortAnimations.push(controls.animate([{ opacity: 0 }, { opacity: 0, offset: .85 }, { opacity: 1 }], timing));
    incoming.finished.then(() => {
      if (sortAnimations.includes(incoming)) finishSortTransition();
    }).catch(() => { /* Closing or resizing cancels the camera movement. */ });
  }

  function saveView() {
    const url = new URL(window.location.href);
    if (active) {
      url.searchParams.set('view', 'disc-boxes');
      if (movies.length) url.searchParams.set('discMovie', movies[wrap(Math.round(target))].id);
      if (sortMode === 'az') url.searchParams.delete('discSort');
      else url.searchParams.set('discSort', sortMode);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('discMovie');
      url.searchParams.delete('discSort');
    }
    window.history.replaceState(window.history.state, '', url);
  }

  function updateCaption() {
    if (!movies.length) return;
    const index = wrap(Math.round(target));
    if (index === selected) return;
    selected = index;
    const movie = movies[index];
    if (groupLabel) {
      groupLabel.hidden = sortMode === 'az';
      groupLabel.textContent = sortMode === 'tiers' ? movie.tierLabel : movie.collection;
      groupLabel.style.setProperty('--tier-color', sortMode === 'tiers' ? movie.tierColor : '#e3d8c6');
    }
    title!.textContent = movie.title;
    title!.href = detailHref(movie);
    subtitle!.textContent = movie.subtitle;
    detailsLink!.href = detailHref(movie);
  }

  function createVolume(logical: number) {
    const movie = movies[wrap(logical)];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'disc-case';
    button.dataset.discIndex = String(logical);
    button.dataset.movieId = movie.id;
    button.setAttribute('aria-label', `${movie.title}${movie.subtitle ? `, ${movie.subtitle}` : ''}`);
    for (const face of ['back', 'spine', 'edge', 'top', 'bottom', 'cover']) {
      const layer = document.createElement('span');
      layer.className = `disc-case-${face}`;
      layer.setAttribute('aria-hidden', 'true');
      if (face === 'spine') layer.textContent = movie.title;
      if (face === 'cover') {
        const image = document.createElement('img');
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        if (movie.cover) image.src = movie.cover;
        image.addEventListener('error', () => {
          const fallback = document.createElement('span');
          fallback.className = 'disc-case-fallback';
          fallback.textContent = movie.title;
          image.replaceWith(fallback);
        }, { once: true });
        layer.append(image);
        if (!movie.cover) image.dispatchEvent(new Event('error'));
      }
      button.append(layer);
    }
    track!.append(button);
    const shadow = document.createElement('span');
    shadow.className = 'disc-case-contact';
    shadowTrack?.append(shadow);
    shadows.set(logical, shadow);
    volumes.set(logical, button);
    return button;
  }

  function render() {
    if (!movies.length) return;
    // The grain travels with the cases; the distant room moves more slowly.
    // Modulo a complete texture tile keeps long browsing sessions continuous.
    library!.style.setProperty('--wood-offset', `${(-(position + sceneryPosition) * pitch) % 960}px`);
    library!.style.setProperty('--room-offset', `${-(position + sceneryPosition) * pitch * .14}px`);
    stage!.style.setProperty('--shelf-depth', `${130 * scale}px`);
    stage!.style.setProperty('--shelf-rear-depth', `${52 * scale}px`);
    const center = Math.round(position);
    // A small moving window keeps the infinite shelf light, even for large libraries.
    const radius = Math.min(12, Math.floor(movies.length / 2));
    const start = center - radius;
    const end = start + Math.min(25, movies.length);
    for (const [logical, node] of volumes) {
      if (logical < start || logical >= end) {
        node.remove();
        volumes.delete(logical);
        shadows.get(logical)?.remove();
        shadows.delete(logical);
      }
    }
    for (let logical = start; logical < end; logical++) {
      const node = volumes.get(logical) || createVolume(logical);
      const distance = logical - position;
      // Standard tall disc cases: a printed sleeve inside a slim plastic shell.
      const height = 262 * scale;
      const width = height * .71;
      const x = distance * pitch + clamp(distance, -1, 1) * gap * openAmount;
      const y = -x * .28 + Math.max(0, 1 - Math.abs(distance)) * 90 * scale * openAmount;
      node.style.setProperty('--width', `${width}px`);
      node.style.setProperty('--height', `${height}px`);
      node.style.setProperty('--depth', `${18 * scale}px`);
      node.style.setProperty('--x', `${x}px`);
      node.style.setProperty('--y', `${y}px`);
      const inspecting = logical === inspectedMovie;
      node.style.setProperty('--inspect-pitch', `${inspecting ? tiltX : 0}deg`);
      node.style.setProperty('--inspect-yaw', `${inspecting ? tiltY : 0}deg`);
      node.style.setProperty('--inspect-shine', String(inspecting ? Math.min(.18, (Math.abs(tiltX) + Math.abs(tiltY)) * .004) : 0));
      const shadow = shadows.get(logical)!;
      shadow.style.setProperty('--x', `${x}px`);
      shadow.style.setProperty('--y', `${y}px`);
      shadow.style.setProperty('--width', `${width}px`);
      shadow.style.setProperty('--depth', `${18 * scale}px`);
      shadow.style.setProperty('--inspect-yaw', `${inspecting ? tiltY : 0}deg`);
      node.style.zIndex = String(50 - (logical - center));
      const isSelected = logical === Math.round(target);
      node.setAttribute('aria-pressed', String(isSelected));
      node.tabIndex = isSelected ? 0 : -1;
    }
  }

  function animate(time: number) {
    frame = 0;
    if (!active) return;
    const dt = Math.min(2, (time - (lastTime || time - 16.67)) / 16.67);
    lastTime = time;
    // The selection movement explains which physical movie is leaving the row
    // and which is returning. Keep that direct response visible in reduced
    // motion too, using stronger damping to remove any spring overshoot.
    const damping = reducedMotion.matches ? .55 : .66;
    const stiffness = reducedMotion.matches ? .085 : .075;
    velocity = (velocity + (target - position) * stiffness * dt) * Math.pow(damping, dt);
    position += velocity * dt;
    openAmount += (openTarget - openAmount) * (1 - Math.pow(.8, dt));
    updateHover();
    const tiltEase = reducedMotion.matches ? 1 : 1 - Math.pow(.76, dt);
    tiltX += (tiltTargetX - tiltX) * tiltEase;
    tiltY += (tiltTargetY - tiltY) * tiltEase;
    const shelfMoving = Math.abs(target - position) > .001 || Math.abs(velocity) > .001 || Math.abs(openTarget - openAmount) > .001;
    const tiltMoving = Math.abs(tiltTargetX - tiltX) > .01 || Math.abs(tiltTargetY - tiltY) > .01;
    if (!shelfMoving) { position = target; openAmount = openTarget; velocity = 0; }
    if (!tiltMoving) {
      tiltX = tiltTargetX; tiltY = tiltTargetY;
      if (!tiltX && !tiltY && !drag) inspectedMovie = null;
    }
    render();
    if (shelfMoving || tiltMoving) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }

  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(animate);
  }

  function resize() {
    if (!active) return;
    finishSortTransition();
    if (releaseDrag()) select(target);
    hoverPointer = null;
    resetInspection(true);
    const rect = stage!.getBoundingClientRect();
    scale = Math.min(clamp(rect.width / 900, .74, 1), Math.max(.4, rect.height / 350));
    pitch = 62 * scale;
    gap = clamp(rect.width * .255, 105, 280);
    render();
  }

  function select(logical: number) {
    if (!movies.length || openingDetail || sorting) return;
    if (document.activeElement?.classList.contains('disc-case')) stage!.focus({ preventScroll: true });
    window.clearTimeout(snapTimer);
    if (Math.round(logical) !== Math.round(target)) {
      releaseDrag();
      resetInspection(true);
    }
    target = Math.round(logical);
    openTarget = 1;
    updateCaption();
    saveView();
    schedule();
  }

  function detailHref(movie: LibraryMovie) {
    const params = new URLSearchParams({ from: 'disc-boxes', discMovie: movie.id });
    if (sortMode !== 'az') params.set('discSort', sortMode);
    return `${movie.href}?${params}`;
  }

  function openDetails(logical: number) {
    if (!active || openingDetail || sorting || !movies.length) return;
    select(logical);
    openingDetail = true;
    lastTap = null;
    window.location.assign(detailHref(movies[wrap(logical)]));
  }

  title.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDetails(Math.round(target));
  });

  function close(updateUrl = true, focus = true) {
    if (!active) return;
    active = false;
    finishSortTransition();
    if (sortMenu) sortMenu.open = false;
    releaseDrag();
    hoverPointer = null;
    resetInspection(true);
    lastTap = null;
    stage!.removeAttribute('data-dragging');
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    window.clearTimeout(snapTimer);
    library!.hidden = true;
    document.querySelector('[data-open-movie-library]')?.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('movie-library-open');
    for (const [element, wasInert] of inertElements) element.inert = wasInert;
    inertElements.clear();
    if (updateUrl) saveView();
    if (focus) summary?.focus({ preventScroll: true });
  }

  function open(updateUrl = true, fromUrl = false) {
    if (picker) picker.open = false;
    if (fromUrl) {
      finishSortTransition();
      const params = new URL(window.location.href).searchParams;
      orderMovies(parseSort(params.get('discSort')));
      sceneryPosition = 0;
      const id = params.get('discMovie');
      const index = movies.findIndex((movie) => movie.id === id);
      target = position = index < 0 ? 0 : index;
      velocity = 0;
      openAmount = openTarget = 1;
    }
    if (!active) {
      active = true;
      library!.hidden = false;
      document.querySelector('[data-open-movie-library]')?.setAttribute('aria-pressed', 'true');
      document.body.classList.add('movie-library-open');
      // The site navigation remains usable; only covered page content is inert.
      document.querySelectorAll<HTMLElement>('#movies-layout > :not(#movie-library):not(script), footer').forEach((element) => {
        inertElements.set(element, element.inert);
        element.inert = true;
      });
    }
    resize();
    updateCaption();
    if (updateUrl) saveView();
    stage!.focus({ preventScroll: true });
    schedule();
  }

  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('[data-open-movie-library]')) open();
    if (element?.closest('[data-close-movie-library]')) close();
    if (picker && (element?.closest('.movies-view-menu button') || !element?.closest('.movies-view-picker'))) picker.open = false;
    if (sortMenu?.open && !element?.closest('.movie-library-sort')) sortMenu.open = false;
  });

  sortMenu?.querySelectorAll<HTMLButtonElement>('[data-disc-sort]').forEach((button) => {
    button.disabled = !movies.length;
    button.addEventListener('click', () => changeSort(parseSort(button.dataset.discSort)));
  });

  library.querySelectorAll<HTMLButtonElement>('[data-disc-step]').forEach((button) => {
    button.disabled = movies.length < 2;
    button.addEventListener('click', () => select(Math.round(target) + Number(button.dataset.discStep)));
  });
  if (!movies.length) detailsLink.hidden = true;

  stage.addEventListener('pointerdown', (event) => {
    if (!active || openingDetail || sorting || !movies.length || event.button !== 0 || !event.isPrimary) return;
    hoverPointer = null;
    window.clearTimeout(snapTimer);
    const node = (event.target as Element).closest<HTMLElement>('[data-disc-index]');
    const movie = node ? Number(node.dataset.discIndex) : null;
    const rotate = movie === Math.round(target) && Math.abs(position - target) < .08 && openAmount > .9;
    if (rotate) {
      inspectedMovie = movie;
      hoverBounds = null;
      stage!.dataset.rotating = 'true';
    } else resetInspection(true);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: target,
      moved: false, movie, mode: rotate ? 'rotate' : 'browse', pitch: tiltX, yaw: tiltY };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!active || openingDetail || sorting) return;
    if (!drag) {
      if (event.pointerType !== 'mouse' || event.buttons) return;
      hoverPointer = { x: event.clientX, y: event.clientY };
      updateHover();
      schedule();
      return;
    }
    if (event.pointerId !== drag.id) return;
    const delta = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.moved && (drag.mode === 'rotate' ? Math.hypot(delta, deltaY) : Math.abs(delta)) < 5) return;
    drag.moved = true;
    lastTap = null;
    stage!.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (drag.mode === 'rotate') {
      tiltTargetY = clamp(drag.yaw + delta * .45 / scale, -70, 70);
      tiltTargetX = clamp(drag.pitch - deltaY * .3 / scale, -24, 24);
      schedule();
      return;
    }
    stage!.dataset.dragging = 'true';
    target = drag.start - delta / (46 * scale);
    openTarget = 0;
    updateCaption();
    schedule();
  });
  function endDrag(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = releaseDrag()!;
    const cancelled = event.type === 'pointercancel' || event.type === 'lostpointercapture';
    if (finished.mode === 'rotate') resetInspection();
    if (finished.moved) ignoreDoubleClickUntil = performance.now() + 400;
    if (cancelled || (finished.mode === 'rotate' && finished.moved)) {
      lastTap = null;
      select(target);
      return;
    }
    // Use the tap location as well as time: the first tap starts moving
    // the movie, so the second can land on the space it has just vacated.
    // This also gives touch screens the same double-tap interaction.
    const now = performance.now();
    if (!finished.moved && lastTap && now - lastTap.time < 360
      && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 24) {
      openDetails(lastTap.movie);
      return;
    }
    lastTap = !finished.moved && finished.movie !== null
      ? { movie: finished.movie, x: event.clientX, y: event.clientY, time: now } : null;
    select(finished.moved ? target : finished.movie ?? target);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', (event) => {
    // Touch starts with implicit capture on the cover. Its loss bubbles
    // when we transfer capture to the stage; that is not a cancelled drag.
    if (event.target === stage) endDrag(event);
  });
  stage.addEventListener('pointerleave', () => {
    hoverPointer = null;
    if (!drag) resetInspection();
  });
  window.addEventListener('blur', () => {
    if (!active) return;
    releaseDrag();
    hoverPointer = null;
    lastTap = null;
    resetInspection();
    select(target);
  });
  reducedMotion.addEventListener('change', () => {
    finishSortTransition();
    resetInspection(true);
    if (active) render();
  });
  stage.addEventListener('click', (event) => {
    // Keyboard/screen-reader activation has no preceding pointer event.
    if (event.detail !== 0) return;
    const node = (event.target as Element).closest<HTMLElement>('[data-disc-index]');
    if (node) select(Number(node.dataset.discIndex));
  });
  stage.addEventListener('dblclick', (event) => {
    // Also respect the desktop's native double-click timing preference.
    const node = (event.target as Element).closest<HTMLElement>('[data-disc-index]');
    if (!node || performance.now() < ignoreDoubleClickUntil) return;
    event.preventDefault();
    openDetails(Number(node.dataset.discIndex));
  });
  stage.addEventListener('wheel', (event) => {
    if (!active || openingDetail || sorting || !movies.length || event.ctrlKey) return;
    lastTap = null;
    releaseDrag();
    hoverPointer = null;
    resetInspection(true);
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage!.clientHeight : 1;
    target += clamp(delta * unit, -250, 250) / (100 * scale);
    openTarget = 0;
    updateCaption();
    schedule();
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => select(target), 160);
  }, { passive: false });
  library.addEventListener('keydown', (event) => {
    if (!movies.length || openingDetail || sorting || sortMenu?.open) return;
    if (event.key === 'Enter' && (event.target === stage || (event.target as Element).closest('.disc-case'))) {
      event.preventDefault();
      const volume = (event.target as Element).closest<HTMLElement>('[data-disc-index]');
      openDetails(volume ? Number(volume.dataset.discIndex) : Math.round(target));
      return;
    }
    const directions: Record<string, number> = { ArrowLeft: Math.round(target) - 1, ArrowRight: Math.round(target) + 1, Home: 0, End: movies.length - 1 };
    if (event.key in directions) {
      event.preventDefault();
      select(directions[event.key]);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || openingDetail) return;
    if (sortMenu?.open) {
      event.preventDefault();
      sortMenu.open = false;
      sortMenu.querySelector('summary')?.focus();
      return;
    }
    if (active) { event.preventDefault(); close(); }
    else if (picker?.open) { picker.open = false; summary?.focus(); }
  });
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('popstate', () => {
    if (new URLSearchParams(location.search).get('view') === 'disc-boxes') open(false, true);
    else close(false);
  });
  window.addEventListener('pagehide', () => {
    finishSortTransition();
    hoverPointer = null;
    releaseDrag(); resetInspection(true);
    cancelAnimationFrame(frame); frame = 0; window.clearTimeout(snapTimer);
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && new URLSearchParams(location.search).get('view') === 'disc-boxes') {
      openingDetail = false;
      open(false, true);
    }
    if (active) { resize(); schedule(); }
  });
  if (new URL(window.location.href).searchParams.get('view') === 'disc-boxes') open(false, true);
}

onDomReady(initMovieLibrary, 'movie library');
