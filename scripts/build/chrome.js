function createChromeRenderer({
  fs,
  path,
  root,
  decorateTrackedLinks,
  escapeRegExp,
  sectionFor
}) {
  const navPath = path.join(root, '_src', 'partials', 'nav.html');
  const footerPath = path.join(root, '_src', 'partials', 'footer.html');

  function renderFooter(file) {
    if (!fs.existsSync(footerPath)) return '';
    return decorateTrackedLinks(file, fs.readFileSync(footerPath, 'utf8').trim());
  }

  function renderNav(file) {
    const nav = fs.readFileSync(navPath, 'utf8');
    const cleared = nav
      .replace(/\sclass="active"/g, '')
      .replace(/\sclass="dropdown-trigger active"/g, ' class="dropdown-trigger"');

    const section = sectionFor(file);
    const activeHref = file.startsWith('adventure-') ? 'adventures.html' : file;
    const navLinksStart = cleared.indexOf('<ul class="nav-links">');
    let next = cleared;
    if (navLinksStart >= 0) {
      const beforeLinks = cleared.slice(0, navLinksStart);
      const navLinks = cleared.slice(navLinksStart).replace(
        new RegExp(`<a href="${escapeRegExp(activeHref)}">`),
        `<a href="${activeHref}" class="active">`
      );
      next = beforeLinks + navLinks;
    }

    const triggerBySection = { explore: 'Explore', taste: 'Taste', experience: 'Experience' };
    if (triggerBySection[section]) {
      next = next.replace(
        `class="dropdown-trigger">${triggerBySection[section]}</a>`,
        `class="dropdown-trigger active">${triggerBySection[section]}</a>`
      );
    }
    return next.trim();
  }

  function replaceUnclosedNav(html, nav) {
    const navStart = html.search(/<nav class=["']navbar["']>/);
    if (navStart < 0) return html;
    const contentStart = [
      '\n    <header',
      '\n    <main',
      '\n    <section',
      '\n    <div class="page',
      '\n    <div class="hero',
      '\n        <div class="projects-grid"'
    ]
      .map((marker) => html.indexOf(marker, navStart))
      .filter((index) => index > navStart)
      .sort((a, b) => a - b)[0];
    return contentStart ? `${html.slice(0, navStart)}${nav.trim()}\n\n${html.slice(contentStart).trimStart()}` : html;
  }

  function replaceSharedChrome(file, html) {
    if (file === 'meet.html' || !fs.existsSync(navPath) || !fs.existsSync(footerPath)) return html;
    let next = html;
    if (/<nav class=["']navbar["']>/.test(next)) {
      next = /<nav class=["']navbar["']>[\s\S]*?<\/nav>/.test(next)
        ? next.replace(/<nav class=["']navbar["']>[\s\S]*?<\/nav>/, renderNav(file))
        : replaceUnclosedNav(next, renderNav(file));
    }
    if (/<footer class=["']footer["']>/.test(next)) {
      next = next.replace(/<footer class=["']footer["']>[\s\S]*?<\/footer>/, fs.readFileSync(footerPath, 'utf8').trim());
    }
    return next;
  }

  function checkChromeDrift() {
    if (fs.existsSync(navPath) && fs.existsSync(footerPath)) return;
    console.error('Shared chrome partials are missing. Run npm run build.');
    process.exitCode = 1;
  }

  return { checkChromeDrift, renderFooter, renderNav, replaceSharedChrome };
}

module.exports = { createChromeRenderer };
