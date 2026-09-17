import { readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';
import { flyCoverToDetail } from './books-flight';

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  ratio: number;
  href: string;
}

function initBookLibrary() {
  const library = document.querySelector<HTMLElement>('#book-library');
  const stage = library?.querySelector<HTMLElement>('.book-library-stage');
  const track = library?.querySelector<HTMLElement>('.book-library-track');
  const shadowTrack = library?.querySelector<HTMLElement>('.book-library-contact-shadows');
  const title = library?.querySelector<HTMLAnchorElement>('.book-library-title');
  const author = library?.querySelector<HTMLElement>('.book-library-author');
  const request = library?.querySelector<HTMLAnchorElement>('.book-library-request');
  if (!library || !stage || !track || !title || !author || !request) return;

  const books = readInlineJson<LibraryBook[]>('jg-book-library') || [];
  const picker = document.querySelector<HTMLDetailsElement>('.books-view-picker');
  const summary = picker?.querySelector<HTMLElement>('summary');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const volumes = new Map<number, HTMLButtonElement>();
  const shadows = new Map<number, HTMLElement>();
  const inertElements = new Map<HTMLElement, boolean>();
  const wrap = (index: number) => ((index % books.length) + books.length) % books.length;
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
  let drag: { id: number; x: number; y: number; start: number; moved: boolean; book: number | null;
    mode: 'browse' | 'rotate'; pitch: number; yaw: number } | null = null;
  let lastTap: { book: number; x: number; y: number; time: number } | null = null;
  let openingDetail = false;
  let inspectedBook: number | null = null;
  let hoverBounds: DOMRect | null = null;
  let tiltX = 0;
  let tiltY = 0;
  let tiltTargetX = 0;
  let tiltTargetY = 0;
  let ignoreDoubleClickUntil = 0;

  function resetInspection(immediate = false) {
    hoverBounds = null;
    tiltTargetX = tiltTargetY = 0;
    if (immediate) { tiltX = tiltY = 0; inspectedBook = null; }
    else schedule();
  }

  function releaseDrag() {
    const finished = drag;
    drag = null;
    stage!.removeAttribute('data-dragging');
    stage!.removeAttribute('data-rotating');
    if (finished && stage!.hasPointerCapture(finished.id)) stage!.releasePointerCapture(finished.id);
    return finished;
  }

  function saveView() {
    const url = new URL(window.location.href);
    if (active) {
      url.searchParams.set('view', 'library');
      if (books.length) url.searchParams.set('libraryBook', books[wrap(Math.round(target))].id);
    } else {
      url.searchParams.delete('view');
      url.searchParams.delete('libraryBook');
    }
    window.history.replaceState(window.history.state, '', url);
  }

  function updateCaption() {
    if (!books.length) return;
    const index = wrap(Math.round(target));
    if (index === selected) return;
    selected = index;
    const book = books[index];
    title!.textContent = book.title;
    title!.href = `${book.href}?from=library`;
    author!.textContent = book.author;
    request!.href = `mailto:hello@jevangoldsmith.com?subject=${encodeURIComponent(`Book request: ${book.title}`)}&body=${encodeURIComponent(`Hi Jevan,\n\nI'm interested in "${book.title}" by ${book.author}.\n\nMy request or recommendation:\n`)}`;
  }

  function createVolume(logical: number) {
    const book = books[wrap(logical)];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-volume';
    button.dataset.libraryIndex = String(logical);
    button.setAttribute('aria-label', `${book.title}, by ${book.author}`);
    for (const face of ['back', 'spine', 'pages', 'top', 'bottom', 'cover']) {
      const layer = document.createElement('span');
      layer.className = `library-volume-${face}`;
      layer.setAttribute('aria-hidden', 'true');
      if (face === 'cover') {
        const image = document.createElement('img');
        image.alt = '';
        image.draggable = false;
        image.decoding = 'async';
        image.src = book.cover;
        image.addEventListener('error', () => {
          const fallback = document.createElement('span');
          fallback.className = 'library-volume-fallback';
          fallback.textContent = book.title;
          image.replaceWith(fallback);
        }, { once: true });
        layer.append(image);
      }
      button.append(layer);
    }
    track!.append(button);
    const shadow = document.createElement('span');
    shadow.className = 'library-volume-contact';
    shadowTrack?.append(shadow);
    shadows.set(logical, shadow);
    volumes.set(logical, button);
    return button;
  }

  function render() {
    if (!books.length) return;
    // The grain travels with the books; the distant room moves more slowly.
    // Modulo a complete texture tile keeps long browsing sessions continuous.
    library!.style.setProperty('--wood-offset', `${(-position * pitch) % 960}px`);
    library!.style.setProperty('--room-offset', `${-position * pitch * .14}px`);
    stage!.style.setProperty('--shelf-depth', `${130 * scale}px`);
    stage!.style.setProperty('--shelf-rear-depth', `${52 * scale}px`);
    const center = Math.round(position);
    // A small moving window keeps the infinite shelf light, even for large libraries.
    const radius = Math.min(12, Math.floor((books.length - 1) / 2));
    for (const [logical, node] of volumes) {
      if (Math.abs(logical - center) > radius) {
        node.remove();
        volumes.delete(logical);
        shadows.get(logical)?.remove();
        shadows.delete(logical);
      }
    }
    for (let logical = center - radius; logical <= center + radius; logical++) {
      const node = volumes.get(logical) || createVolume(logical);
      const book = books[wrap(logical)];
      const distance = logical - position;
      // Slightly varied binding sizes, with the cover's true aspect ratio retained.
      const seed = Array.from(book.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const height = (230 + seed % 45) * scale;
      const width = height * clamp(book.ratio, .48, 1.1);
      const x = distance * pitch + clamp(distance, -1, 1) * gap * openAmount;
      const y = -x * .28 + Math.max(0, 1 - Math.abs(distance)) * 90 * scale * openAmount;
      node.style.setProperty('--width', `${width}px`);
      node.style.setProperty('--height', `${height}px`);
      node.style.setProperty('--depth', `${(22 + seed % 18) * scale}px`);
      node.style.setProperty('--x', `${x}px`);
      node.style.setProperty('--y', `${y}px`);
      const inspecting = logical === inspectedBook;
      node.style.setProperty('--inspect-pitch', `${inspecting ? tiltX : 0}deg`);
      node.style.setProperty('--inspect-yaw', `${inspecting ? tiltY : 0}deg`);
      node.style.setProperty('--inspect-shine', String(inspecting ? Math.min(.18, (Math.abs(tiltX) + Math.abs(tiltY)) * .004) : 0));
      const shadow = shadows.get(logical)!;
      shadow.style.setProperty('--x', `${x}px`);
      shadow.style.setProperty('--y', `${y}px`);
      shadow.style.setProperty('--width', `${width}px`);
      shadow.style.setProperty('--depth', `${(22 + seed % 18) * scale}px`);
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
    // The selection movement explains which physical book is leaving the row
    // and which is returning. Keep that direct response visible in reduced
    // motion too, using stronger damping to remove any spring overshoot.
    const damping = reducedMotion.matches ? .55 : .66;
    const stiffness = reducedMotion.matches ? .085 : .075;
    velocity = (velocity + (target - position) * stiffness * dt) * Math.pow(damping, dt);
    position += velocity * dt;
    openAmount += (openTarget - openAmount) * (1 - Math.pow(.8, dt));
    const tiltEase = reducedMotion.matches ? 1 : 1 - Math.pow(.76, dt);
    tiltX += (tiltTargetX - tiltX) * tiltEase;
    tiltY += (tiltTargetY - tiltY) * tiltEase;
    const shelfMoving = Math.abs(target - position) > .001 || Math.abs(velocity) > .001 || Math.abs(openTarget - openAmount) > .001;
    const tiltMoving = Math.abs(tiltTargetX - tiltX) > .01 || Math.abs(tiltTargetY - tiltY) > .01;
    if (!shelfMoving) { position = target; openAmount = openTarget; velocity = 0; }
    if (!tiltMoving) {
      tiltX = tiltTargetX; tiltY = tiltTargetY;
      if (!tiltX && !tiltY && !hoverBounds && !drag) inspectedBook = null;
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
    if (releaseDrag()) select(target);
    resetInspection(true);
    const rect = stage!.getBoundingClientRect();
    scale = Math.min(clamp(rect.width / 900, .74, 1), Math.max(.4, rect.height / 350));
    pitch = 62 * scale;
    gap = clamp(rect.width * .255, 105, 280);
    render();
  }

  function select(logical: number) {
    if (!books.length || openingDetail) return;
    if (document.activeElement?.classList.contains('library-volume')) stage!.focus({ preventScroll: true });
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

  function openDetails(logical: number) {
    if (!active || openingDetail || !books.length) return;
    select(logical);
    const cover = volumes.get(logical)?.querySelector<HTMLImageElement>('img');
    const href = `${books[wrap(logical)].href}?from=library`;
    if (!cover) { window.location.href = href; return; }
    openingDetail = true;
    lastTap = null;
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    library!.inert = true;
    flyCoverToDetail(cover, href, {
      returnHref: window.location.pathname + window.location.search,
      backdrop: library!,
      beforeDetail: () => {
        close(false, false);
        library!.inert = false;
      },
      restoreListing: () => {
        openingDetail = false;
        open(false, true);
      },
    });
  }

  title.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openDetails(Math.round(target));
  });

  function close(updateUrl = true, focus = true) {
    if (!active) return;
    active = false;
    releaseDrag();
    resetInspection(true);
    lastTap = null;
    stage!.removeAttribute('data-dragging');
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    window.clearTimeout(snapTimer);
    library!.hidden = true;
    document.body.classList.remove('book-library-open');
    for (const [element, wasInert] of inertElements) element.inert = wasInert;
    inertElements.clear();
    if (updateUrl) saveView();
    if (focus) summary?.focus({ preventScroll: true });
  }

  function open(updateUrl = true, fromUrl = false) {
    if (picker) picker.open = false;
    if (fromUrl) {
      const id = new URL(window.location.href).searchParams.get('libraryBook');
      const index = books.findIndex((book) => book.id === id);
      target = position = index < 0 ? 0 : index;
      velocity = 0;
      openAmount = openTarget = 1;
    }
    if (!active) {
      active = true;
      library!.hidden = false;
      document.body.classList.add('book-library-open');
      // The site navigation remains usable; only covered page content is inert.
      document.querySelectorAll<HTMLElement>('#books-layout > :not(#book-library):not(script), footer').forEach((element) => {
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
    if (element?.closest('[data-open-book-library]')) open();
    if (element?.closest('[data-close-book-library]')) close();
    if (picker && (element?.closest('.books-view-menu button') || !element?.closest('.books-view-picker'))) picker.open = false;
  });

  library.querySelectorAll<HTMLButtonElement>('[data-library-step]').forEach((button) => {
    button.disabled = books.length < 2;
    button.addEventListener('click', () => select(Math.round(target) + Number(button.dataset.libraryStep)));
  });
  if (!books.length) request.hidden = true;

  stage.addEventListener('pointerdown', (event) => {
    if (!active || openingDetail || !books.length || event.button !== 0 || !event.isPrimary) return;
    window.clearTimeout(snapTimer);
    const node = (event.target as Element).closest<HTMLElement>('[data-library-index]');
    const book = node ? Number(node.dataset.libraryIndex) : null;
    const rotate = book === Math.round(target) && Math.abs(position - target) < .08 && openAmount > .9;
    if (rotate) {
      inspectedBook = book;
      hoverBounds = null;
      stage!.dataset.rotating = 'true';
    } else resetInspection(true);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: target,
      moved: false, book, mode: rotate ? 'rotate' : 'browse', pitch: tiltX, yaw: tiltY };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!active || openingDetail) return;
    if (!drag) {
      if (event.pointerType !== 'mouse' || event.buttons || reducedMotion.matches) return;
      const node = (event.target as Element).closest<HTMLElement>('[data-library-index]');
      const book = node ? Number(node.dataset.libraryIndex) : null;
      if (book !== Math.round(target) || Math.abs(position - target) >= .08 || openAmount <= .9) {
        if (hoverBounds) resetInspection();
        return;
      }
      // Keep a fixed hit-area reference while hovering so the transformed
      // cover never feeds its changing bounds back into its own rotation.
      if (!hoverBounds || inspectedBook !== book) hoverBounds = node!.getBoundingClientRect();
      inspectedBook = book;
      const x = (event.clientX - hoverBounds.left) / hoverBounds.width * 2 - 1;
      const y = (event.clientY - hoverBounds.top) / hoverBounds.height * 2 - 1;
      tiltTargetY = clamp(x, -1, 1) * 16;
      tiltTargetX = -clamp(y, -1, 1) * 10;
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
    // the book, so the second can land on the space it has just vacated.
    // This also gives touch screens the same double-tap interaction.
    const now = performance.now();
    if (!finished.moved && lastTap && now - lastTap.time < 360
      && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 24) {
      openDetails(lastTap.book);
      return;
    }
    lastTap = !finished.moved && finished.book !== null
      ? { book: finished.book, x: event.clientX, y: event.clientY, time: now } : null;
    select(finished.moved ? target : finished.book ?? target);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', (event) => {
    // Touch starts with implicit capture on the cover. Its loss bubbles
    // when we transfer capture to the stage; that is not a cancelled drag.
    if (event.target === stage) endDrag(event);
  });
  stage.addEventListener('pointerleave', () => { if (!drag) resetInspection(); });
  window.addEventListener('blur', () => {
    if (!active) return;
    releaseDrag();
    lastTap = null;
    resetInspection();
    select(target);
  });
  reducedMotion.addEventListener('change', () => { resetInspection(true); if (active) render(); });
  stage.addEventListener('click', (event) => {
    // Keyboard/screen-reader activation has no preceding pointer event.
    if (event.detail !== 0) return;
    const node = (event.target as Element).closest<HTMLElement>('[data-library-index]');
    if (node) select(Number(node.dataset.libraryIndex));
  });
  stage.addEventListener('dblclick', (event) => {
    // Also respect the desktop's native double-click timing preference.
    const node = (event.target as Element).closest<HTMLElement>('[data-library-index]');
    if (!node || performance.now() < ignoreDoubleClickUntil) return;
    event.preventDefault();
    openDetails(Number(node.dataset.libraryIndex));
  });
  stage.addEventListener('wheel', (event) => {
    if (!active || openingDetail || !books.length || event.ctrlKey) return;
    lastTap = null;
    releaseDrag();
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
    if (!books.length || openingDetail) return;
    if (event.key === 'Enter' && (event.target === stage || (event.target as Element).closest('.library-volume'))) {
      event.preventDefault();
      const volume = (event.target as Element).closest<HTMLElement>('[data-library-index]');
      openDetails(volume ? Number(volume.dataset.libraryIndex) : Math.round(target));
      return;
    }
    const directions: Record<string, number> = { ArrowLeft: Math.round(target) - 1, ArrowRight: Math.round(target) + 1, Home: 0, End: books.length - 1 };
    if (event.key in directions) {
      event.preventDefault();
      select(directions[event.key]);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || openingDetail) return;
    if (active) { event.preventDefault(); close(); }
    else if (picker?.open) { picker.open = false; summary?.focus(); }
  });
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('popstate', () => {
    if (new URL(window.location.href).searchParams.get('view') === 'library') {
      // A cover flight restores the listing first, then reopens the
      // library. Do not make the outgoing detail page inert in between.
      if (!document.querySelector('main.detail-page--book')) open(false, true);
    }
    else close(false);
  });
  window.addEventListener('pagehide', () => {
    releaseDrag(); resetInspection(true);
    cancelAnimationFrame(frame); frame = 0; window.clearTimeout(snapTimer);
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && new URLSearchParams(location.search).get('view') === 'library') {
      // A slow connection may use the full-page flight fallback. A
      // browser-cache return must not retain its hidden/inert source.
      openingDetail = false;
      library!.inert = false;
      document.body.classList.remove('is-book-launching');
      document.querySelectorAll('[data-book-flight-clone], [data-book-flight-backdrop]').forEach((node) => node.remove());
      track!.querySelectorAll<HTMLElement>('.library-volume, img').forEach((image) => {
        image.style.visibility = '';
        image.style.viewTransitionName = '';
      });
      open(false, true);
    }
    if (active) { resize(); schedule(); }
  });
  if (new URL(window.location.href).searchParams.get('view') === 'library') open(false, true);
}

onDomReady(initBookLibrary, 'book library');
