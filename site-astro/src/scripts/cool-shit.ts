import { onDomReady } from './dom-ready';

onDomReady(() => {
    const rail = document.getElementById('tag-rail');
    const feed = document.getElementById('feed');
    const count = document.getElementById('feed-count');
    if (!rail || !feed) return;

    const buttons = [...rail.querySelectorAll<HTMLButtonElement>('[data-cat]')];
    const cards = [...feed.querySelectorAll<HTMLElement>('[data-category]')];

    function filter(category: string) {
        let visible = 0;
        for (const button of buttons) {
            const active = button.dataset.cat === category;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        }
        for (const card of cards) {
            card.hidden = category !== 'all' && card.dataset.category !== category;
            if (!card.hidden) visible += 1;
        }
        if (count) count.textContent = `${visible} interest${visible === 1 ? '' : 's'}`;
    }

    rail.addEventListener('click', event => {
        const button = (event.target as Element).closest<HTMLButtonElement>('button[data-cat]');
        if (button) filter(button.dataset.cat || 'all');
    });
}, 'interests init');
