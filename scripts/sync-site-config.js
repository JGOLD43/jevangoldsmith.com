const fs = require('fs');
const path = require('path');

const site = JSON.parse(fs.readFileSync(path.join('data', 'site.json'), 'utf8'));
const htmlFiles = fs.readdirSync('.').filter((file) => file.endsWith('.html'));

const replacements = new Map([
  ['https://youtube.com/@YourChannel', site.social.youtube],
  ['https://youtube.com/@JevanGoldsmith', site.social.youtube],
  ['https://instagram.com/YourHandle', site.social.instagram],
  ['https://instagram.com/jevangoldsmith', site.social.instagram],
  ['https://linkedin.com/in/YourProfile', site.social.linkedin],
  ['https://linkedin.com/in/jevangoldsmith', site.social.linkedin],
  ['https://linkedin.com/in/jevan-goldsmith-7b885a185', site.social.linkedin],
  ['mailto:newsletter@example.com', `mailto:${site.email}?subject=Newsletter`],
  ['mailto:hello@jevangoldsmith.com?subject=Newsletter', `mailto:${site.email}?subject=Newsletter`],
  ['images/favicon.png', site.assets.favicon]
]);

let changed = 0;

for (const file of htmlFiles) {
  let source = fs.readFileSync(file, 'utf8');
  const original = source;

  for (const [from, to] of replacements) {
    source = source.split(from).join(to);
  }

  if (source !== original) {
    fs.writeFileSync(file, source);
    changed += 1;
  }
}

console.log(`Synced site config across ${changed} file(s).`);
