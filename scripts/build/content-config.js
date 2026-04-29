const CONTENT_PAGE_CONFIG = {
  about: {
    mode: 'raw',
    bodyPath: '_src/content/about/body.html'
  },
  health: {
    mode: 'raw',
    bodyPath: '_src/content/health/body.html'
  },
  'north-star': {
    mode: 'raw',
    bodyPath: '_src/content/north-star/body.html'
  },
  notes: {
    mode: 'raw',
    bodyPath: '_src/content/notes/body.html'
  },
  'important-or-not': {
    mode: 'raw',
    bodyPath: '_src/content/important-or-not/body.html'
  },
  meet: {
    mode: 'raw',
    bodyPath: '_src/content/meet/body.html'
  },
  contact: {
    mode: 'framed',
    bodyPath: '_src/content/contact/body.html',
    header: {
      title: 'Get in Touch',
      subtitle: "I'd love to hear from you"
    },
    mainClass: 'container',
    contentWrapperTag: 'div',
    contentWrapperClass: 'content-section'
  },
  'living-manifesto': {
    mode: 'framed',
    bodyPath: '_src/content/living-manifesto/body.html',
    header: {
      title: 'Living Manifesto',
      subtitle: 'Principles, standards, and bets I am willing to live by — revised as I learn.'
    },
    mainClass: 'container',
    contentWrapperTag: 'article',
    contentWrapperClass: 'reading-philosophy-content'
  },
  speeches: {
    mode: 'framed',
    bodyPath: '_src/content/speeches/body.html',
    header: {
      title: 'Speeches',
      subtitle: 'Talks, toasts, and remarks — written for delivery, kept here as a record.'
    },
    mainClass: 'container',
    contentWrapperTag: 'article',
    contentWrapperClass: 'reading-philosophy-content'
  }
};

function contentPageConfigFor(id) {
  return CONTENT_PAGE_CONFIG[id] || null;
}

module.exports = {
  CONTENT_PAGE_CONFIG,
  contentPageConfigFor
};
