const { renderDocument } = require('./document');

function renderPersonPageTemplate({
  person,
  books,
  siteName,
  nav,
  footer,
  escapeHTML,
  escapeHtmlAttr
}) {
  const timeline = Array.isArray(person.timeline) ? person.timeline : [];
  const resources = Array.isArray(person.resources) ? person.resources : [];
  const relatedBooks = booksForPerson(person, books);
  const heroImage = person.image || `../images/generated/people/${person.id}-400.jpg`;
  const heroSrcset = person.srcset || [
    `../images/generated/people/${person.id}-200.jpg 200w`,
    `../images/generated/people/${person.id}-400.jpg 400w`,
    `../images/generated/people/${person.id}-800.jpg 800w`
  ].join(', ');

  const main = `<main class="person-profile-page">
        <section class="person-profile-hero">
            <a href="people.html" class="person-profile-back">Back to People</a>
            <div class="person-profile-hero-grid">
                <div class="person-profile-image-wrap">
                    <img src="${escapeHtmlAttr(heroImage)}" srcset="${escapeHtmlAttr(heroSrcset)}" sizes="(max-width: 768px) 90vw, 360px" alt="${escapeHtmlAttr(person.name)}" width="400" height="400" decoding="async" fetchpriority="high">
                </div>
                <div class="person-profile-intro">
                    <p class="person-profile-kicker">${escapeHTML(person.title || 'Person')}</p>
                    <h1>${escapeHTML(person.name)}</h1>
                    <p class="person-profile-bio">${escapeHTML(person.bio || '')}</p>
                    <p class="person-profile-thesis">${escapeHTML(person.thesis || '')}</p>
                </div>
            </div>
        </section>

        <section class="person-profile-section">
            <div class="person-profile-section-header">
                <p class="person-profile-kicker">Timeline</p>
                <h2>Life Events</h2>
            </div>
            ${timeline.length ? `<ol class="person-timeline">
                ${timeline.map((event) => `<li class="person-timeline-item">
                    <time>${escapeHTML(event.year || '')}</time>
                    <div>
                        <h3>${escapeHTML(event.title || '')}</h3>
                        ${event.note ? `<p>${escapeHTML(event.note)}</p>` : ''}
                    </div>
                </li>`).join('\n                ')}
            </ol>` : `<p class="person-profile-empty">Timeline notes will live here as I turn reading notes into dated life events.</p>`}
        </section>

        <section class="person-profile-section">
            <div class="person-profile-section-header">
                <p class="person-profile-kicker">Reading</p>
                <h2>Books And Notes</h2>
            </div>
            <p class="person-profile-note-policy">These notes are designed as commentary: short personal takeaways, applications, questions, and links back to the reading list, not copied chapters or long excerpts.</p>
            ${relatedBooks.length ? `<div class="person-profile-books">
                ${relatedBooks.map((book) => renderBookCard(book, escapeHTML, escapeHtmlAttr)).join('\n                ')}
            </div>` : `<p class="person-profile-empty">No linked books yet.</p>`}
        </section>

        <section class="person-profile-section">
            <div class="person-profile-section-header">
                <p class="person-profile-kicker">Media</p>
                <h2>Videos, Essays, And Primary Sources</h2>
            </div>
            ${resources.length ? `<div class="person-resource-list">
                ${resources.map((resource) => `<a class="person-resource-card" href="${escapeHtmlAttr(resource.url || '#')}" target="_blank" rel="noopener noreferrer">
                    <span>${escapeHTML(resource.type || 'Resource')}</span>
                    <strong>${escapeHTML(resource.title || '')}</strong>
                    ${resource.note ? `<p>${escapeHTML(resource.note)}</p>` : ''}
                </a>`).join('\n                ')}
            </div>` : `<p class="person-profile-empty">This is where I will add the best videos, talks, letters, interviews, essays, and primary sources for ${escapeHTML(person.name)}.</p>`}
        </section>

        <section class="person-profile-section person-profile-notes">
            <div class="person-profile-section-header">
                <p class="person-profile-kicker">My Notes</p>
                <h2>What I Am Taking From This Person</h2>
            </div>
            <div class="person-note-prompts">
                <p><strong>Useful ideas:</strong> Add takeaways in my own words.</p>
                <p><strong>Open questions:</strong> Add what I still need to understand.</p>
                <p><strong>Applications:</strong> Add decisions, habits, or business systems this person changes.</p>
            </div>
        </section>
    </main>`;

  return renderDocument({
    title: `${person.name} - People - ${siteName}`,
    description: person.bio || `${person.name} profile, timeline, books, notes, and resources.`,
    nav,
    main,
    footer,
    scripts: '<script src="js/theme.js"></script><script src="js/analytics.js"></script>',
    baseHref: '../',
    bodyAttributes: 'class="nav-compact"'
  });
}

function booksForPerson(person, books) {
  const titles = new Set(person.bookTitles || []);
  return books.filter((book) => titles.has(book.title));
}

function coverForBook(book) {
  if (book.coverImageMedium || book.coverImage) return book.coverImageMedium || book.coverImage;
  const isbn = String(book.isbn || '').replace(/[^0-9X]/gi, '');
  return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` : '';
}

function renderBookCard(book, escapeHTML, escapeHtmlAttr) {
  const href = `books.html?book=${encodeURIComponent(book.title)}`;
  const cover = coverForBook(book);
  return `<a class="person-profile-book-card" href="${escapeHtmlAttr(href)}">
                    ${cover ? `<img src="${escapeHtmlAttr(cover)}" alt="${escapeHtmlAttr(book.title)} cover" loading="lazy" decoding="async">` : '<span class="person-profile-book-cover-fallback" aria-hidden="true"></span>'}
                    <span>
                        <strong>${escapeHTML(book.title)}</strong>
                        <small>${escapeHTML(book.author || '')}${book.year ? ` · ${escapeHTML(book.year)}` : ''}</small>
                    </span>
                </a>`;
}

module.exports = {
  renderPersonPageTemplate
};
