function initSnapshot() {
    const card = document.getElementById('snapshot-card');
    const toggles = document.querySelectorAll('[data-snapshot-toggle]');
    if (!card || toggles.length === 0) return;

    toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            card.classList.toggle('visible');
        });
    });
}

function initCarousel() {
    const track = document.getElementById('carousel-track');
    const dots = Array.from(document.querySelectorAll<HTMLElement>('[data-carousel-slide]'));
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.feature-card'));
    if (!track || cards.length === 0) return;
    // Mobile uses native horizontal touch-scroll on .carousel-container
    // instead of JS-driven translateX. Skip the JS carousel entirely so
    // it doesn't fight the user's swipe.
    if (window.matchMedia('(max-width: 768px)').matches) return;

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
