// Theme toggle, mobile nav, logo video, nav-height sync.
// (Wisdom ticker is rendered at build time in lib/chrome.ts.)

(function() {
    'use strict';

    // Theme Toggle
    const THEME_KEY = 'jg-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(THEME_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme: string) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
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

    // Initialize theme on page load
    function initTheme() {
        const theme = getPreferredTheme();
        setTheme(theme);

        // Add click handler to toggle button
        const toggleBtn = document.querySelector('.theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Logo video hover effect (lazy-load video source on first interaction)
    function initLogoVideo() {
        const logo = document.querySelector('.logo');
        const video = document.querySelector('.logo-video') as HTMLVideoElement | null;
        if (!logo || !video) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let sourceLoaded = false;

        function supportsVideoType(type: string) {
            return Boolean(video.canPlayType && video.canPlayType(type).replace('no', ''));
        }

        function densityKey() {
            const dpr = window.devicePixelRatio || 1;
            if (dpr >= 2.75) return '3x';
            if (dpr >= 1.5) return '2x';
            return '1x';
        }

        function videoSourceForDisplay() {
            const density = densityKey();
            const webm = video.getAttribute(`data-webm-${density}`);
            const mp4 = video.getAttribute(`data-mp4-${density}`);
            if (webm && supportsVideoType('video/webm; codecs="vp9"')) return webm;
            return mp4 || webm;
        }

        function ensureVideoSource() {
            if (sourceLoaded) return;
            const dataSrc = videoSourceForDisplay();
            if (!dataSrc) return;
            video.src = dataSrc;
            video.preload = 'auto';
            video.load();
            sourceLoaded = true;
        }

        function playVideo() {
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
        logo.addEventListener('mouseleave', () => {
            video.pause();
        });
        logo.addEventListener('touchstart', ensureVideoSource, { passive: true });
    }

    // Mobile Navigation
    function initMobileNav() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        const dropdowns = document.querySelectorAll('.nav-dropdown');

        if (!mobileMenuToggle || !navLinks) return;

        mobileMenuToggle.addEventListener('click', () => {
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('mobile-open');
            document.body.style.overflow = navLinks.classList.contains('mobile-open') ? 'hidden' : '';
        });

        // Handle dropdown toggles on mobile
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.dropdown-trigger');
            if (trigger) {
                const handleDropdownClick = (e: Event) => {
                    if (window.innerWidth <= 968) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Close other dropdowns
                        dropdowns.forEach(d => {
                            if (d !== dropdown) {
                                d.classList.remove('mobile-dropdown-open');
                            }
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

        // Close mobile menu when clicking a non-dropdown link
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

        // Close menu when resizing to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-open');
                document.body.style.overflow = '';
                dropdowns.forEach(d => d.classList.remove('mobile-dropdown-open'));
            }
        });
    }

    // Track navbar height as a CSS variable so sticky sidebars align with the nav
    // regardless of compact/non-compact nav or resize changes.
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

    function initDeferredChrome() {
        initLogoVideo();
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initMobileNav();
            initNavHeight();
            runWhenIdle(initDeferredChrome);
        });
    } else {
        initTheme();
        initMobileNav();
        initNavHeight();
        runWhenIdle(initDeferredChrome);
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();

export {};
