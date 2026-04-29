const booksScripts = '<script src="js/grid-zoom.js"></script><script src="js/collection-ui.js"></script><script src="js/collection-controller.js"></script><script src="js/data-fetch.js"></script><script src="js/books-state.js"></script><script src="js/books-filters.js"></script><script src="js/books-modal.js"></script><script src="js/books-events.js"></script><script src="js/books-view.js"></script><script src="js/books.js?v=6"></script><script src="js/sanitize.js"></script><script src="js/theme.js"></script><script src="js/analytics.js"></script>';
const moviesScripts = '<script src="js/grid-zoom.js"></script><script src="js/collection-ui.js"></script><script src="js/collection-controller.js"></script><script src="js/data-fetch.js"></script><script src="js/action-dispatcher.js"></script><script src="js/movie-stats.js"></script><script src="js/letterboxd-render.js"></script><script src="js/letterboxd-state.js"></script><script src="js/letterboxd-filters.js"></script><script src="js/letterboxd-modal.js"></script><script src="js/letterboxd-view.js"></script><script src="js/letterboxd-events.js"></script><script src="js/letterboxd.js"></script><script src="js/sanitize.js"></script><script src="js/theme.js"></script><script src="js/analytics.js"></script>';
const podcastsScripts = '<script src="js/grid-zoom.js"></script><script src="js/collection-ui.js"></script><script src="js/collection-controller.js"></script><script src="js/data-fetch.js"></script><script src="js/sanitize.js"></script><script src="js/action-dispatcher.js"></script><script src="js/podcasts.js"></script><script src="js/theme.js"></script><script src="js/analytics.js"></script>';
const peopleScripts = '<script src="js/theme.js"></script><script src="js/grid-zoom.js"></script><script src="js/collection-ui.js"></script><script src="js/collection-controller.js"></script><script src="js/data-fetch.js"></script><script src="js/sanitize.js"></script><script src="js/action-dispatcher.js"></script><script src="js/people.js"></script><script src="js/analytics.js"></script>';
const essaysScripts = '<script src="vendor/dompurify/purify.min.js"></script><script src="js/sanitize.js"></script><script src="js/collection-ui.js"></script><script src="js/collection-controller.js"></script><script src="js/data-fetch.js"></script><script src="js/action-dispatcher.js"></script><script src="js/essays-state.js"></script><script src="js/essays-filters.js"></script><script src="js/essays-view.js"></script><script src="js/essays.js"></script><script src="js/theme.js"></script><script src="js/analytics.js"></script>';

function option(href, label, active = false, attrs = {}) {
  return { href, label, active, attrs };
}

function section({
  label,
  icon,
  countId = '',
  count = '0',
  tooltip = '',
  attrs = {},
  panelId = '',
  panelClass = ''
}) {
  return { label, icon, countId, count, tooltip, attrs, panelId, panelClass };
}

const COLLECTION_PAGE_CONFIG = {
  books: {
    title: 'Books I Recommend &amp; Notes From My Reading System',
    description: 'A living bookshelf of books Jevan Goldsmith recommends, rereads, and uses to shape decisions, taste, work, and personal systems.',
    bodyClass: 'nav-compact',
    scripts: booksScripts,
    layout: {
      id: 'books-layout',
      className: 'books-layout collection-layout sidebar-collapsed'
    },
    sidebar: {
      id: 'books-sidebar',
      className: 'books-sidebar collection-sidebar collection-sidebar--taste collapsed',
      collapseAction: 'toggle-sidebar',
      listAction: 'toggle-list-dropdown',
      currentListName: 'Books',
      listOptions: [
        option('books.html', 'Books', true),
        option('movies.html', 'Movies'),
        option('podcasts.html', 'Podcasts'),
        option('products.html', 'Products', false, { 'data-analytics': 'cta', 'data-cta-id': 'product-recommendations', 'data-cta-location': 'books' }),
        option('people.html', 'People')
      ],
      search: {
        inputId: 'book-search',
        inputClass: 'book-search-input collection-search-input',
        placeholder: 'Search books...',
        clearButtonId: 'search-clear-btn',
        clearAction: 'clear-search',
        wrapperClass: 'search-input-wrapper search-bubble'
      },
      extraPath: '_src/collections/books/sidebar-filters.html',
      footerText: 'Books with a badge have my full review',
      sections: [
        section({
          label: 'All Books',
          tooltip: 'All Books',
          countId: 'count-all',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="14" y2="10"></line></svg>',
          attrs: { 'data-category': 'all', class: 'active' }
        }),
        section({ label: 'Advertising and Copywriting', tooltip: 'Advertising', countId: 'count-advertising', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>', attrs: { 'data-category': 'advertising' }, panelId: 'category-advertising', panelClass: 'category-books' }),
        section({ label: 'Autobiographies', tooltip: 'Autobiographies', countId: 'count-autobiographies', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>', attrs: { 'data-category': 'autobiographies' }, panelId: 'category-autobiographies', panelClass: 'category-books' }),
        section({ label: 'Big Ideas', tooltip: 'Big Ideas', countId: 'count-bigideas', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>', attrs: { 'data-category': 'bigideas' }, panelId: 'category-bigideas', panelClass: 'category-books' }),
        section({ label: 'The Great Books', tooltip: 'The Great Books', countId: 'count-greatbooks', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>', attrs: { 'data-category': 'greatbooks' }, panelId: 'category-greatbooks', panelClass: 'category-books' }),
        section({ label: 'Out of the Box Thinking', tooltip: 'Out of the Box', countId: 'count-outofthebox', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>', attrs: { 'data-category': 'outofthebox' }, panelId: 'category-outofthebox', panelClass: 'category-books' }),
        section({ label: 'Patience and Clear Thinking', tooltip: 'Patience', countId: 'count-patience', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>', attrs: { 'data-category': 'patience' }, panelId: 'category-patience', panelClass: 'category-books' }),
        section({ label: 'Mental Endurance', tooltip: 'Mental Endurance', countId: 'count-mentalendurance', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.4 9.5 8 10 4.6-.5 8-5 8-10V6l-8-4z"></path><path d="M9 12l2 2 4-4"></path></svg>', attrs: { 'data-category': 'mentalendurance' }, panelId: 'category-mentalendurance', panelClass: 'category-books' }),
        section({ label: 'Learning', tooltip: 'Learning', countId: 'count-learning', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>', attrs: { 'data-category': 'learning' }, panelId: 'category-learning', panelClass: 'category-books' }),
        section({ label: 'Persuasion', tooltip: 'Persuasion', countId: 'count-persuasion', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>', attrs: { 'data-category': 'persuasion' }, panelId: 'category-persuasion', panelClass: 'category-books' }),
        section({ label: 'Psychology Books', tooltip: 'Psychology', countId: 'count-psychology', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 3.5 2 6 4 8l1 4h6l1-4c2-2 4-4.5 4-8a8 8 0 0 0-8-8z"></path><line x1="12" y1="2" x2="12" y2="8"></line><line x1="8" y1="8" x2="16" y2="8"></line></svg>', attrs: { 'data-category': 'psychology' }, panelId: 'category-psychology', panelClass: 'category-books' }),
        section({ label: 'Science', tooltip: 'Science', countId: 'count-science', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v6l3 9H6l3-9V3z"></path><line x1="6" y1="21" x2="18" y2="21"></line><circle cx="12" cy="15" r="1"></circle></svg>', attrs: { 'data-category': 'science' }, panelId: 'category-science', panelClass: 'category-books' }),
        section({ label: 'Storytelling', tooltip: 'Storytelling', countId: 'count-storytelling', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>', attrs: { 'data-category': 'storytelling' }, panelId: 'category-storytelling', panelClass: 'category-books' }),
        section({ label: 'Strategy and War', tooltip: 'Strategy', countId: 'count-strategy', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>', attrs: { 'data-category': 'strategy' }, panelId: 'category-strategy', panelClass: 'category-books' }),
        section({ label: 'Who Am I?', tooltip: 'Who Am I?', countId: 'count-whoami', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>', attrs: { 'data-category': 'whoami' }, panelId: 'category-whoami', panelClass: 'category-books' })
      ]
    },
    main: {
      className: 'books-main collection-main',
      titleTag: 'h2',
      title: 'Bookshelf',
      subtitleHtml: '<div class="philosophy-link-wrapper"><a href="reading-philosophy.html" class="header-subtitle-link">My Reading Philosophy</a><span class="read-first-note">← read this first</span></div>',
      headerExtraPath: '_src/collections/books/header-carousel.html',
      counterExtraPath: '_src/collections/books/header-view-toggle.html',
      counterGroupClass: 'header-right',
      counterId: 'book-count',
      counterLabelId: 'counter-label',
      counterLabel: 'Total Books',
      bodyHtml: '<div id="books-container" class="books-grid"></div><div class="category-grid-view" id="category-grid-view" style="display: none;"><header class="main-header grid-view-header"><div class="header-content"><h1>Bookshelf</h1><div class="philosophy-link-wrapper"><a href="reading-philosophy.html" class="header-subtitle-link">My Reading Philosophy</a><span class="read-first-note">← read this first</span></div></div><div class="view-toggle grid-view-toggle"><button class="view-toggle-btn" id="list-view-btn-grid" data-action="set-view-mode" data-mode="list" title="List view"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button><button class="view-toggle-btn active" id="grid-view-btn-grid" data-action="set-view-mode" data-mode="grid" title="Grid view"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button></div></header><div class="category-grid" id="category-grid"></div></div>'
    },
    afterMainPath: '_src/collections/books/after-main.html'
  },
  movies: {
    title: 'Movie Reviews, Watchlist &amp; Taste Notes',
    description: 'A film archive of movies Jevan Goldsmith has watched, rated, revisited, and used to sharpen taste.',
    bodyClass: 'nav-compact',
    scripts: moviesScripts,
    layout: {
      id: 'movies-layout',
      className: 'movies-layout collection-layout sidebar-collapsed'
    },
    sidebar: {
      id: 'movies-sidebar',
      className: 'movies-sidebar collection-sidebar collection-sidebar--taste collapsed',
      collapseAction: 'toggleSidebar',
      listAction: 'toggleListDropdown',
      currentListName: 'Movies',
      listOptions: [
        option('books.html', 'Books'),
        option('movies.html', 'Movies', true),
        option('podcasts.html', 'Podcasts'),
        option('products.html', 'Products', false, { 'data-analytics': 'cta', 'data-cta-id': 'product-recommendations', 'data-cta-location': 'movies' }),
        option('people.html', 'People')
      ],
      search: {
        inputId: 'movie-search',
        inputClass: 'movie-search-input collection-search-input',
        placeholder: 'Search movies...',
        clearButtonId: 'movie-search-clear-btn',
        clearAction: 'clearMovieSearch',
        searchAction: 'searchMovies',
        searchUsesValue: true,
        searchEvent: 'input',
        wrapperClass: 'search-input-wrapper search-bubble'
      },
      extraPath: '_src/collections/movies/sidebar-filters.html',
      loadingMessage: 'Loading...',
      sectionsWrapperId: 'sidebar-content',
      footerText: 'Movies with a badge have my full review',
      footerId: 'sidebar-footer',
      footerHidden: true,
      sections: [
        section({ label: 'All Movies', tooltip: 'All Movies', countId: 'count-all-movies', icon: '🎬', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'all', 'data-action-eventobj': 'true', 'data-genre': 'all', class: 'active' } }),
        section({ label: 'Action', tooltip: 'Action', countId: 'count-action', icon: '💥', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Action', 'data-action-eventobj': 'true', 'data-genre': 'Action' }, panelId: 'genre-action', panelClass: 'genre-movies' }),
        section({ label: 'Comedy', tooltip: 'Comedy', countId: 'count-comedy', icon: '😂', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Comedy', 'data-action-eventobj': 'true', 'data-genre': 'Comedy' }, panelId: 'genre-comedy', panelClass: 'genre-movies' }),
        section({ label: 'Drama', tooltip: 'Drama', countId: 'count-drama', icon: '🎭', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Drama', 'data-action-eventobj': 'true', 'data-genre': 'Drama' }, panelId: 'genre-drama', panelClass: 'genre-movies' }),
        section({ label: 'Horror', tooltip: 'Horror', countId: 'count-horror', icon: '👻', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Horror', 'data-action-eventobj': 'true', 'data-genre': 'Horror' }, panelId: 'genre-horror', panelClass: 'genre-movies' }),
        section({ label: 'Sci-Fi', tooltip: 'Sci-Fi', countId: 'count-scifi', icon: '🚀', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Sci-Fi', 'data-action-eventobj': 'true', 'data-genre': 'Sci-Fi' }, panelId: 'genre-scifi', panelClass: 'genre-movies' }),
        section({ label: 'Romance', tooltip: 'Romance', countId: 'count-romance', icon: '💕', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Romance', 'data-action-eventobj': 'true', 'data-genre': 'Romance' }, panelId: 'genre-romance', panelClass: 'genre-movies' }),
        section({ label: 'Thriller', tooltip: 'Thriller', countId: 'count-thriller', icon: '😱', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Thriller', 'data-action-eventobj': 'true', 'data-genre': 'Thriller' }, panelId: 'genre-thriller', panelClass: 'genre-movies' }),
        section({ label: 'Documentary', tooltip: 'Documentary', countId: 'count-documentary', icon: '📹', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'Documentary', 'data-action-eventobj': 'true', 'data-genre': 'Documentary' }, panelId: 'genre-documentary', panelClass: 'genre-movies' })
      ]
    },
    main: {
      className: 'movies-main collection-main',
      title: 'My Movie Reviews',
      subtitleHtml: '<div class="philosophy-link-wrapper"><a href="movie-philosophy.html" class="header-subtitle-link">My Movie Philosophy</a><span class="read-first-note">← read this first</span></div>',
      counterId: 'movie-count',
      counterLabel: 'Movies Watched',
      bodyHtml: '<div id="loading" class="loading"><p>Loading recent movies from Letterboxd...</p></div><div id="error" class="error-message" style="display: none;"><p>Unable to load movies from Letterboxd. Please check the username in the code or try again later.</p></div><section id="movie-stats-panel" class="movie-stats-panel" aria-label="Watch stats"><div class="stats-header"><h2>Watch stats</h2><button type="button" class="stats-toggle" aria-expanded="true" aria-controls="movie-stats-panel" aria-label="Hide stats"><svg class="stats-toggle-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="stats-body"></div></section><div id="movies-container" class="movies-grid" style="display: none;"></div>'
    },
    afterMainPath: '_src/collections/movies/after-main.html'
  },
  podcasts: {
    title: 'Podcasts, Conversations &amp; Audio Notes',
    description: 'A podcast archive of conversations, shows, and audio ideas Jevan Goldsmith returns to.',
    bodyClass: 'nav-compact',
    scripts: podcastsScripts,
    layout: {
      id: 'podcasts-layout',
      className: 'movies-layout podcasts-layout collection-layout sidebar-collapsed'
    },
    sidebar: {
      id: 'podcasts-sidebar',
      className: 'movies-sidebar collection-sidebar collection-sidebar--taste collapsed',
      collapseAction: 'togglePodcastSidebar',
      listAction: 'togglePodcastListDropdown',
      currentListName: 'Podcasts',
      listOptions: [
        option('books.html', 'Books'),
        option('movies.html', 'Movies'),
        option('podcasts.html', 'Podcasts', true),
        option('products.html', 'Products', false, { 'data-analytics': 'cta', 'data-cta-id': 'product-recommendations', 'data-cta-location': 'podcasts' }),
        option('people.html', 'People')
      ],
      search: {
        inputId: 'podcast-search',
        inputClass: 'movie-search-input collection-search-input',
        placeholder: 'Search podcasts...',
        clearButtonId: 'podcast-search-clear-btn',
        clearAction: 'clearPodcastSearch',
        searchAction: 'searchPodcasts',
        searchUsesValue: true,
        searchEvent: 'input',
        wrapperClass: 'search-input-wrapper search-bubble'
      },
      footerText: 'Shows and episodes I return to',
      sections: [
        section({ label: 'All Podcasts', tooltip: 'All Podcasts', countId: 'count-all-podcasts', count: '10', icon: '🎧', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'all', 'data-action-this': 'true', 'data-podcast-category': 'all', class: 'active' } }),
        section({ label: 'Business & Investing', tooltip: 'Business & Investing', countId: 'count-business', count: '3', icon: '💼', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'business', 'data-action-this': 'true', 'data-podcast-category': 'business' } }),
        section({ label: 'Science & Ideas', tooltip: 'Science & Ideas', countId: 'count-ideas', count: '2', icon: '🧠', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'ideas', 'data-action-this': 'true', 'data-podcast-category': 'ideas' } }),
        section({ label: 'Personal Development', tooltip: 'Personal Development', countId: 'count-development', count: '2', icon: '⚡', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'development', 'data-action-this': 'true', 'data-podcast-category': 'development' } }),
        section({ label: 'Must-Listen Episodes', tooltip: 'Must-Listen Episodes', countId: 'count-episodes', count: '3', icon: '★', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'episodes', 'data-action-this': 'true', 'data-podcast-category': 'episodes' } })
      ]
    },
    main: {
      className: 'movies-main collection-main',
      title: 'Podcasts I Listen To',
      subtitleText: 'Conversations, shows, and episodes that shaped how I think about business, technology, and life.',
      counterId: 'podcast-count',
      counterLabel: 'Audio Notes',
      bodyPath: '_src/collections/podcasts/main-body.html'
    },
    afterMainPath: '_src/collections/podcasts/after-main.html'
  },
  people: {
    title: 'People Who Inspire Me',
    description: 'A people archive of thinkers, builders, writers, and creators who shaped Jevan Goldsmith\'s taste and judgment.',
    bodyClass: 'nav-compact',
    scripts: peopleScripts,
    layout: {
      id: 'people-layout',
      className: 'people-layout collection-layout sidebar-collapsed'
    },
    sidebar: {
      id: 'people-sidebar',
      className: 'people-sidebar collection-sidebar collapsed',
      collapseAction: 'togglePeopleSidebar',
      search: {
        inputId: 'people-search',
        inputClass: 'collection-search-input',
        placeholder: 'Search people...',
        clearButtonId: 'people-search-clear-btn',
        clearAction: 'clearPeopleSearch',
        searchAction: 'filterPeople',
        searchUsesValue: true,
        searchEvent: 'input',
        wrapperClass: 'search-bubble'
      },
      sections: [
        section({ label: 'All People', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>', count: '12', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' } }),
        section({ label: 'Business & Investing', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', count: '3', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'business', 'data-action-eventobj': 'true' } }),
        section({ label: 'Writers & Thinkers', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>', count: '4', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'writers', 'data-action-eventobj': 'true' } }),
        section({ label: 'Science & Technology', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', count: '3', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'science', 'data-action-eventobj': 'true' } }),
        section({ label: 'Creators & Artists', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>', count: '2', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'creators', 'data-action-eventobj': 'true' } })
      ]
    },
    main: {
      className: 'people-main collection-main',
      title: 'People',
      subtitleHtml: '<div class="philosophy-link-wrapper"><a href="people-philosophy.html" class="header-subtitle-link">My People Philosophy</a><span class="read-first-note">← read this first</span></div>',
      counterId: 'people-count',
      counterLabel: 'People Listed',
      bodyHtml: '<div id="people-container"><div class="people-grid" id="people-grid"></div></div>'
    },
    afterMainPath: '_src/collections/people/after-main.html'
  },
  essays: {
    title: 'Essays on Thinking, Business, Culture &amp; Personal Systems',
    description: 'Longer essays from Jevan Goldsmith on attention, business, culture, decisions, money, meaning, and useful systems.',
    bodyClass: 'nav-compact',
    scripts: essaysScripts,
    layout: {
      id: 'essays-layout',
      className: 'essays-layout collection-layout'
    },
    sidebar: {
      id: 'essays-sidebar',
      className: 'essays-sidebar collection-sidebar',
      collapseAction: 'toggleEssaysSidebar',
      listAction: 'toggleListDropdown',
      currentListName: 'Essays',
      listOptions: [
        option('essays.html', 'Essays', true, { 'data-analytics': 'cta', 'data-cta-id': 'best-essays', 'data-cta-location': 'essays' }),
        option('books.html', 'Books'),
        option('movies.html', 'Movies'),
        option('podcasts.html', 'Podcasts')
      ],
      search: {
        inputId: 'essay-search',
        inputClass: 'book-search-input collection-search-input',
        placeholder: 'Search essays...',
        clearButtonId: 'search-clear-btn',
        clearAction: 'clearEssaySearch',
        searchAction: 'searchEssays',
        searchUsesValue: true,
        searchEvent: 'input',
        wrapperClass: 'search-input-wrapper search-bubble'
      },
      sections: [
        section({ label: 'All Essays', tooltip: 'All Essays', countId: 'count-all', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' } }),
        section({ label: 'Philosophy', tooltip: 'Philosophy', countId: 'count-philosophy', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'philosophy', 'data-action-eventobj': 'true' }, panelId: 'category-philosophy', panelClass: 'category-essays' }),
        section({ label: 'Management', tooltip: 'Management', countId: 'count-management', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'management', 'data-action-eventobj': 'true' }, panelId: 'category-management', panelClass: 'category-essays' }),
        section({ label: 'Technology', tooltip: 'Technology', countId: 'count-technology', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'technology', 'data-action-eventobj': 'true' }, panelId: 'category-technology', panelClass: 'category-essays' }),
        section({ label: 'Personal', tooltip: 'Personal', countId: 'count-personal', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'personal', 'data-action-eventobj': 'true' }, panelId: 'category-personal', panelClass: 'category-essays' }),
        section({ label: 'Finance', tooltip: 'Finance', countId: 'count-finance', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'finance', 'data-action-eventobj': 'true' }, panelId: 'category-finance', panelClass: 'category-essays' }),
        section({ label: 'Writing', tooltip: 'Writing', countId: 'count-writing', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'writing', 'data-action-eventobj': 'true' }, panelId: 'category-writing', panelClass: 'category-essays' })
      ]
    },
    main: {
      className: 'essays-main collection-main',
      title: 'Essays',
      subtitleText: 'Thoughts on philosophy, management, and modern life',
      counterId: 'essay-count',
      counterLabel: 'Essays Published',
      bodyHtml: '<div id="essays-container" class="content-section"></div>'
    },
    afterMainPath: '_src/collections/essays/after-main.html'
  }
};

const TASK_LIST_CONFIG = {
  projects: {
    titleSuffix: 'Projects',
    description: 'Projects Jevan Goldsmith is building, exploring, and planning.',
    scripts: '<script src="js/grid-zoom.js"></script>\n    <script src="js/action-dispatcher.js"></script>\n    <script src="js/projects.js"></script>\n    <script src="js/theme.js"></script>\n    <script src="js/analytics.js"></script>',
    defaultStatus: 'planned',
    statusOrder: ['active', 'completed', 'planned'],
    statusMeta: {
      active: { label: 'Active', emoji: '⚡' },
      completed: { label: 'Completed', emoji: '✅' },
      planned: { label: 'Planned', emoji: '📋' }
    },
    categoryMap: {
      software: { label: 'Software', emoji: '💻' },
      research: { label: 'Research', emoji: '📚' },
      ai: { label: 'AI', emoji: '🤖' },
      writing: { label: 'Writing', emoji: '✍️' },
      'real-estate': { label: 'Real Estate', emoji: '🏠' },
      finance: { label: 'Finance', emoji: '💰' }
    },
    categoryFallback: { emoji: '🛠️' },
    filterAction: 'filterProjects',
    listOptions: [
      { href: 'projects.html', label: 'Projects', active: true },
      { href: 'challenges.html', label: 'Challenges' },
      { href: 'free-resources.html', label: 'Resources' },
      { href: 'lesson-logger.html', label: 'Lesson Logger' }
    ],
    listCurrentName: 'Projects',
    toggleSidebarAction: 'toggleProjectSidebar',
    toggleListDropdownAction: 'toggleProjectListDropdown',
    layoutId: 'projects-layout',
    sidebarId: 'projects-sidebar',
    searchInputId: 'project-search',
    searchPlaceholder: 'Search projects...',
    searchAction: 'searchProjects',
    searchClearButtonId: 'project-search-clear-btn',
    searchClearAction: 'clearProjectSearch',
    allLabel: 'All Projects',
    allCountId: 'count-all-projects',
    sidebarFooter: 'Things I am building, exploring, and planning',
    headerTitle: 'Projects',
    headerSubtitle: 'Things I am building, exploring, and learning in public.',
    counterId: 'project-count',
    counterLabel: 'Projects',
    gridId: 'projects-container'
  },
  challenges: {
    titleSuffix: 'Challenges, Constraints & Personal Experiments',
    description: 'A record of challenges, constraints, and experiments Jevan Goldsmith uses to test ideas in real life.',
    scripts: '<script src="js/grid-zoom.js"></script>\n    <script src="js/action-dispatcher.js"></script>\n    <script src="js/challenges.js"></script>\n    <script src="js/theme.js"></script>\n    <script src="js/analytics.js"></script>',
    defaultStatus: 'upcoming',
    statusOrder: ['active', 'upcoming', 'completed'],
    statusMeta: {
      active: { label: 'Active', emoji: '⚡' },
      upcoming: { label: 'Upcoming', emoji: '📋' },
      completed: { label: 'Completed', emoji: '✅' }
    },
    categoryOrder: ['learning', 'fitness', 'creative', 'financial'],
    categoryMap: {
      learning: { label: 'Learning', emoji: '📚' },
      fitness: { label: 'Fitness', emoji: '💪' },
      creative: { label: 'Creative', emoji: '✍️' },
      financial: { label: 'Financial', emoji: '💰' }
    },
    categoryFallback: { emoji: '🎯' },
    filterAction: 'filterChallenges',
    listOptions: [
      { href: 'projects.html', label: 'Projects' },
      { href: 'challenges.html', label: 'Challenges', active: true },
      { href: 'free-resources.html', label: 'Resources', extraAttrs: 'data-analytics="cta" data-cta-id="free-resources" data-cta-location="challenges"' },
      { href: 'lesson-logger.html', label: 'Lesson Logger' }
    ],
    listCurrentName: 'Challenges',
    toggleSidebarAction: 'toggleChallengeSidebar',
    toggleListDropdownAction: 'toggleChallengeListDropdown',
    layoutId: 'challenges-layout',
    sidebarId: 'challenges-sidebar',
    searchInputId: 'challenge-search',
    searchPlaceholder: 'Search challenges...',
    searchAction: 'searchChallenges',
    searchClearButtonId: 'challenge-search-clear-btn',
    searchClearAction: 'clearChallengeSearch',
    allLabel: 'All Challenges',
    allCountId: 'count-all-challenges',
    sidebarFooter: 'Personal challenges, constraints, and experiments',
    headerTitle: 'Challenges',
    headerSubtitle: "Personal challenges I'm taking on to grow, learn, and become better. Public accountability helps.",
    counterId: 'challenge-count',
    counterLabel: 'Challenges',
    gridId: 'challenges-container'
  }
};

function collectionPageConfigFor(view) {
  return COLLECTION_PAGE_CONFIG[view] || null;
}

function taskListConfigFor(view) {
  return TASK_LIST_CONFIG[view] || null;
}

module.exports = {
  collectionPageConfigFor,
  taskListConfigFor
};
