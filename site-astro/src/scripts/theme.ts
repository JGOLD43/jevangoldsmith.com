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

    // Logo video — extracted to logo-video.ts. Loaded on first
    // mouseenter/touchstart of the .logo so the Base bundle stays slim.
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

    // Mobile Navigation. Gated behind a viewport-width media query so the
    // ~50 lines of touch handlers and resize listeners only attach on
    // devices that can actually use them. Desktop never executes any of
    // the mobile-only branch — saves a few ms TBT per page.
    function initMobileNav() {
        const MOBILE_MQ = '(max-width: 968px)';
        const mql = window.matchMedia(MOBILE_MQ);
        // No mobile-nav binding on a desktop-sized viewport. If the user
        // resizes down past the breakpoint we re-bind from the change event.
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

    // Pause the wisdom-ticker CSS animation when the navbar scrolls out
    // of view. CSS marquee animations keep the GPU layer busy even while
    // off-screen — pausing reclaims ~1-2% idle CPU on long pages and
    // saves measurable battery on mobile. Also respects
    // prefers-reduced-motion: pause unconditionally if the user opted out
    // of motion (the CSS animation itself was already gated, this is a
    // belt-and-braces guard).
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
        // Lazy-import + register the service worker so first-visit HTML
        // is in cache for the next nav. Stale-while-revalidate makes
        // repeat-visit FCP near-zero.
        const { registerServiceWorker } = await import('./sw-register');
        registerServiceWorker();
        // Lazy-load Real User Monitoring. Reports Core Web Vitals to a
        // beacon endpoint when one's configured. Without it perf
        // optimization is blind to real-device, real-network experience.
        const { startRum } = await import('./rum');
        startRum();
    }

    function bootChrome() {
        initTheme();
        initMobileNav();
        initNavHeight();
        runWhenIdle(initDeferredChrome);
    }

    // Initialize once on DOM ready. View Transitions integration was
    // tried but broke per-page click handlers (Astro's swap-merge
    // doesn't re-fire init for page-bound script modules), so the site
    // uses Speculation Rules prerender for fast nav and full page-load
    // semantics for the script lifecycle.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootChrome);
    } else {
        bootChrome();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_KEY)) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
})();

export {};
