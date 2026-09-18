import { onDomReady } from './dom-ready';
import { loadPeopleModalData, normalizePersonName } from './people-data';
type GalleryPerson = { id: string; name: string; title: string; lesson: string; category: string; image: string };


function initPeopleGallery() {
  const root = document.getElementById('people-gallery') as HTMLDialogElement | null;
  if (!root) return;
  const find = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const wall = find('[data-gallery-wall]');
  const track = find('[data-gallery-track]');
  const position = find<HTMLInputElement>('[data-gallery-position]');
  const detail = find<HTMLDialogElement>('[data-gallery-detail]');
  const roomSelect = find<HTMLSelectElement>('[data-gallery-category]');
  const search = find<HTMLInputElement>('[data-gallery-search]');
  const roomNames: Record<string, string> = { all: 'All rooms', business: 'Business', science: 'Science', writers: 'Writers', creators: 'Creators', athletes: 'Athletes' };
  const priority = ['David Ogilvy', 'Charlie Munger', 'Richard Feynman', 'Christopher Nolan', 'Warren Buffett', 'Rick Rubin', 'Andrew Huberman', 'Naval Ravikant'];
  const people: GalleryPerson[] = Array.from(document.querySelectorAll<HTMLElement>('#people-grid .person-card')).map(card => ({
    id: card.dataset.personId || normalizePersonName(card.querySelector('.person-name')?.textContent),
    name: card.querySelector('.person-name')?.textContent?.trim() || '',
    title: card.querySelector('.person-title')?.textContent?.trim() || '',
    lesson: card.querySelector('.person-lesson')?.textContent?.trim() || '',
    category: card.dataset.category || '',
    image: card.querySelector<HTMLImageElement>('img')?.src || ''
  })).sort((a, b) => {
    const rank = (name: string) => { const i = priority.indexOf(name); return i < 0 ? priority.length : i; };
    return rank(a.name) - rank(b.name);
  });
  let filtered = people, category = 'all', query = '', current = 0;
  let detailGeneration = 0, lastTrigger: HTMLElement | null = null, searchTimer = 0, scrollFrame = 0;
  let drag: { x: number; left: number; moved: boolean; id: number } | null = null;
  let suppressClick = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const normal = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function element(tag: string, className: string, text?: string) {
    const el = document.createElement(tag); el.className = className; if (text !== undefined) el.textContent = text; return el;
  }
  function photo(p: GalleryPerson) {
    const initials = element('span', 'pg-person-initials', p.name.split(/\s+/).map(n => n[0]).slice(0, 2).join(''));
    if (!p.image) return initials;
    const image = document.createElement('img'); image.src = p.image; image.alt = ''; image.decoding = 'async'; image.loading = 'lazy';
    image.addEventListener('error', () => image.replaceWith(initials), { once: true }); return image;
  }
  function safeHref(href: string | undefined) {
    if (!href) return null;
    try { const url = new URL(href, location.origin); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; } catch { return null; }
  }
  for (const [key, label] of Object.entries(roomNames)) {
    if (key === 'all') continue;
    const n = people.filter(p => p.category === key).length; if (!n) continue;
    const option = document.createElement('option'); option.value = key; option.textContent = `${label} · ${n}`; roomSelect.append(option);
  }
  function updateLocation() {
    find('[data-gallery-location]').textContent = `${category === 'all' ? 'The collection' : roomNames[category]} · ${filtered.length ? current + 1 : 0} / ${filtered.length}`;
    position.max = String(Math.max(0, filtered.length - 1)); position.value = String(current);
    position.setAttribute('aria-valuetext', filtered[current]?.name || 'No portraits');
    position.disabled = filtered.length < 2;
    find<HTMLButtonElement>('[data-gallery-step="-1"]').disabled = current === 0;
    find<HTMLButtonElement>('[data-gallery-step="1"]').disabled = current >= filtered.length - 1;
    root.dataset.portrait = String(current); root.dataset.portraitCount = String(filtered.length);
    find('[data-gallery-empty]').hidden = filtered.length > 0;
    find('.pg-footer').hidden = !filtered.length;
  }
  function goTo(index: number, instant = false) {
    const card = track.children[index] as HTMLElement | undefined; if (!card) return;
    const first = track.firstElementChild as HTMLElement;
    wall.scrollTo({ left: card.offsetLeft - first.offsetLeft, behavior: instant || reducedMotion.matches ? 'instant' : 'smooth' });
  }
  function renderWall() {
    const fragment = document.createDocumentFragment();
    filtered.forEach((p, index) => {
      const bay = element('article', 'pg-wall-bay');
      const button = element('button', 'pg-portrait') as HTMLButtonElement; button.type = 'button';
      button.setAttribute('aria-label', `Explore ${p.name}`);
      const light = element('span', 'pg-picture-light'); light.setAttribute('aria-hidden', 'true');
      const frame = element('span', `pg-frame pg-frame-${index % 3}`);
      const mat = element('span', 'pg-mat'); mat.append(photo(p)); frame.append(mat);
      const caption = element('span', 'pg-plaque');
      caption.append(element('strong', '', p.name), element('span', 'pg-plaque-role', p.title));
      button.append(light, frame, caption);
      button.addEventListener('click', () => { if (!suppressClick) openDetail(index); });
      button.addEventListener('focus', () => { if (!detail.open) goTo(index); });
      bay.append(button);
      // Furniture stays at the skirting board, between the portraits.
      if (index % 3 === 0 || index % 3 === 2) {
        const furniture = element('div', 'pg-furniture'); furniture.setAttribute('aria-hidden', 'true');
        const kind = index % 6 === 0 ? 'chair' : index % 6 === 2 ? 'plant' : index % 6 === 3 ? 'console' : 'globe';
        const template = find<HTMLTemplateElement>(`[data-gallery-prop="${kind}"]`);
        furniture.classList.add(`pg-furniture-${kind}`); furniture.append(template.content.cloneNode(true)); bay.append(furniture);
      }
      fragment.append(bay);
    });
    track.replaceChildren(fragment); current = 0; wall.scrollLeft = 0; updateLocation();
  }
  function renderSearch() {
    find('[data-gallery-search-count]').textContent = `${filtered.length} ${filtered.length === 1 ? 'portrait' : 'portraits'}`;
    const results = find('[data-gallery-search-results]'); results.replaceChildren();
    for (const [index, p] of filtered.entries()) {
      const b = element('button', 'pg-search-result') as HTMLButtonElement; b.type = 'button';
      const copy = element('span', ''); copy.append(element('strong', '', p.name), element('small', '', p.title)); b.append(photo(p), copy);
      b.addEventListener('click', () => { goTo(index, true); toggleSearch(false); openDetail(index); }); results.append(b);
    }
  }
  function filterPeople() {
    filtered = people.filter(p => (category === 'all' || p.category === category) && normal(p.name + ' ' + p.title + ' ' + p.lesson).includes(normal(query)));
    renderWall(); renderSearch();
  }
  function toggleSearch(open: boolean) {
    find('[data-gallery-search-toggle]').setAttribute('aria-expanded', String(open)); find('[data-gallery-search-panel]').hidden = !open;
    if (open) { renderSearch(); search.focus(); } else find('[data-gallery-search-toggle]').focus();
  }
  async function openDetail(index: number) {
    const p = filtered[index]; if (!p) return;
    const token = ++detailGeneration;
    goTo(index);
    find('[data-gallery-detail-category]').textContent = roomNames[p.category] || 'From the collection';
    find('#pg-detail-name').textContent = p.name; find('[data-gallery-detail-role]').textContent = p.title;
    find('[data-gallery-detail-lesson]').textContent = p.lesson;
    find('[data-gallery-detail-image]').replaceChildren(photo(p));
    find('[data-gallery-detail-bio]').textContent = '';
    find('[data-gallery-detail-media]').replaceChildren();
    find<HTMLAnchorElement>('[data-gallery-profile]').hidden = true;
    if (!detail.open) detail.showModal(); detail.scrollTop = 0;
    const map = await loadPeopleModalData(); if (token !== detailGeneration || !detail.open) return;
    const record = map.get(p.id); if (!record) return;
    find('[data-gallery-detail-bio]').textContent = record.bio || record.thesis || '';
    const media = find('[data-gallery-detail-media]');
    for (const [key, label] of [['books', 'Books'], ['movies', 'Films']]) {
      const entries = (record[key] || []).filter((item: { href?: string }) => safeHref(item.href)); if (!entries.length) continue;
      media.append(element('h3', '', label));
      for (const item of entries) { const a = element('a', '', item.title || item.label || label) as HTMLAnchorElement; a.href = safeHref(item.href)!; media.append(a); }
    }
    const href = safeHref(record.profileHref); if (href) { const a = find<HTMLAnchorElement>('[data-gallery-profile]'); a.href = href; a.hidden = false; }
  }
  function closeDetail() { detail.close(); }
  function setUrl(open: boolean) { const url = new URL(location.href); if (open) url.searchParams.set('view', 'gallery'); else url.searchParams.delete('view'); history.replaceState(history.state, '', url); }
  function openGallery(trigger: HTMLElement | null) {
    if (root.open) return;
    lastTrigger = trigger || document.activeElement as HTMLElement;
    root.showModal(); setUrl(true);
    if (!track.children.length) renderWall();
    root.dataset.galleryState = 'ready';
    root.focus({ preventScroll: true });
  }
  document.querySelectorAll<HTMLElement>('[data-open-people-gallery]').forEach(b => b.addEventListener('click', () => openGallery(b)));
  find('[data-gallery-close]').addEventListener('click', () => root.close());
  root.addEventListener('close', event => {
    if (event.target !== root) return;
    detailGeneration++; clearTimeout(searchTimer); if (detail.open) detail.close();
    find('[data-gallery-search-panel]').hidden = true; find('[data-gallery-search-toggle]').setAttribute('aria-expanded', 'false');
    setUrl(false); lastTrigger?.focus({ preventScroll: true }); drag = null;
  });
  find('[data-gallery-detail-close]').addEventListener('click', closeDetail);
  detail.addEventListener('close', () => { detailGeneration++; });
  detail.addEventListener('click', event => {
    if (event.target !== detail) return;
    const rect = detail.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDetail();
  });
  find('[data-gallery-search-toggle]').addEventListener('click', () => toggleSearch(find('[data-gallery-search-panel]').hidden));
  find('[data-gallery-search-close]').addEventListener('click', () => toggleSearch(false));
  search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = window.setTimeout(() => { query = search.value.trim(); filterPeople(); }, 120); });
  roomSelect.addEventListener('change', () => { category = roomSelect.value; query = ''; search.value = ''; filterPeople(); });
  find('[data-gallery-reset]').addEventListener('click', () => { category = 'all'; roomSelect.value = 'all'; query = ''; search.value = ''; filterPeople(); });
  root.querySelectorAll<HTMLElement>('[data-gallery-step]').forEach(b => b.addEventListener('click', () => goTo(Math.max(0, Math.min(filtered.length - 1, current + Number(b.dataset.galleryStep))))));
  position.addEventListener('input', () => goTo(Number(position.value), true));
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !detail.open && !find('[data-gallery-search-panel]').hidden) {
      event.preventDefault(); toggleSearch(false); return;
    }
    if (detail.open || !find('[data-gallery-search-panel]').hidden || (event.target as HTMLElement).matches('input,select,textarea') || event.altKey || event.metaKey || event.ctrlKey) return;
    let next = current;
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) next++;
    else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) next--;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = filtered.length - 1;
    else return;
    event.preventDefault(); goTo(Math.max(0, Math.min(filtered.length - 1, next)));
  });
  wall.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const first = track.firstElementChild as HTMLElement | null; if (!first) return;
      const next = Math.max(0, Math.min(filtered.length - 1, Math.round(wall.scrollLeft / first.offsetWidth)));
      if (next !== current) { current = next; updateLocation(); }
    });
  }, { passive: true });
  // Native horizontal touch/trackpad scrolling, with mouse-wheel support too.
  wall.addEventListener('wheel', event => {
    if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    event.preventDefault();
    wall.scrollLeft += event.deltaY * (event.deltaMode === 1 ? 24 : event.deltaMode === 2 ? wall.clientWidth : 1);
  }, { passive: false });
  wall.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { x: event.clientX, left: wall.scrollLeft, moved: false, id: event.pointerId }; suppressClick = false;
  });
  wall.addEventListener('pointermove', event => {
    if (!drag) return;
    if (Math.abs(event.clientX - drag.x) > 6) { drag.moved = true; suppressClick = true; wall.setPointerCapture(event.pointerId); wall.classList.add('is-dragging'); }
    if (drag.moved) wall.scrollLeft = drag.left - (event.clientX - drag.x);
  });
  function endDrag() { drag = null; wall.classList.remove('is-dragging'); setTimeout(() => { suppressClick = false; }, 0); }
  wall.addEventListener('pointerup', endDrag); wall.addEventListener('pointercancel', endDrag);
  wall.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = null; });
  wall.addEventListener('dragstart', event => event.preventDefault());
  new ResizeObserver(() => { if (root.open) goTo(current, true); }).observe(wall);
  if (new URL(location.href).searchParams.get('view') === 'gallery') openGallery(null);
}

onDomReady(initPeopleGallery, 'people gallery');
