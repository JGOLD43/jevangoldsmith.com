// Move the physical binding, not its flattened screen-space cover rectangle.
// Every pose includes the camera's perspective origin, so both handoffs match
// the shelf/detail rendering even when the viewport or scroll position changes.
interface VolumePose { transform: string; perspective: string; origin: string; }
const EASING = 'cubic-bezier(.22, .75, .25, 1)';
export const VOLUME_FLIGHT_MS = 480;

function copyVolume(source: HTMLElement) {
  const volume = document.createElement('div');
  volume.className = 'library-volume';
  volume.style.cssText = source.style.cssText;
  for (const child of source.children) volume.append(child.cloneNode(true));
  volume.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  volume.querySelectorAll<HTMLElement>('*').forEach((node) => {
    node.style.visibility = '';
    node.style.viewTransitionName = 'none';
  });
  Object.assign(volume.style, {
    left: '0px', top: '0px', margin: '0', visibility: '',
    transformOrigin: '50% 100%', pointerEvents: 'none',
  });
  return volume;
}

function poseOf(source: HTMLElement, width: number, height: number): VolumePose {
  const style = getComputedStyle(source);
  const parent = source.parentElement!;
  const camera = getComputedStyle(parent);
  const bounds = parent.getBoundingClientRect();
  const matrix = new DOMMatrix(style.transform);
  const sourceWidth = parseFloat(style.width);
  const sourceHeight = parseFloat(style.height);
  // Anchor at the binding's bottom centre, which is also its transform origin.
  const x = bounds.left + parseFloat(style.left) + matrix.m41 + sourceWidth / 2 - width / 2;
  const y = bounds.top + parseFloat(style.top) + matrix.m42 + sourceHeight - height;
  matrix.m41 = matrix.m42 = matrix.m43 = 0;
  matrix.scaleSelf(sourceWidth / width, sourceHeight / height, sourceWidth / width);
  const [ox, oy] = camera.perspectiveOrigin.split(' ').map(parseFloat);
  return {
    transform: `translate3d(${x}px, ${y}px, 0) ${matrix.toString()}`,
    perspective: camera.perspective,
    origin: `${bounds.left + ox}px ${bounds.top + oy}px`,
  };
}

export function createVolumeFlight(source: HTMLElement) {
  const style = getComputedStyle(source);
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  const volume = copyVolume(source);
  volume.style.width = `${width}px`;
  volume.style.height = `${height}px`;
  const layer = document.createElement('div');
  layer.dataset.bookFlightClone = 'true';
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', zIndex: '99999', pointerEvents: 'none',
  });
  const start = poseOf(source, width, height);
  layer.style.perspective = start.perspective;
  layer.style.perspectiveOrigin = start.origin;
  volume.style.transform = start.transform;
  volume.style.willChange = 'transform';
  layer.append(volume);
  document.body.append(layer);
  const motion = volume.animate([{ transform: start.transform }, { transform: start.transform }], {
    duration: VOLUME_FLIGHT_MS, easing: EASING, fill: 'forwards',
  });
  motion.pause();
  let cameraMotion: Animation | undefined;
  return {
    layer, volume, motion,
    flyTo(destination: HTMLElement) {
      const end = poseOf(destination, width, height);
      (motion.effect as KeyframeEffect).setKeyframes([
        { transform: start.transform }, { transform: end.transform },
      ]);
      cameraMotion = layer.animate([
        { perspectiveOrigin: start.origin, perspective: start.perspective },
        { perspectiveOrigin: end.origin, perspective: end.perspective },
      ], { duration: VOLUME_FLIGHT_MS, easing: EASING, fill: 'forwards' });
      motion.play();
    },
    remove() {
      layer.remove();
      motion.cancel();
      cameraMotion?.cancel();
    },
  };
}

export function mountDetailVolume(image: HTMLImageElement, source: HTMLElement) {
  const hero = image.parentElement!;
  const volume = copyVolume(source);
  const width = parseFloat(getComputedStyle(source).width);
  const height = parseFloat(getComputedStyle(source).height);
  const cover = volume.querySelector('img');
  if (cover) cover.src = image.src;
  volume.style.width = `${width}px`;
  volume.style.height = `${height}px`;
  volume.style.visibility = 'hidden';
  const camera = document.createElement('div');
  camera.className = 'book-volume-hero';
  camera.setAttribute('aria-hidden', 'true');
  Object.assign(camera.style, {
    position: 'absolute', inset: '0', perspective: '1800px', pointerEvents: 'none',
  });
  hero.classList.add('has-book-volume');
  hero.setAttribute('role', 'img');
  hero.setAttribute('aria-label', image.alt);
  camera.append(volume);
  hero.append(camera);
  const resize = () => {
    const scale = hero.clientWidth / width;
    // Complete the rotation square to the reader. Retain the binding so
    // its page edges reappear naturally when the return rotation begins.
    volume.style.transform = `translate3d(${(scale - 1) * width / 2}px, ${(scale - 1) * height}px, 0) rotateY(0deg) scale3d(${scale}, ${scale}, ${scale})`;
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(hero);
  const ready = cover?.decode().catch(() => { cover.src = source.querySelector('img')!.src; });
  return { volume, ready, dispose: () => { observer.disconnect(); camera.remove(); } };
}
