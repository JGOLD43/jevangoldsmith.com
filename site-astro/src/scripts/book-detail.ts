import { onDomReady } from './dom-ready';

onDomReady(() => {
  const main = document.querySelector<HTMLElement>('main.detail-page--book');
  const back = main?.querySelector<HTMLAnchorElement>('.detail-back');
  if (!back) return;
  // Keep the return destination in the URL, so refreshes and new tabs
  // still lead back to this book in the library without stored state.
  if (new URLSearchParams(location.search).get('from') === 'library' && main?.dataset.libraryBookId) {
    back.href = `/books.html?${new URLSearchParams({ view: 'library', libraryBook: main.dataset.libraryBookId })}`;
  }
  back.addEventListener('click', (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === location.origin && /\/books(?:\.html)?$/.test(referrer.pathname) && history.length > 1) {
        event.preventDefault();
        history.back();
      }
    } catch { /* The explicit link remains usable when no referrer is available. */ }
  });
}, 'book detail return');
