const path = require('path');
const { readText, distRoot, createReporter } = require('./check/harness');

const reporter = createReporter('check-interactions');
const dist = distRoot();
const jsSources = [
  'js/action-dispatcher.js',
  'js/adventures-ui.js',
  'js/dateme.js',
  'js/essays-view.js',
  'js/task-list.js'
].map((file) => readText(file, '')).join('\n');

const contracts = {
  'books.html': [
    'data-action="toggle-sidebar"',
    'data-action="clear-search"',
    'data-action="set-view-mode"',
    'data-action="close-book-modal"',
    'js/books'
  ],
  'movies.html': [
    'data-action="toggleSidebar"',
    'data-action="searchMovies"',
    'data-action="clearAllFilters"',
    'data-action="closeMovieModal"',
    'js/letterboxd'
  ],
  'essays.html': [
    'data-action="toggleEssaysSidebar"',
    'data-action="searchEssays"',
    'data-action="prevEssay"',
    'data-action="nextEssay"',
    'js/essays'
  ],
  'people.html': [
    'data-action="togglePeopleSidebar"',
    'data-action="filterPeople"',
    'data-action="filterByCategory"',
    'js/people'
  ],
  'podcasts.html': [
    'data-action="togglePodcastSidebar"',
    'data-action="searchPodcasts"',
    'data-action="filterPodcasts"',
    'js/podcasts'
  ],
  'projects.html': [
    'data-action="toggleProjectSidebar"',
    'data-action="searchProjects"',
    'data-action="filterProjects"',
    'js/task-list',
    'js/projects'
  ],
  'challenges.html': [
    'data-action="toggleChallengeSidebar"',
    'data-action="searchChallenges"',
    'data-action="filterChallenges"',
    'js/task-list',
    'js/challenges'
  ],
  'adventures.html': [
    'data-action="switchMobileView"',
    'data-action="toggleFilter"',
    'data-action="open-adventure-lightbox"',
    'js/adventures'
  ],
  'dateme.html': [
    'data-action="startStage1"',
    'data-action="submitForm"',
    'js/dateme'
  ]
};

for (const [page, required] of Object.entries(contracts)) {
  const html = readText(path.join(dist, page), '');
  if (!html) {
    reporter.fail(`${page} is missing from dist.`);
    continue;
  }

  for (const marker of required) {
    if (!html.includes(marker) && !jsSources.includes(marker)) {
      reporter.fail(`${page} is missing interaction marker ${marker}.`);
    }
  }
}

const dispatcher = readText('js/action-dispatcher.js');
if (!dispatcher.includes('window.JGActions')) reporter.fail('action dispatcher no longer exposes JGActions.');
if (!dispatcher.includes('registry[name] || window[name]')) reporter.fail('action dispatcher lost backward-compatible action resolution.');

reporter.ok(`Interaction contracts OK (${Object.keys(contracts).length} pages).`);
