const fs = require('fs');
const path = require('path');

function discoverPages({ root, adventures, skills, topics, seo }) {
  const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
  const sourcePagesDir = path.join(root, '_src', 'pages');
  const sourcePageFiles = fs.existsSync(sourcePagesDir)
    ? fs.readdirSync(sourcePagesDir).filter((file) => file.endsWith('.html')).sort()
    : [];
  const adventurePageFiles = (adventures.adventures || [])
    .filter((adventure) => adventure.status !== 'draft')
    .map((adventure) => `adventure-${adventure.id}.html`);
  const skillPageFiles = (skills.skills || [])
    .filter((skill) => skill.status !== 'draft')
    .map((skill) => `skill-${skill.id}.html`);
  const topicPageFiles = (topics.topics || [])
    .filter((topic) => seo.topicPages?.[topic.id])
    .map((topic) => `topics/${topic.id}.html`);
  const publicHtmlFiles = Array.from(new Set([
    ...htmlFiles.filter((file) => !file.startsWith('admin/')),
    ...sourcePageFiles,
    ...adventurePageFiles,
    ...skillPageFiles,
    ...topicPageFiles
  ])).sort();

  return {
    adventurePageFiles,
    htmlFiles,
    publicHtmlFiles,
    skillPageFiles,
    sourcePageFiles,
    sourcePagesDir,
    topicPageFiles
  };
}

module.exports = {
  discoverPages
};
