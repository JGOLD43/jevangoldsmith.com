function section({
  label,
  icon = '',
  iconKey = '',
  countId = '',
  count = '0',
  tooltip = '',
  attrs = {},
  panelId = '',
  panelClass = ''
}) {
  return { label, icon, iconKey, countId, count, tooltip, attrs, panelId, panelClass };
}

function categorySection({ label, key, icon = '', iconKey = '', tooltip = label, countId = `count-${key}`, attrs = {}, panelPrefix = '', panelClass = '' }) {
  return section({
    label,
    tooltip,
    countId,
    icon,
    iconKey,
    attrs,
    panelId: panelPrefix ? `${panelPrefix}-${key}` : '',
    panelClass
  });
}

function bookSection([label, key, iconKey, tooltip = label]) {
  return categorySection({
    label,
    key,
    iconKey,
    tooltip,
    attrs: { 'data-category': key },
    panelPrefix: 'category',
    panelClass: 'category-books'
  });
}

const bookSections = [
  section({
    label: 'All Books',
    tooltip: 'All Books',
    countId: 'count-all',
    iconKey: 'book',
    attrs: { 'data-category': 'all', class: 'active' }
  }),
  ...[
    ['Advertising and Copywriting', 'advertising', 'megaphone', 'Advertising'],
    ['Autobiographies', 'autobiographies', 'user'],
    ['Big Ideas', 'bigideas', 'lightbulb', 'Big Ideas'],
    ['The Great Books', 'greatbooks', 'openBook', 'The Great Books'],
    ['Out of the Box Thinking', 'outofthebox', 'grid', 'Out of the Box'],
    ['Patience and Clear Thinking', 'patience', 'clock', 'Patience'],
    ['Mental Endurance', 'mentalendurance', 'heart', 'Mental Endurance'],
    ['Learning', 'learning', 'graduation'],
    ['Persuasion', 'persuasion', 'target'],
    ['Psychology Books', 'psychology', 'brain', 'Psychology'],
    ['Science', 'science', 'flask'],
    ['Storytelling', 'storytelling', 'edit'],
    ['Strategy and War', 'strategy', 'bolt', 'Strategy'],
    ['Who Am I?', 'whoami', 'question', 'Who Am I?']
  ].map(bookSection)
];

function movieSection([label, key, icon]) {
  return categorySection({
    label,
    key: key.toLowerCase().replace(/[^a-z0-9]+/g, ''),
    icon,
    attrs: {
      'data-action': 'toggleMovieGenre',
      'data-action-args': key,
      'data-action-eventobj': 'true',
      'data-genre': key
    },
    panelPrefix: 'genre',
    panelClass: 'genre-movies'
  });
}

const movieSections = [
  section({ label: 'All Movies', tooltip: 'All Movies', countId: 'count-all-movies', icon: '🎬', attrs: { 'data-action': 'toggleMovieGenre', 'data-action-args': 'all', 'data-action-eventobj': 'true', 'data-genre': 'all', class: 'active' } }),
  ...[
    ['Action', 'Action', '💥'],
    ['Comedy', 'Comedy', '😂'],
    ['Drama', 'Drama', '🎭'],
    ['Horror', 'Horror', '👻'],
    ['Sci-Fi', 'Sci-Fi', '🚀'],
    ['Romance', 'Romance', '💕'],
    ['Thriller', 'Thriller', '😱'],
    ['Documentary', 'Documentary', '📹']
  ].map(movieSection)
];

const podcastSections = [
  section({ label: 'All Podcasts', tooltip: 'All Podcasts', countId: 'count-all-podcasts', count: '10', icon: '🎧', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'all', 'data-action-this': 'true', 'data-podcast-category': 'all', class: 'active' } }),
  section({ label: 'Business & Investing', tooltip: 'Business & Investing', countId: 'count-business', count: '3', icon: '💼', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'business', 'data-action-this': 'true', 'data-podcast-category': 'business' } }),
  section({ label: 'Science & Ideas', tooltip: 'Science & Ideas', countId: 'count-ideas', count: '2', icon: '🧠', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'ideas', 'data-action-this': 'true', 'data-podcast-category': 'ideas' } }),
  section({ label: 'Personal Development', tooltip: 'Personal Development', countId: 'count-development', count: '2', icon: '⚡', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'development', 'data-action-this': 'true', 'data-podcast-category': 'development' } }),
  section({ label: 'Must-Listen Episodes', tooltip: 'Must-Listen Episodes', countId: 'count-episodes', count: '3', icon: '★', attrs: { 'data-action': 'filterPodcasts', 'data-action-args': 'episodes', 'data-action-this': 'true', 'data-podcast-category': 'episodes' } })
];

function peopleSection([label, key, iconKey, count]) {
  return section({
    label,
    iconKey,
    countId: `count-people-${key}`,
    count,
    attrs: {
      'data-action': 'filterByCategory',
      'data-action-args': key,
      'data-action-eventobj': 'true'
    }
  });
}

const peopleSections = [
  section({ label: 'All People', iconKey: 'users', countId: 'count-people-all', count: '0', attrs: { 'data-action': 'filterByCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' } }),
  ...[
    ['Business & Investing', 'business', 'dollar', '0'],
    ['Writers & Thinkers', 'writers', 'edit', '0'],
    ['Science & Technology', 'science', 'globe', '0'],
    ['Creators & Artists', 'creators', 'star', '0']
  ].map(peopleSection)
];

function essaySection([label, key, iconKey]) {
  return categorySection({
    label,
    key,
    iconKey,
    attrs: {
      'data-action': 'toggleCategory',
      'data-action-args': key,
      'data-action-eventobj': 'true'
    },
    panelPrefix: 'category',
    panelClass: 'category-essays'
  });
}

const essaySections = [
  section({ label: 'All Essays', tooltip: 'All Essays', countId: 'count-all', iconKey: 'file', attrs: { 'data-action': 'toggleCategory', 'data-action-args': 'all', 'data-action-eventobj': 'true', class: 'active' } }),
  ...[
    ['Philosophy', 'philosophy', 'question'],
    ['Management', 'management', 'bars'],
    ['Technology', 'technology', 'monitor'],
    ['Personal', 'personal', 'user'],
    ['Finance', 'finance', 'dollar'],
    ['Writing', 'writing', 'edit']
  ].map(essaySection)
];

module.exports = {
  bookSections,
  essaySections,
  movieSections,
  peopleSections,
  podcastSections
};
