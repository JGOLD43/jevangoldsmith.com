function initSnapshot() {
    const card = document.getElementById('snapshot-card');
    const toggles = document.querySelectorAll('[data-snapshot-toggle]');
    if (!card || toggles.length === 0) return;
    const container = card.closest('.profile-container') as HTMLElement | null;
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    // On mobile: hide the snapshot below the photo with inline !important
    // (which beats the legacy stylesheet rules that would otherwise pin
    // the snapshot off-screen with their own transforms).
    if (isMobile()) {
        card.style.setProperty('transform', 'translateY(100%)', 'important');
    }

    toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            card.classList.toggle('visible');
            if (!container) return;
            container.classList.toggle('is-flipped');
            if (!isMobile()) return;
            const open = container.classList.contains('is-flipped');
            // Cancel any in-flight transition so the new transform takes
            // effect cleanly (legacy stylesheet rules + our own !important
            // would otherwise stall the transition at currentTime=0).
            card.getAnimations().forEach((a) => a.cancel());
            // Animate via the Web Animations API directly — this bypasses
            // the CSS-cascade fight with legacy .snapshot-card rules.
            const from = open ? 'translateY(100%)' : 'translateY(0%)';
            const to = open ? 'translateY(0%)' : 'translateY(100%)';
            const anim = card.animate(
                [{ transform: from }, { transform: to }],
                { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
            );
            anim.onfinish = () => {
                card.style.setProperty('transform', to, 'important');
                anim.cancel();
            };
        });
    });
}

function initCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-carousel-slide]'));
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.feature-card'));
    if (!track || cards.length === 0) return;

    // Mobile path: JS-driven swipe scroll on the carousel container.
    // The cards are <a> elements; native touch-scroll on anchors is
    // unreliable across mobile browsers (link-tap can swallow drag).
    // Drive scrollLeft from touchmove directly.
    if (window.matchMedia('(max-width: 768px)').matches) {
        const container = track.parentElement as HTMLElement | null;
        if (!container) return;
        let startX = 0;
        let startScrollLeft = 0;
        let dragging = false;
        let lastTouchTime = 0;
        container.addEventListener('touchstart', (event) => {
            const t = event.touches[0];
            if (!t) return;
            startX = t.clientX;
            startScrollLeft = container.scrollLeft;
            dragging = true;
            lastTouchTime = performance.now();
        }, { passive: true });
        container.addEventListener('touchmove', (event) => {
            if (!dragging) return;
            const t = event.touches[0];
            if (!t) return;
            const dx = t.clientX - startX;
            container.scrollLeft = startScrollLeft - dx;
            lastTouchTime = performance.now();
        }, { passive: true });
        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            // Snap to nearest card after the drag settles.
            const cardWidth = cards[0].offsetWidth + 24;
            const idx = Math.round(container.scrollLeft / cardWidth);
            container.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
        };
        container.addEventListener('touchend', endDrag, { passive: true });
        container.addEventListener('touchcancel', endDrag, { passive: true });
        // Suppress the link click if user dragged > 8px during the touch.
        cards.forEach((card) => {
            let downX = 0;
            card.addEventListener('touchstart', (event) => { downX = event.touches[0]?.clientX ?? 0; }, { passive: true });
            card.addEventListener('click', (event) => {
                if (Math.abs(((event as MouseEvent).clientX) - downX) > 8 && performance.now() - lastTouchTime < 400) {
                    event.preventDefault();
                }
            });
        });
        return;
    }

    let currentSlide = 0;
    const gap = 24;

    function visibleCards() {
        if (window.innerWidth >= 1024) return 4;
        if (window.innerWidth >= 768) return 3;
        return 1;
    }

    function maxSlide() {
        return Math.max(0, Math.ceil(cards.length - visibleCards()));
    }

    function updateDots() {
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function moveTo(index: number) {
        const cardWidth = cards[0].offsetWidth;
        currentSlide = Math.max(0, Math.min(index, maxSlide()));
        (track as HTMLElement).style.transform = `translateX(-${currentSlide * (cardWidth + gap)}px)`;
        updateDots();
    }

    document.querySelectorAll<HTMLElement>('[data-carousel-direction]').forEach((button) => {
        button.addEventListener('click', () => {
            moveTo(currentSlide + Number(button.dataset.carouselDirection || 0));
        });
    });

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            moveTo(Number(dot.dataset.carouselSlide || 0));
        });
    });

    window.addEventListener('resize', () => moveTo(currentSlide), { passive: true });
    setInterval(() => moveTo(currentSlide >= maxSlide() ? 0 : currentSlide + 1), 5000);
}

function animateValue(element: Element, start: number, end: number, duration: number, suffix: string) {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value.toLocaleString() + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function initStats() {
    const stats = document.querySelectorAll('.stat-number');
    if (stats.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting || entry.target.classList.contains('animated')) return;
            entry.target.classList.add('animated');
            const text = entry.target.textContent || '';
            const match = text.match(/(\d+)/);
            if (!match) return;
            animateValue(entry.target, 0, parseInt(match[1], 10), 2000, text.replace(match[1], ''));
        });
    }, { threshold: 0.5 });

    stats.forEach((stat) => observer.observe(stat));
}

function initSideNav() {
    const sideNav = document.getElementById('side-nav');
    const dots = Array.from(document.querySelectorAll('.side-nav-dot'));
    if (!sideNav || dots.length === 0) return;

    const sections = dots.map((dot) => ({
        id: dot.getAttribute('data-section'),
        element: document.getElementById(dot.getAttribute('data-section')),
        dot
    })).filter((section) => section.element);

    function updateSideNav() {
        const heroHeight = document.getElementById('hero')?.offsetHeight || 500;
        sideNav.classList.toggle('visible', window.scrollY > heroHeight * 0.3);

        let currentSection = sections[0];
        sections.forEach((section) => {
            if (section.element.getBoundingClientRect().top <= window.innerHeight / 2) {
                currentSection = section;
            }
        });

        dots.forEach((dot) => dot.classList.remove('active'));
        if (currentSection) currentSection.dot.classList.add('active');
    }

    dots.forEach((dot) => {
        dot.addEventListener('click', (event) => {
            event.preventDefault();
            const section = document.getElementById(dot.getAttribute('data-section'));
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
    });

    window.addEventListener('scroll', updateSideNav, { passive: true });
    updateSideNav();
}

function initHome() {
    initSnapshot();
    initCarousel();
    initStats();
    initSideNav();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
} else {
    initHome();
}
