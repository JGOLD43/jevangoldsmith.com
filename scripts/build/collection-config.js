const scriptTags = (files) => files.map((file) => `<script src="${file}"></script>`).join('');
const coreCollectionScripts = ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/collection-helpers.js', 'js/data-fetch.js'];
const booksScripts = scriptTags([...coreCollectionScripts, 'js/books.js?v=7', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js']);
const moviesScripts = scriptTags([...coreCollectionScripts, 'js/action-dispatcher.js', 'js/movie-stats.js', 'js/letterboxd.js', 'js/sanitize.js', 'js/theme.js', 'js/analytics.js']);
const podcastsScripts = scriptTags([...coreCollectionScripts, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/podcasts.js', 'js/theme.js', 'js/analytics.js']);
const peopleScripts = scriptTags(['js/theme.js', ...coreCollectionScripts, 'js/sanitize.js', 'js/action-dispatcher.js', 'js/people.js', 'js/analytics.js']);
const essaysScripts = scriptTags(['vendor/dompurify/purify.min.js', 'js/sanitize.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/data-fetch.js', 'js/action-dispatcher.js', 'js/essays.js', 'js/theme.js', 'js/analytics.js']);
const {
  bookSections,
  essaySections,
  movieSections,
  peopleSections,
  podcastSections
} = require('./collection-sections');
const { taskListConfigFor } = require('./task-list-config');

function option(href, label, active = false, attrs = {}) {
  return { href, label, active, attrs };
}

function tasteListOptions(active, location) {
  return [
    option('books.html', 'Books', active === 'books'),
    option('movies.html', 'Movies', active === 'movies'),
    option('podcasts.html', 'Podcasts', active === 'podcasts'),
    option('products.html', 'Products', active === 'products', { 'data-analytics': 'cta', 'data-cta-id': 'product-recommendations', 'data-cta-location': location }),
    option('people.html', 'People', active === 'people')
  ];
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
      listOptions: tasteListOptions('books', 'books'),
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
      sections: bookSections
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
      counterLabel: 'Total Books Read',
      bodyPath: '_src/collections/books/main-body.html'
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
      listOptions: tasteListOptions('movies', 'movies'),
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
      sections: movieSections
    },
    main: {
      className: 'movies-main collection-main',
      title: 'My Movie Reviews',
      subtitleHtml: '<div class="philosophy-link-wrapper"><a href="movie-philosophy.html" class="header-subtitle-link">My Movie Philosophy</a><span class="read-first-note">← read this first</span></div>',
      counterId: 'movie-count',
      counterLabel: 'Movies Watched',
      bodyPath: '_src/collections/movies/main-body.html'
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
      listOptions: tasteListOptions('podcasts', 'podcasts'),
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
      sections: podcastSections
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
      sections: peopleSections
    },
    main: {
      className: 'people-main collection-main',
      title: 'People',
      subtitleHtml: '<div class="philosophy-link-wrapper"><a href="people-philosophy.html" class="header-subtitle-link">My People Philosophy</a><span class="read-first-note">← read this first</span></div>',
      counterId: 'people-count',
      counterLabel: 'People Listed',
      bodyPath: '_src/collections/people/main-body.html'
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
      sections: essaySections
    },
    main: {
      className: 'essays-main collection-main',
      title: 'Essays',
      subtitleText: 'Thoughts on philosophy, management, and modern life',
      counterId: 'essay-count',
      counterLabel: 'Essays Published',
      bodyPath: '_src/collections/essays/main-body.html'
    },
    afterMainPath: '_src/collections/essays/after-main.html'
  }
};

function collectionPageConfigFor(view) {
  return COLLECTION_PAGE_CONFIG[view] || null;
}

module.exports = {
  collectionPageConfigFor,
  taskListConfigFor
};
