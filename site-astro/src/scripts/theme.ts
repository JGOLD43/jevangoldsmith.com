// Theme toggle, mobile nav, logo video, nav-height sync.
// Wisdom ticker is rendered at build time in lib/chrome.ts.

import { tryReadString, tryWrite } from '../lib/storage';

const THEME_KEY = 'jg-theme';

function getPreferredTheme() {
    const stored = tryReadString(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme: string) {
    document.documentElement.setAttribute('data-theme', theme);
    tryWrite(THEME_KEY, theme);
    updateToggleButton(theme);
}

function updateToggleButton(theme: string) {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const label = btn.querySelector('span');
    if (label) {
        label.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

function initTheme() {
    const theme = getPreferredTheme();
    setTheme(theme);
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
}

// logo-video.ts is loaded on first hover/touch of .logo so the Base bundle stays slim.
function initLogoVideoLazy() {
    const logo = document.querySelector('.logo');
    if (!logo) return;
    let started = false;
    const trigger = async () => {
        if (started) return;
        started = true;
        const mod = await import('./logo-video');
        mod.initLogoVideo();
    };
    logo.addEventListener('mouseenter', trigger, { once: true });
    logo.addEventListener('touchstart', trigger, { once: true, passive: true });
}

// Mobile nav handlers attach only on viewports that match the breakpoint.
function initMobileNav() {
    const MOBILE_MQ = '(max-width: 968px)';
    const mql = window.matchMedia(MOBILE_MQ);
    if (!mql.matches) {
        mql.addEventListener('change', (event) => {
            if (event.matches) initMobileNav();
        }, { once: true });
        return;
    }
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.nav-dropdown');

    if (!mobileMenuToggle || !navLinks) return;

    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navLinks.classList.toggle('mobile-open');
        document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
    });

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        if (trigger) {
            const handleDropdownClick = (e: Event) => {
                if (window.innerWidth <= 968) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdowns.forEach(d => {
                        if (d !== dropdown) d.classList.remove('mobile-dropdown-open');
                    });
                    dropdown.classList.toggle('mobile-dropdown-open');
                }
            };
            trigger.addEventListener('click', handleDropdownClick);
            trigger.addEventListener('touchend', (e) => {
                if (window.innerWidth <= 968) {
                    e.preventDefault();
                    handleDropdownClick(e);
                }
            });
        }
    });

    navLinks.querySelectorAll('a:not(.dropdown-trigger)').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 968) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-open');
                document.body.style.overflow = '';
                dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
            }
        });
    });

    // Work / Personal mode toggle. The button's icon (digger / explorer)
    // flips via [data-mode] on the button. The whole site re-skins via
    // [data-mode] on <html>. Click triggers a circular wipe transition
    // (like wodniack.dev's theme toggle) expanding from the button.
    const workToggle = document.querySelector('.work-mode-toggle') as HTMLElement | null;
    if (workToggle) {
        const applyMode = (mode: 'work' | 'personal') => {
            document.documentElement.setAttribute('data-mode', mode);
            workToggle.setAttribute('data-mode', mode === 'work' ? 'work' : 'explore');
            workToggle.setAttribute('aria-pressed', mode === 'personal' ? 'true' : 'false');
            try { localStorage.setItem('jg-work-mode', mode); } catch {}
        };
        const current = (): 'work' | 'personal' =>
            (document.documentElement.getAttribute('data-mode') as 'work' | 'personal') || 'work';

        workToggle.addEventListener('click', (event) => {
            event.preventDefault();
            (workToggle as HTMLElement).blur();
            const next: 'work' | 'personal' = current() === 'work' ? 'personal' : 'work';

            // Lock the page in place for the duration of the wipe so
            // nothing under the overlay can shift. Restore after the
            // animation finishes.
            const sy = window.scrollY;
            const sx = window.scrollX;
            const prevBodyStyle = document.body.style.cssText;
            const prevHtmlOverflow = document.documentElement.style.overflow;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${sy}px`;
            document.body.style.left = `-${sx}px`;
            document.body.style.right = '0';
            document.body.style.width = '100%';
            document.documentElement.style.overflow = 'hidden';

            // wodniack.dev-style wipe: snapshot the current viewport
            // by cloning <body> into a fixed overlay, freeze the OLD
            // CSS variables on it, then apply the new mode underneath
            // and wipe the snapshot away with clip-path. The wipe's
            // moving edge is the "line sweeping across the screen" —
            // OLD state visible on one side, NEW state revealed on
            // the other as the line passes.
            const wrap = document.createElement('div');
            wrap.setAttribute('aria-hidden', 'true');
            // transform makes wrap a containing block for its
            // descendants' position:fixed, so cloned <nav> etc. get
            // clipped by the wipe instead of escaping to the viewport
            // and visibly snapping back to their normal slot.
            wrap.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;background:var(--background);transform:translateZ(0);isolation:isolate`;
            // Freeze old CSS variables on the wrap so the cloned DOM
            // renders with the OLD theme even after we flip <html>.
            const cs = getComputedStyle(document.documentElement);
            ['--secondary-color', '--accent-color', '--background', '--background-alt', '--text-color', '--text-light', '--card-bg', '--border-color', '--primary-color', '--navbar-bg', '--dropdown-bg'].forEach((v) => {
                const value = cs.getPropertyValue(v);
                if (value) wrap.style.setProperty(v, value);
            });
            const clone = document.body.cloneNode(true) as HTMLElement;
            // Strip scripts/links from the clone so it doesn't re-run logic.
            clone.querySelectorAll('script, link[rel="stylesheet"]').forEach((el) => el.remove());
            clone.style.cssText = `position:absolute;top:${-sy}px;left:0;width:100vw;margin:0;padding:0`;
            wrap.appendChild(clone);
            document.body.appendChild(wrap);

            // Force a synchronous layout + paint of the wrap before
            // we change anything underneath. Without this, the browser
            // can batch the wrap's first paint with applyMode's
            // repaint, briefly showing the live page in its NEW state
            // *before* the wrap covers it — that's the "jump" the
            // user was seeing.
            wrap.getBoundingClientRect();

            // Schedule the mode swap + animations on the next paint
            // tick so the wrap is guaranteed to be on screen first.
            requestAnimationFrame(() => {
                applyMode(next);

                // Thin black line that travels with the clip edge —
                // visual marker of where OLD ends and NEW begins.
                const line = document.createElement('div');
                line.setAttribute('aria-hidden', 'true');
                line.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:2px;background:#000;z-index:10000;pointer-events:none;transform:translateX(-2px);box-shadow:0 0 12px #0008';
                document.body.appendChild(line);

                const duration = 700;
                const easing = 'cubic-bezier(.65,0,.35,1)';

                // Wipe the snapshot away from left → right. clip-path
                // `inset(0 0 0 X)` clips from the left edge: as X grows
                // from 0 to 100%, the snapshot shrinks to a 0-width strip
                // on the right, revealing the new state beneath.
                const wipe = wrap.animate(
                    { clipPath: ['inset(0 0 0 0)', 'inset(0 0 0 100%)'] },
                    { duration, easing, fill: 'forwards' }
                );
                line.animate(
                    { transform: ['translateX(-2px)', `translateX(${window.innerWidth}px)`] },
                    { duration, easing, fill: 'forwards' }
                );
                wipe.onfinish = () => {
                    wrap.remove();
                    line.remove();
                    // Unlock page scroll without triggering a visible jump.
                    document.body.style.cssText = prevBodyStyle;
                    document.documentElement.style.overflow = prevHtmlOverflow;
                    window.scrollTo(sx, sy);
                };
            });
        });
    }

    // Tap on empty space inside the open mobile nav (below the last
    // item) closes the menu. Only fires when the click target IS the
    // .nav-links container itself — clicks on actual links / dropdown
    // triggers bubble through and are handled by the listeners above.
    navLinks.addEventListener('click', (event) => {
        if (window.innerWidth > 968) return;
        if (event.target !== navLinks) return;
        mobileMenuToggle.classList.remove('active');
        navLinks.classList.remove('mobile-open');
        document.body.style.overflow = '';
        dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 968) {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('mobile-open');
            document.body.style.overflow = '';
            dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
        }
    });
}

function syncNavHeight() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const h = Math.round(navbar.getBoundingClientRect().height);
    if (h > 0) document.documentElement.style.setProperty('--nav-height', `${h}px`);
}

function initNavHeight() {
    syncNavHeight();
    window.addEventListener('resize', syncNavHeight);
    if (window.ResizeObserver) {
        const navbar = document.querySelector('.navbar');
        if (navbar) new ResizeObserver(syncNavHeight).observe(navbar);
    }
}

function runWhenIdle(callback: () => void) {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void };
    if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(callback, { timeout: 2500 });
        return;
    }
    window.addEventListener('load', () => setTimeout(callback, 250), { once: true });
}

// Pause wisdom-ticker CSS animation when the navbar leaves the viewport.
function initWisdomTickerPause() {
    const track = document.querySelector('.wisdom-ticker-track') as HTMLElement | null;
    if (!track) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        track.style.animationPlayState = 'paused';
        return;
    }
    if (typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            track.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        }
    }, { rootMargin: '0px' });
    observer.observe(track);
}

async function initDeferredChrome() {
    initLogoVideoLazy();
    initWisdomTickerPause();
    const { registerServiceWorker } = await import('./sw-register');
    registerServiceWorker();
    if (import.meta.env.RUM_ENDPOINT) {
        const { startRum } = await import('./rum');
        startRum();
    }
}

function bootChrome() {
    initTheme();
    initMobileNav();
    initNavHeight();
    runWhenIdle(initDeferredChrome);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootChrome);
} else {
    bootChrome();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!tryReadString(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light');
    }
});
