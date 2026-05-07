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
