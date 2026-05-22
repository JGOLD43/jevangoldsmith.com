import { state, updateLightboxImage } from './adventures-state';

export function openLightbox(adventureId: string, index: number) {
    const adventure = state.allAdventures.find((item: AnyObj) => item.id === adventureId);
    if (!adventure || !adventure.gallery) return;

    state.lightboxImages = adventure.gallery;
    state.lightboxIndex = index;

    updateLightboxImage();
    (document.getElementById('lightbox') as HTMLElement | null)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeLightbox() {
    (document.getElementById('lightbox') as HTMLElement | null)?.classList.remove('active');
    document.body.style.overflow = 'auto';
}

export function nextImage() {
    state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxImages.length;
    updateLightboxImage();
}

export function prevImage() {
    state.lightboxIndex = (state.lightboxIndex - 1 + state.lightboxImages.length) % state.lightboxImages.length;
    updateLightboxImage();
}

export function bindLightboxEvents() {
    document.addEventListener('keydown', (event) => {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;

        if (event.key === 'Escape') closeLightbox();
        if (event.key === 'ArrowRight') nextImage();
        if (event.key === 'ArrowLeft') prevImage();
    });

    document.addEventListener('click', (event) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && event.target === lightbox) closeLightbox();
    });
}
