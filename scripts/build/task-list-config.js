const scriptTags = (files) => files.map((file) => `<script src="${file}"></script>`).join('');
const taskListScriptFiles = {
  projects: ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/projects.js', 'js/theme.js', 'js/analytics.js'],
  challenges: ['js/grid-zoom.js', 'js/collection-ui.js', 'js/collection-runtime.js', 'js/action-dispatcher.js', 'js/task-list.js', 'js/challenges.js', 'js/theme.js', 'js/analytics.js']
};
const taskListScripts = (file) => scriptTags(taskListScriptFiles[file]);

const TASK_LIST_CONFIG = {
  projects: {
    titleSuffix: 'Projects',
    description: 'Projects Jevan Goldsmith is building, exploring, and planning.',
    scripts: taskListScripts('projects'),
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
    scripts: taskListScripts('challenges'),
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
      {
        href: 'free-resources.html',
        label: 'Resources',
        attrs: {
          'data-analytics': 'cta',
          'data-cta-id': 'free-resources',
          'data-cta-location': 'challenges'
        }
      },
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

function taskListConfigFor(view) {
  return TASK_LIST_CONFIG[view] || null;
}

module.exports = { taskListConfigFor };
