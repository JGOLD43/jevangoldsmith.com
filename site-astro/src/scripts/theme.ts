// Theme toggle, mobile nav, logo video, nav-height sync.
// Wisdom ticker is rendered at build time in lib/chrome.ts.

import { tryReadString, tryWrite } from '../lib/storage';
import { LOCAL_KEYS } from './storage-keys';
import { TIMING } from './timing';

const THEME_KEY = LOCAL_KEYS.theme;

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

// Hover-tooltip driver: JS-controlled so a click cancels any pending
// reveal AND any visible tip. Tooltip only appears after the cursor
// has been over the element for a continuous 1000ms.
const hoverTimers = new WeakMap<HTMLElement, number>();
function attachHoverTip(el: HTMLElement | null) {
    if (!el) return;
    const cancel = () => {
        const t = hoverTimers.get(el);
        if (t) { clearTimeout(t); hoverTimers.delete(el); }
        el.classList.remove('show-hover-tip');
    };
    el.addEventListener('mouseenter', () => {
        if (el.classList.contains('show-toast')) return;
        const t = window.setTimeout(() => {
            if (!el.classList.contains('show-toast')) {
                el.classList.add('show-hover-tip');
            }
        }, 1000);
        hoverTimers.set(el, t);
    });
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('click', cancel);
}

// Briefly show a confirmation toast on a toggle button by stamping
// data-toast with the message and adding .show-toast for 1500ms.
function flashToast(el: Element | null, message: string) {
    if (!el) return;
    const node = el as HTMLElement;
    node.setAttribute('data-toast', message);
    node.classList.remove('show-hover-tip');
    node.classList.add('show-toast');
    window.setTimeout(() => node.classList.remove('show-toast'), TIMING.themeApplySync);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    const btn = document.querySelector('.theme-toggle') as HTMLElement | null;
    flashToast(btn, `Switched to ${next} mode`);
    btn?.blur();
}

function initTheme() {
    const theme = getPreferredTheme();
    setTheme(theme);
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);
    attachHoverTip(toggleBtn as HTMLElement | null);
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

// Work / Personal mode toggle — wipe transition. Runs on every
// viewport (was previously buried inside initMobileNav which exited
// early on desktop).
function initWorkModeToggle() {
const workToggle = document.querySelector('.work-mode-toggle') as HTMLElement | null;
if (workToggle) {
    const applyMode = (mode: 'work' | 'personal') => {
        document.documentElement.setAttribute('data-mode', mode);
        workToggle.setAttribute('data-mode', mode === 'work' ? 'work' : 'explore');
        workToggle.setAttribute('aria-pressed', mode === 'personal' ? 'true' : 'false');
        try { localStorage.setItem(LOCAL_KEYS.workMode, mode); } catch {}
    };
    const current = (): 'work' | 'personal' =>
        (document.documentElement.getAttribute('data-mode') as 'work' | 'personal') || 'work';

    attachHoverTip(workToggle);
    workToggle.addEventListener('click', (event) => {
        event.preventDefault();
        (workToggle as HTMLElement).blur();
        const next: 'work' | 'personal' = current() === 'work' ? 'personal' : 'work';

        // Snapshot the current scroll so the cloned <body> can be
        // offset to where the user actually was on the page. We do
        // NOT lock body scroll any more — the user wants to keep
        // scrolling while the wipe plays. The wrap is position:fixed
        // covering the viewport, so the live page can scroll freely
        // underneath without being visible until the wipe completes.
        const sy = window.scrollY;

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
        // Lock the clone's mode-conditional content to the OLD mode
        // visibility — the CSS rules for these classes are scoped to
        // <html>[data-mode], and once we flip <html> below the clone
        // would otherwise follow the NEW mode and render the wrong
        // copy on the OLD side of the wipe line.
        const oldMode = current();
        // Lock the clone to the OLD mode's hero content. The hero's
        // .mode-work and .mode-personal spans are STACKED in the same
        // grid cell (`grid-area: 1 / 1`); only ONE is `visibility:
        // visible` at a time. The inactive one is `visibility:
        // hidden; display: block` — taking the grid cell's space but
        // invisible. Once applyMode(next) flips html[data-mode], the
        // cascade flips which span is hidden — and on the clone
        // BOTH become hidden if we don't override.
        //
        // Earlier we tried display:none/inline — wrong property.
        // The grid uses visibility. Override visibility !important
        // on the clone so the OLD mode stays visible while the NEW
        // mode is locked hidden, regardless of what the live html's
        // data-mode is.
        // Lock the clone to OLD mode by overriding BOTH display AND
        // visibility. Cascade has multiple conflicting rules:
        //   [data-mode="personal"] .hero-headline .mode-work { display:none }
        //   [data-mode="work"]     .hero-welcome  .mode-personal { display:-webkit-box }
        //   the visibility-based grid stack rule
        // When applyMode(next) flips html[data-mode], the clone's
        // OLD-mode span gets `display: none` from the cascade — the
        // grid cell collapses to NEW span's height → visible shuffle
        // BEHIND the wipe (inside the clone itself, not the live page).
        //
        // Force OLD span fully visible + in-flow, NEW span fully
        // removed, with !important so html[data-mode] flip can't
        // touch the clone.
        const lock = (el: HTMLElement, show: boolean) => {
            if (show) {
                el.style.setProperty('display', 'block', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
            } else {
                el.style.setProperty('display', 'none', 'important');
            }
        };
        clone.querySelectorAll<HTMLElement>('.hero-headline .mode-work, .hero-welcome .mode-work').forEach((el) => {
            lock(el, oldMode === 'work');
        });
        clone.querySelectorAll<HTMLElement>('.hero-headline .mode-personal, .hero-welcome .mode-personal').forEach((el) => {
            lock(el, oldMode === 'personal');
        });
        // Preserve the live body's computed padding/margin so the
        // cloned content lines up exactly with what the user was
        // seeing. (Body has padding-top equal to nav height; if we
        // zero it the clone shifts up by ~67px → visible "jump".)
        const bs = getComputedStyle(document.body);
        clone.style.cssText = `position:absolute;top:${-sy}px;left:0;width:100vw;margin:${bs.margin};padding:${bs.padding}`;
        wrap.appendChild(clone);
        document.body.appendChild(wrap);

        // Force a synchronous layout + paint of the wrap before
        // we change anything underneath. Without this, the browser
        // can batch the wrap's first paint with applyMode's
        // repaint, briefly showing the live page in its NEW state
        // *before* the wrap covers it — that's the "jump" the
        // user was seeing.
        wrap.getBoundingClientRect();

        // DOUBLE-rAF: first rAF queues a callback before the next
        // paint. The browser paints the wrap. Second rAF then runs
        // AFTER the wrap has been committed to the screen. Only
        // then do we flip html[data-mode] (applyMode), so the live
        // page's mode-change can't possibly be visible to the user
        // — the wrap is already on top covering it. Single rAF
        // wasn't enough: the browser sometimes batched the wrap's
        // first paint and applyMode's repaint into the SAME frame,
        // letting the live page's NEW state flash for ~16ms before
        // the wrap occluded it (the "text changes at the start"
        // the user reported).
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                applyMode(next);
                flashToast(workToggle, `Switched to ${next} mode`);

                // Thin black line that travels with the clip edge —
                // visual marker of where OLD ends and NEW begins.
                const line = document.createElement('div');
                line.setAttribute('aria-hidden', 'true');
                line.style.cssText = 'position:fixed;top:0;bottom:0;left:0;width:6px;background:#000;z-index:10000;pointer-events:none;transform:translateX(-6px);box-shadow:0 0 12px #0008';
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
                    { transform: ['translateX(-6px)', `translateX(${window.innerWidth}px)`] },
                    { duration, easing, fill: 'forwards' }
                );
                wipe.onfinish = () => {
                    wrap.remove();
                    line.remove();
                };
            });
        });
    });
}
}

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

    // Work/personal toggle is bound by initWorkModeToggle (called
    // from bootChrome so it runs on desktop too).


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

// Hook every `.view-toggle-single` (grid/list switch on books, movies,
// essays, projects, etc.) so it shows a "Switched to …" toast just like
// the theme + work-mode toggles. Page-specific click handlers update the
// button's `data-current-mode` attribute when they swap views — a
// MutationObserver picks that up and we briefly flash the matching
// label. Centralising it in theme.ts keeps every collection page
// behaviour consistent without per-page edits.
function initViewToggleToast() {
    const toggles = document.querySelectorAll<HTMLElement>('.view-toggle-single');
    if (toggles.length === 0) return;
    toggles.forEach((btn) => {
        attachHoverTip(btn);
        const observer = new MutationObserver((entries) => {
            for (const entry of entries) {
                if (entry.attributeName !== 'data-current-mode') continue;
                const next = btn.getAttribute('data-current-mode') || '';
                const label = next === 'list' ? 'Switched to list' : 'Switched to collections';
                flashToast(btn, label);
            }
        });
        observer.observe(btn, { attributes: true, attributeFilter: ['data-current-mode'] });
        // Stamp an initial tooltip so the hover-tip CSS has something to
        // render. Page-specific code can override `title=` / `aria-label`,
        // but `data-tooltip` is read by the shared toast CSS.
        if (!btn.getAttribute('data-tooltip')) {
            btn.setAttribute('data-tooltip', 'Toggle list / collections view');
        }
    });
}

function bootChrome() {
    initTheme();
    initWorkModeToggle();
    initMobileNav();
    initNavHeight();
    initViewToggleToast();
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
