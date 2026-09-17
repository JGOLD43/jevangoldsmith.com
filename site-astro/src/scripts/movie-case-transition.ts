interface CaseMovie { title: string; subtitle: string; cover: string; overview: string; href: string; }

/** Opens a physical lid, reveals its disc, then moves the camera into the case. */
export async function openMovieCase(source: HTMLElement, movie: CaseMovie, signal: AbortSignal): Promise<boolean> {
  const template = document.querySelector<HTMLTemplateElement>('#movie-case-opening-template');
  if (!template || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const box = source.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'movie-case-opening-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', `Opening ${movie.title}`);
  overlay.append(template.content.cloneNode(true));
  const shell = overlay.querySelector<HTMLElement>('.movie-open-case')!;
  shell.setAttribute('aria-hidden', 'true');
  const lid = shell.querySelector<HTMLElement>('.movie-case-lid')!;
  const insert = shell.querySelector<HTMLElement>('.movie-case-insert')!;
  shell.querySelectorAll<HTMLElement>('[data-case-title], .movie-disc-label strong, .movie-case-tray-caption').forEach((node) => { node.textContent = movie.title; });
  shell.querySelectorAll<HTMLElement>('[data-case-subtitle], .movie-disc-label span').forEach((node) => { node.textContent = movie.subtitle; });
  shell.querySelector<HTMLElement>('[data-case-overview]')!.textContent = movie.overview || 'A synopsis has not been added yet.';
  shell.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (movie.cover) image.src = movie.cover;
    image.addEventListener('error', () => image.remove(), { once: true });
  });
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch'; prefetch.href = movie.href; prefetch.as = 'document';
  document.head.append(prefetch);

  const hinge = 18;
  const start = { left: `${box.left - box.width - hinge}px`, top: `${box.top}px`, width: `${box.width * 2 + hinge}px`, height: `${box.height}px` };
  Object.assign(shell.style, start);
  lid.style.transform = 'rotateY(180deg)';
  document.body.append(overlay);
  const oldVisibility = source.style.visibility;
  source.style.visibility = 'hidden';
  const animations: Animation[] = [];
  const cleanup = () => {
    animations.forEach((animation) => animation.cancel());
    source.style.visibility = oldVisibility;
    overlay.remove(); prefetch.remove();
  };
  signal.addEventListener('abort', cleanup, { once: true });
  const navHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 58;
  const width = Math.min(760, innerWidth - 36, (innerHeight - navHeight - 100) * 1.44);
  const height = width / 1.44;
  const openPose = { left: `${(innerWidth - width) / 2}px`, top: `${Math.max(navHeight + 46, (innerHeight - height) / 2)}px`, width: `${width}px`, height: `${height}px` };
  const easing = 'cubic-bezier(.22, .7, .22, 1)';
  try {
    const travel = shell.animate([start, openPose], { duration: 780, easing, fill: 'both' });
    animations.push(travel,
      lid.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(180deg)', offset: .12 }, { transform: 'rotateY(0deg)' }], { duration: 780, easing, fill: 'both' }),
      insert.animate([{ opacity: 0 }, { opacity: 0, offset: .35 }, { opacity: 1 }], { duration: 780, fill: 'both' }),
      overlay.animate([{ backgroundColor: '#10111200' }, { backgroundColor: '#101112ed' }], { duration: 780, fill: 'both' }));
    await travel.finished;
    if (signal.aborted) return false;
    overlay.dataset.phase = 'zoom';
    const narrow = innerWidth <= 640;
    const zoomWidth = narrow ? (innerWidth - 32) * 1.35 : Math.min(1060, innerWidth - 48);
    const zoomPose = {
      left: `${narrow ? innerWidth / 2 - zoomWidth * .75 : (innerWidth - zoomWidth) / 2}px`,
      top: `${navHeight + 60}px`, width: `${zoomWidth}px`, height: `${zoomWidth / 1.44}px`
    };
    const zoom = shell.animate([openPose, zoomPose], { duration: 380, easing, fill: 'both' });
    animations.push(zoom);
    await zoom.finished;
    return !signal.aborted;
  } catch {
    cleanup();
    return !signal.aborted;
  }
}
