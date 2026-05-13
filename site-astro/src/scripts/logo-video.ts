// Logo video hover effect, extracted from theme.ts. Loads only on first
// `mouseenter` of the logo so the JS body (~1.2KB minified) doesn't ride
// the Base bundle. The hover-to-play interaction has plenty of latency
// budget for a dynamic import (the video itself takes longer to start).

export function initLogoVideo() {
    const logo = document.querySelector('.logo');
    const video = document.querySelector('.logo-video') as HTMLVideoElement | null;
    if (!logo || !video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let sourceLoaded = false;

    function supportsVideoType(type: string) {
        return Boolean(video && video.canPlayType && video.canPlayType(type).replace('no', ''));
    }

    function densityKey() {
        const dpr = window.devicePixelRatio || 1;
        if (dpr >= 2.75) return '3x';
        if (dpr >= 1.5) return '2x';
        return '1x';
    }

    function videoSourceForDisplay() {
        if (!video) return null;
        const density = densityKey();
        const webm = video.getAttribute(`data-webm-${density}`);
        const mp4 = video.getAttribute(`data-mp4-${density}`);
        if (webm && supportsVideoType('video/webm; codecs="vp9"')) return webm;
        return mp4 || webm;
    }

    function ensureVideoSource() {
        if (sourceLoaded || !video) return;
        const dataSrc = videoSourceForDisplay();
        if (!dataSrc) return;
        video.src = dataSrc;
        video.preload = 'auto';
        video.load();
        sourceLoaded = true;
    }

    function playVideo() {
        if (!video) return;
        ensureVideoSource();
        if (video.readyState >= 2) {
            video.currentTime = 0;
            video.play().catch(() => {});
            return;
        }
        const playOnReady = () => {
            video.currentTime = 0;
            video.play().catch(() => {});
            video.removeEventListener('canplay', playOnReady);
        };
        video.addEventListener('canplay', playOnReady);
    }

    logo.addEventListener('mouseenter', playVideo);
    logo.addEventListener('mouseleave', () => video.pause());
    logo.addEventListener('touchstart', ensureVideoSource, { passive: true });
}
