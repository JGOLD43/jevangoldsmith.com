import { readInlineJson } from './data-fetch';
import { onDomReady } from './dom-ready';
import { flyCoverToDetail } from './books-flight';
import type { BookBinding } from '../lib/book-binding';
import type { InterviewArtwork } from '../lib/interview-artwork';
import type { VideoArtwork } from '../lib/video-artwork';
import { materialLabels, parseMaterialFilter, type MaterialKind, type MaterialFilter, type LibraryClassification, type ProblemCollection, type ArtArtwork } from '../lib/library-materials';
import { materialCover, fitMaterialHeadline } from './material-cover';

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  ratio: number;
  href: string;
  tier: string;
  tierLabel: string;
  tierColor: string;
  collection: string;
  binding: BookBinding;
  highlightCount: number | null;
  kind: MaterialKind;
  duration?: string | null;
  medium?: string;
  attribution?: { label: string; name: string; url: string };
  classification?: LibraryClassification;
  videoArtwork?: VideoArtwork;
  artArtwork?: ArtArtwork;
  interviewArtwork?: InterviewArtwork;
}

type LibrarySort = 'az' | 'tiers' | 'collection';
const sortNames: Record<LibrarySort, string> = { az: 'A–Z', tiers: 'By tiers', collection: 'By collection' };
const parseSort = (value: string | null | undefined): LibrarySort => value === 'tiers' || value === 'collection' ? value : 'az';

function initBookLibrary() {
  const library = document.querySelector<HTMLElement>('#book-library');
  const stage = library?.querySelector<HTMLElement>('.book-library-stage');
  const track = library?.querySelector<HTMLElement>('.book-library-track');
  const shadowTrack = library?.querySelector<HTMLElement>('.book-library-contact-shadows');
  const title = library?.querySelector<HTMLAnchorElement>('.book-library-title');
  const author = library?.querySelector<HTMLElement>('.book-library-author');
  const request = library?.querySelector<HTMLAnchorElement>('.book-library-request');
  const sortMenu = library?.querySelector<HTMLDetailsElement>('.book-library-sort');
  const groupLabel = library?.querySelector<HTMLElement>('.book-library-group');
  const collectionLabel = library?.querySelector<HTMLElement>('.book-library-collection');
  const thought = library?.querySelector<HTMLElement>('.book-library-thought');
  const thoughtText = thought?.querySelector<HTMLElement>('.book-library-thought-text');
  const controls = library?.querySelector<HTMLElement>('.book-library-controls');
  const sortStatus = library?.querySelector<HTMLElement>('[data-library-sort-status]');
  if (!library || !stage || !track || !title || !author || !request) return;

  const materialSelect = library.querySelector<HTMLSelectElement>('#library-material-type')!;
  const countLabel = library.querySelector<HTMLElement>('[data-library-count]')!;
  const empty = library.querySelector<HTMLElement>('[data-library-empty]')!;
  let materialFilter: MaterialFilter = 'book';
  const allBooks = readInlineJson<LibraryBook[]>('jg-book-library') || [];
  const problemCollections = readInlineJson<ProblemCollection[]>('jg-library-collections') || [];
  const room = library.querySelector<HTMLElement>('.book-library-room');
  const woodGrains = [...stage.querySelectorAll<HTMLElement>('.book-library-wood-grain')];
  const seeds = new Map(allBooks.map(({ id }) => [id, Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0)]));
  const geometry = new WeakMap<HTMLElement, string>();
  const selectedStates = new WeakMap<HTMLElement, boolean>();
  const styleValues = new WeakMap<HTMLElement, Map<string, string>>();
  // Pointer motion often changes one book. Leave every unchanged DOM value alone.
  function setStyle(node: HTMLElement, property: string, value: string) {
    let values = styleValues.get(node);
    if (!values) { values = new Map(); styleValues.set(node, values); }
    if (values.get(property) === value) return;
    values.set(property, value);
    node.style.setProperty(property, value);
  }
  let roomTileWidth = 1;
  const collectionPicker = library.querySelector<HTMLDetailsElement>('.library-collection-picker')!;
  const activeCollection = library.querySelector<HTMLElement>('.library-active-collection')!;
  const collectionChange = library.querySelector<HTMLButtonElement>('[data-library-change-collection]')!;
  const collectionDescription = library.querySelector<HTMLElement>('[data-library-collection-description]')!;
  const collectionGuide = library.querySelector<HTMLAnchorElement>('[data-library-collection-guide]')!;
  const itemNumber = library.querySelector<HTMLElement>('[data-library-item-number]')!;
  let collectionOrder = new Map<string, number>();
  let problemFilter = '';
  const currentCollection = () => problemCollections.find(({ id }) => id === problemFilter);
  let appCounts: Map<string, number> | null = null;
  window.addEventListener('jgold-library-counts', (event) => {
    const records = (event as CustomEvent).detail;
    if (!Array.isArray(records)) return;
    // The native bridge has already matched each request to the local book.
    // Consume only its returned public identity and count on the website.
    appCounts = new Map(records.filter((record) => record && typeof record.publicId === 'string'
      && Number.isSafeInteger(record.highlightCount) && record.highlightCount >= 0)
      .map((record) => [record.publicId, record.highlightCount]));
    selected = -1;
    updateCaption();
    schedule();
  });
  let books = allBooks.filter((item) => item.kind === 'book');
  let sortMode: LibrarySort = 'az';
  let sorting = false;
  let sortAnimations: Animation[] = [];
  let outgoingShelf: HTMLElement | null = null;
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
  let sceneryPosition = 0;
  let drag: { id: number; x: number; y: number; start: number; moved: boolean; book: number | null;
    mode: 'browse' | 'rotate'; pitch: number; yaw: number } | null = null;
  let lastTap: { book: number; x: number; y: number; time: number } | null = null;
  let openingDetail = false;
  let inspectedBook: number | null = null;
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
    if (immediate) { tiltX = tiltY = 0; inspectedBook = null; }
    else schedule();
  }

  function updateHover() {
    if (!hoverPointer || drag || openingDetail) return;
    // Wait for the book to finish pulling out, then respond even if the
    // mouse has stayed still while it moved into place.
    if (Math.abs(position - target) > .001 || Math.abs(openAmount - 1) > .001) return;
    const book = Math.round(target);
    const node = volumes.get(book);
    if (!node) return;
    // Use a stable rectangle, not the rotated faces beneath the pointer:
    // turning the book must not accidentally end its own hover interaction.
    const bounds = hoverBounds ||= node.getBoundingClientRect();
    const x = (hoverPointer.x - bounds.left) / bounds.width * 2 - 1;
    const y = (hoverPointer.y - bounds.top) / bounds.height * 2 - 1;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) {
      tiltTargetX = tiltTargetY = 0;
      return;
    }
    inspectedBook = book;
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

  function orderBooks(mode: LibrarySort) {
    const tierRank: Record<string, number> = { s: 0, a: 1, b: 2, c: 3, d: 4 };
    sortMode = mode;
    const collection = currentCollection();
    collectionOrder = new Map((collection?.readingOrder || collection?.starters || []).map((id, index) => [id, index + 1]));
    books = allBooks.filter((item) => {
      const matchesKind = materialFilter === 'all' || (materialFilter === 'archive' ? item.kind !== 'book' : item.kind === materialFilter);
      const matchesCollection = !collection || item.classification?.collections.includes(collection.id);
      return matchesKind && matchesCollection;
    }).sort((a, b) => {
      if (collection && mode === 'collection') {
        const rank = (id: string) => collectionOrder.get(id) ?? Infinity;
        const starterOrder = rank(a.id) - rank(b.id);
        if (starterOrder) return starterOrder;
        return a.title.localeCompare(b.title, 'en', { numeric: true }) || a.id.localeCompare(b.id);
      }
      const groupOrder = mode === 'tiers' ? (tierRank[a.tier] ?? 5) - (tierRank[b.tier] ?? 5)
        : mode === 'collection' ? a.collection.localeCompare(b.collection, 'en') : 0;
      return groupOrder || a.title.localeCompare(b.title, 'en', { numeric: true }) || a.id.localeCompare(b.id);
    });
    for (const node of volumes.values()) node.remove();
    for (const node of shadows.values()) node.remove();
    volumes.clear();
    shadows.clear();
    selected = -1;
    const onlyBooks = materialFilter === 'book';
    library!.dataset.materials = String(!onlyBooks);
    library!.dataset.collection = String(Boolean(collection));
    activeCollection.hidden = !collection;
    collectionChange.textContent = collection?.label || '';
    collectionDescription.textContent = collection?.description || '';
    collectionGuide.href = collection?.guideHref || '/free-resources.html#collection-guides';
    collectionGuide.setAttribute('aria-label', `Read the collection guide: ${collection?.label || 'All collections'}`);
    countLabel.textContent = `${books.length} ${onlyBooks ? 'books read' : materialFilter === 'all' || materialFilter === 'archive' || materialFilter === 'art' || materialFilter === 'other' ? 'items' : materialLabels[materialFilter].toLowerCase()}`;
    empty.hidden = books.length !== 0;
    if (controls) controls.hidden = books.length === 0;
    if (!books.length && thought) thought.hidden = true;
    library!.querySelectorAll<HTMLButtonElement>('[data-library-collection]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.libraryCollection === problemFilter));
    });
    collectionPicker.dataset.selected = String(Boolean(collection));
    library!.querySelectorAll<HTMLButtonElement>('[data-library-step]').forEach((button) => { button.disabled = books.length < 2; });
    library!.querySelectorAll<HTMLButtonElement>('[data-library-sort]').forEach((button) => {
      button.disabled = !books.length;
      button.setAttribute('aria-pressed', String(button.dataset.librarySort === mode));
    });
    sortMenu?.querySelector('summary')?.setAttribute('aria-label', `Sort library: ${collection?.label || sortNames[mode]}`);
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
    if (!active || openingDetail || !books.length) return;
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
      outgoingShelf.classList.add('book-library-stage-outgoing');
      outgoingShelf.querySelector('.book-library-thought')?.remove();
      outgoingShelf.inert = true;
      outgoingShelf.setAttribute('aria-hidden', 'true');
      outgoingShelf.removeAttribute('tabindex');
      stage!.before(outgoingShelf);
    }
    sceneryPosition += position;
    orderBooks(mode);
    position = target = velocity = 0;
    openAmount = openTarget = 1;
    render();
    updateCaption();
    saveView();
    if (sortStatus) sortStatus.textContent = `Library sorted ${mode === 'az' ? 'A to Z' : mode === 'tiers' ? 'by tier, S to D' : 'by collection'}.`;
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

  function changeMaterials() {
    if (openingDetail) return;
    finishSortTransition();
    releaseDrag();
    hoverPointer = null;
    lastTap = null;
    window.clearTimeout(snapTimer);
    resetInspection(true);
    materialFilter = parseMaterialFilter(materialSelect.value);
    orderBooks(sortMode);
    position = target = velocity = 0;
    openAmount = openTarget = 1;
    resize();
    render();
    updateCaption();
    saveView();
    schedule();
    if (sortStatus) sortStatus.textContent = countLabel.textContent;
  }
  materialSelect.addEventListener('change', () => {
    if (materialSelect.value === 'book') problemFilter = '';
    changeMaterials();
  });

  function saveView() {
    const url = new URL(window.location.href);
    if (active) {
      url.searchParams.set('view', 'library');
      if (materialFilter === 'book') url.searchParams.delete('libraryType');
      else url.searchParams.set('libraryType', materialFilter);
      url.searchParams.delete('librarySearch');
      if (problemFilter) url.searchParams.set('libraryCollection', problemFilter);
      else url.searchParams.delete('libraryCollection');
      if (!books.length) url.searchParams.delete('libraryBook');
      if (books.length) url.searchParams.set('libraryBook', books[wrap(Math.round(target))].id);
      if (sortMode === 'az') url.searchParams.delete('librarySort');
      else url.searchParams.set('librarySort', sortMode);
    } else {
      url.searchParams.set('view', 'gallery');
      url.searchParams.delete('libraryType');
      url.searchParams.delete('librarySearch');
      url.searchParams.delete('libraryBook');
      url.searchParams.delete('librarySort');
      url.searchParams.delete('libraryCollection');
    }
    window.history.replaceState(window.history.state, '', url);
  }

  function updateCaption() {
    if (!books.length) return;
    const index = wrap(Math.round(target));
    if (index === selected) return;
    selected = index;
    const book = books[index];
    const number = collectionOrder.get(book.id);
    itemNumber.hidden = !number;
    itemNumber.textContent = number ? `Item ${number} of ${collectionOrder.size}${number <= 5 ? ' · Guided reading' : ''}` : '';
    if (groupLabel) {
      groupLabel.hidden = false;
      groupLabel.textContent = book.tierLabel;
      groupLabel.dataset.tier = book.tier;
      groupLabel.style.setProperty('--tier-color', book.tierColor);
    }
    if (collectionLabel) {
      collectionLabel.hidden = (book.kind === 'book' && sortMode !== 'collection') || book.collection.toLowerCase() === book.tierLabel.toLowerCase();
      collectionLabel.textContent = book.collection;
    }
    if (thought && thoughtText) {
      const count = appCounts?.get(book.id) ?? book.highlightCount;
      thought.hidden = book.kind !== 'book';
      thought.dataset.bookId = book.id;
      thoughtText.replaceChildren();
      if (count === null) thoughtText.textContent = 'Highlights not synced yet';
      else {
        const number = document.createElement('strong');
        number.textContent = count.toLocaleString();
        thoughtText.append('I’ve saved ', number, count === 1 ? ' highlight' : ' highlights');
      }
    }
    title!.textContent = book.title;
    const external = book.kind !== 'book';
    title!.href = external ? book.href : `${book.href}?from=library`;
    title!.target = external ? '_blank' : '';
    title!.rel = external ? 'noopener noreferrer' : '';
    author!.textContent = external ? [book.medium, book.duration, book.author].filter(Boolean).join(' · ') : book.author;
    request!.textContent = external ? (book.medium === 'Video' ? 'Watch ↗' : 'Read / explore ↗') : 'request';
    request!.setAttribute('aria-label', external ? `Open ${book.title} at its source in a new tab` : 'Request the selected book by email');
    request!.target = external ? '_blank' : '';
    request!.rel = external ? 'noopener noreferrer' : '';
    request!.href = `mailto:hello@jevangoldsmith.com?subject=${encodeURIComponent(`Book request: ${book.title}`)}&body=${encodeURIComponent(`Hi Jevan,\n\nI'm interested in "${book.title}" by ${book.author}.\n\nMy request or recommendation:\n`)}`;
    if (external) request!.href = book.href;
  }

  function createVolume(logical: number) {
    const book = books[wrap(logical)];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'library-volume';
    button.dataset.libraryIndex = String(logical);
    button.dataset.bookId = book.id;
    button.dataset.kind = book.kind;
    const number = collectionOrder.get(book.id);
    button.setAttribute('aria-label', `${number ? `Item ${number} of ${collectionOrder.size}: ` : ''}${book.title}, by ${book.author}`);
    button.style.setProperty('--binding-background', book.binding.background);
    button.style.setProperty('--binding-ink', book.binding.ink);
    if (book.artArtwork) button.style.setProperty('--art-frame', book.artArtwork.frame);
    if (book.kind === 'documentary') {
      // Stacked circular film layers form a continuous-looking cylindrical body
      // at every supported inspection angle, without dozens of side polygons.
      for (let slice = 1; slice <= 6; slice++) {
        const film = document.createElement('span');
        film.className = 'reel-film';
        film.setAttribute('aria-hidden', 'true');
        film.style.transform = `translateZ(calc(var(--depth) * ${-slice / 7}))`;
        button.append(film);
      }
    }
    const faces = book.kind === 'documentary' ? ['back', 'cover'] : ['back', 'spine', 'pages', 'top', 'bottom', 'cover'];
    for (const face of faces) {
      const layer = document.createElement('span');
      layer.className = `library-volume-${face}`;
      layer.setAttribute('aria-hidden', 'true');
      if (face === 'spine') {
        const ns = 'http://www.w3.org/2000/svg';
        const spine = document.createElementNS(ns, 'svg');
        spine.setAttribute('viewBox', '0 0 36 280');
        spine.setAttribute('preserveAspectRatio', 'none');
        const addText = (value: string, y: number, length: number, size: number, color: string, weight: string) => {
          const text = document.createElementNS(ns, 'text');
          text.setAttribute('transform', `translate(18 ${y}) rotate(90)`);
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-family', book.binding.serif ? 'Georgia, serif' : 'Arial, sans-serif');
          text.setAttribute('font-size', String(size));
          text.setAttribute('font-weight', weight);
          text.setAttribute('fill', color);
          text.setAttribute('textLength', String(Math.min(length, value.length * size * .54)));
          text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
          text.textContent = value;
          spine.append(text);
        };
        addText(book.title, 14, 173, 14, book.binding.ink, '700');
        addText(book.author, 198, 67, 9, book.binding.accent, '500');
        layer.append(spine);
      }
      if (face === 'cover' && book.kind !== 'book') layer.append(materialCover(book));
      if (face === 'cover' && number) {
        const badge = document.createElement('span');
        badge.className = 'library-cover-number';
        badge.textContent = String(number).padStart(2, '0');
        layer.append(badge);
      }
      if (face === 'cover' && book.kind === 'book') {
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
    const woodOffset = (-(position + sceneryPosition) * pitch) % 960;
    for (const grain of woodGrains) setStyle(grain, 'transform', `translate3d(${woodOffset}px, 0, 0)`);
    if (room) setStyle(room, 'transform', `translate3d(${(-(position + sceneryPosition) * pitch * .14) % roomTileWidth}px, 0, 0)`);
    setStyle(stage!, '--shelf-depth', `${130 * scale}px`);
    setStyle(stage!, '--shelf-rear-depth', `${52 * scale}px`);
    const center = Math.round(position);
    // Wide cassette labels need more clearance on phones. Ease that clearance
    // in as a cassette approaches, so mixed shelves never jump between gaps.
    let displayGap = gap;
    for (let logical = center - 2; logical <= center + 2; logical++) {
      if (books[wrap(logical)].kind === 'interview') {
        const proximity = clamp(2 - Math.abs(logical - position), 0, 1);
        displayGap = Math.max(displayGap, gap + Math.max(0, 320 * scale - pitch - gap) * proximity);
      }
    }
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
      const seed = seeds.get(book.id)!;
      const height = (230 + seed % 45) * scale * (book.kind === 'interview' ? .72 : book.kind === 'art' || book.kind === 'documentary' ? .85 : 1);
      const width = height * clamp(book.ratio, .48, 1.6);
      const depth = (book.kind === 'book' ? 22 + seed % 18 : book.kind === 'article' ? 4 : book.kind === 'memo' ? 8 : book.kind === 'documentary' ? 24 : 18) * scale;
      const x = distance * pitch + clamp(distance, -1, 1) * displayGap * openAmount;
      const y = -x * .28 + Math.max(0, 1 - Math.abs(distance)) * 90 * scale * openAmount;
      const shadow = shadows.get(logical)!;
      const dimensions = `${width}:${height}:${depth}`;
      if (geometry.get(node) !== dimensions) {
        setStyle(node, '--width', `${width}px`);
        setStyle(node, '--height', `${height}px`);
        setStyle(node, '--depth', `${depth}px`);
        setStyle(shadow, '--width', `${width}px`);
        setStyle(shadow, '--depth', `${depth}px`);
        if (book.kind === 'article' || book.kind === 'documentary' || book.kind === 'interview') fitMaterialHeadline(node, width, height);
        geometry.set(node, dimensions);
      }
      const inspecting = logical === inspectedBook;
      const yaw = inspecting ? tiltY : 0;
      const tilt = inspecting ? tiltX : 0;
      // Direct transforms avoid cascading inherited position variables through
      // every cover, spine and image. The geometry and easing stay identical.
      setStyle(node, 'transform', `translate3d(calc(-50% + ${x}px), calc(-100% + ${y}px), 0) rotateY(${-16 + yaw}deg) rotateX(${tilt}deg) rotateZ(3deg)`);
      setStyle(node, '--inspect-yaw', `${yaw}deg`);
      setStyle(node, '--inspect-shine', String(inspecting ? Math.min(.18, (Math.abs(tiltX) + Math.abs(tiltY)) * .004) : 0));
      setStyle(shadow, 'transform', `translate3d(calc(-50% + ${x}px), ${y}px, 0) rotateY(${-16 + yaw}deg) rotateZ(3deg)`);
      setStyle(node, 'z-index', String(50 - (logical - center)));
      const isSelected = logical === Math.round(target);
      if (selectedStates.get(node) !== isSelected) {
        selectedStates.set(node, isSelected);
        node.setAttribute('aria-pressed', String(isSelected));
        node.tabIndex = isSelected ? 0 : -1;
        if (isSelected && book.kind === 'book') node.setAttribute('aria-describedby', 'book-library-thought');
        else node.removeAttribute('aria-describedby');
      }
    }
    if (thought && !thought.hidden) {
      const settled = Math.abs(target - position) < .02 && openAmount > .98 && !sorting && !openingDetail;
      if (thought.dataset.visible !== String(settled)) thought.dataset.visible = String(settled);
      const node = settled ? volumes.get(Math.round(target)) : null;
      if (node) {
        const bounds = node.getBoundingClientRect();
        const stageBounds = stage!.getBoundingClientRect();
        const half = thought.offsetWidth / 2 + 16;
        setStyle(thought, '--thought-x', `${Math.round(clamp(bounds.left + bounds.width / 2 - stageBounds.left, half, stageBounds.width - half))}px`);
        setStyle(thought, '--thought-y', `${Math.round(Math.max(thought.offsetHeight + 8, bounds.top - stageBounds.top - 32))}px`);
      }
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
    updateHover();
    const tiltEase = reducedMotion.matches ? 1 : 1 - Math.pow(.76, dt);
    tiltX += (tiltTargetX - tiltX) * tiltEase;
    tiltY += (tiltTargetY - tiltY) * tiltEase;
    const shelfMoving = Math.abs(target - position) > .001 || Math.abs(velocity) > .001 || Math.abs(openTarget - openAmount) > .001;
    const tiltMoving = Math.abs(tiltTargetX - tiltX) > .01 || Math.abs(tiltTargetY - tiltY) > .01;
    if (!shelfMoving) { position = target; openAmount = openTarget; velocity = 0; }
    if (!tiltMoving) {
      tiltX = tiltTargetX; tiltY = tiltTargetY;
      if (!tiltX && !tiltY && !drag) inspectedBook = null;
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
    // The room image is 1536 × 1024 and repeats at its rendered height.
    // Overscan by one tile each side, then move the already-painted layer.
    roomTileWidth = (library!.clientHeight + 24) * 1.5;
    if (room) setStyle(room, '--room-tile-width', `${roomTileWidth}px`);
    scale = Math.min(clamp(rect.width / 900, .74, 1), Math.max(.4, rect.height / 350));
    pitch = 62 * scale;
    gap = clamp(rect.width * .255, 105, 280);
    render();
  }

  function select(logical: number) {
    if (!books.length || openingDetail || sorting) return;
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
    if (!active || openingDetail || sorting || !books.length) return;
    select(logical);
    if (books[wrap(logical)].kind !== 'book') {
      lastTap = null;
      ignoreDoubleClickUntil = performance.now() + 400;
      window.open(books[wrap(logical)].href, '_blank', 'noopener,noreferrer');
      return;
    }
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
    if (title!.target === '_blank') return;
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
    document.body.classList.remove('book-library-open');
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
      materialFilter = parseMaterialFilter(params.get('libraryType'));
      problemFilter = problemCollections.some(({ id }) => id === params.get('libraryCollection')) ? params.get('libraryCollection')! : '';
      if (problemFilter && materialFilter === 'book') materialFilter = 'archive';
      materialSelect.value = materialFilter;
      orderBooks(parseSort(params.get('librarySort') || (problemFilter ? 'collection' : null)));
      sceneryPosition = 0;
      const id = params.get('libraryBook');
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
    const native = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
    native?.postMessage(JSON.stringify({ type: 'jgold-library-counts-request',
      books: allBooks.filter((item) => item.kind === 'book').map(({ id, title, author }) => ({ id, title, author })) }));
    schedule();
  }

  document.addEventListener('click', (event) => {
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('[data-open-book-library]')) open();
    if (element?.closest('[data-close-book-library]')) close();
    if (picker && (element?.closest('.books-view-menu button') || !element?.closest('.books-view-picker'))) picker.open = false;
    if (sortMenu?.open && !element?.closest('.book-library-sort')) sortMenu.open = false;
  });

  sortMenu?.querySelectorAll<HTMLButtonElement>('[data-library-sort]').forEach((button) => {
    button.disabled = !books.length;
    button.addEventListener('click', () => changeSort(parseSort(button.dataset.librarySort)));
  });

  function chooseCollection(id: string) {
    if (openingDetail) return;
    problemFilter = problemCollections.some((collection) => collection.id === id) ? id : '';
    if (materialSelect.value === 'book') materialSelect.value = 'archive';
    sortMode = problemFilter ? 'collection' : 'az';
    if (sortMenu) sortMenu.open = false;
    collectionPicker.open = false;
    changeMaterials();
    sortMenu?.querySelector('summary')?.focus({ preventScroll: true });
    if (sortStatus) sortStatus.textContent = `${currentCollection()?.label || 'All collections'}. ${countLabel.textContent}`;
  }
  library.querySelectorAll<HTMLButtonElement>('[data-library-collection]').forEach((button) => {
    button.addEventListener('click', () => chooseCollection(button.dataset.libraryCollection || ''));
  });
  library.querySelector('[data-library-clear-collection]')?.addEventListener('click', () => chooseCollection(''));
  library.querySelector('[data-library-reset]')?.addEventListener('click', () => {
    materialSelect.value = 'archive';
    chooseCollection('');
  });
  library.querySelector('[data-library-topic]')?.addEventListener('click', () => {
    problemFilter = '';
    sortMode = 'collection';
    if (sortMenu) sortMenu.open = false;
    collectionPicker.open = false;
    changeMaterials();
    sortMenu?.querySelector('summary')?.focus({ preventScroll: true });
  });
  collectionChange.addEventListener('click', (event) => {
    // The trigger sits outside Sort; do not immediately close the menu again
    // through the document's outside-click handler.
    event.stopPropagation();
    if (sortMenu) sortMenu.open = true;
    collectionPicker.open = true;
    collectionPicker.querySelector<HTMLElement>(`[data-library-collection="${problemFilter}"]`)?.focus();
  });
  // Hover is a shortcut; native details keeps the same choices available by
  // click, touch and keyboard. Keep the submenu open while moving into it.
  collectionPicker.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) collectionPicker.open = true;
  });
  collectionPicker.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !collectionPicker.contains(document.activeElement)) collectionPicker.open = false;
  });
  sortMenu?.addEventListener('toggle', () => { if (!sortMenu.open) collectionPicker.open = false; });
  collectionPicker.querySelector('summary')?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    collectionPicker.open = true;
    collectionPicker.querySelector('button')?.focus();
  });
  library.querySelectorAll<HTMLButtonElement>('[data-library-step]').forEach((button) => {
    button.disabled = books.length < 2;
    button.addEventListener('click', () => select(Math.round(target) + Number(button.dataset.libraryStep)));
  });
  if (!books.length) request.hidden = true;

  stage.addEventListener('pointerdown', (event) => {
    if (!active || openingDetail || sorting || !books.length || event.button !== 0 || !event.isPrimary) return;
    hoverPointer = null;
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
    if (!active || openingDetail || sorting) return;
    if (!drag) {
      if (event.pointerType !== 'mouse' || event.buttons) return;
      hoverPointer = { x: event.clientX, y: event.clientY };
      updateHover();
      if (tiltTargetX !== tiltX || tiltTargetY !== tiltY) schedule();
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
    if (!active || openingDetail || sorting || !books.length || event.ctrlKey) return;
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
    if ((event.target as Element).closest('input, select, textarea, dialog') || !books.length || openingDetail || sorting || sortMenu?.open) return;
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
    if (event.target === materialSelect) return;
    if (sortMenu?.open && collectionPicker.open) {
      event.preventDefault();
      collectionPicker.open = false;
      collectionPicker.querySelector('summary')?.focus();
      return;
    }
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
    if (new URL(window.location.href).searchParams.get('view') === 'library') {
      // A cover flight restores the listing first, then reopens the
      // library. Do not make the outgoing detail page inert in between.
      if (!document.querySelector('main.detail-page--book')) open(false, true);
    }
    else close(false);
  });
  window.addEventListener('pagehide', () => {
    finishSortTransition();
    hoverPointer = null;
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
  // A plain page visit starts in 3D. An explicit gallery choice survives reloads.
  const initialParams = new URL(window.location.href).searchParams;
  const initialView = initialParams.get('view');
  const focusedGalleryLink = initialParams.has('book') || initialParams.has('year');
  if ((initialView === null && !focusedGalleryLink) || initialView === 'library') open(true, true);
}

onDomReady(initBookLibrary, 'book library');
