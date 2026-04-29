const fs = require('fs');
const path = require('path');

const FRONTMATTER_SCHEMA = {
  title: 'string',
  description: 'string',
  layout: 'string',
  engine: 'string',
  bodyClass: 'string',
  bodyAttributes: 'string',
  scripts: 'string',
  section: 'string',
  includeNav: 'boolean-string',
  includeFooter: 'boolean-string',
  fontWeights: 'string',
  extraHead: 'string'
};

function createSourcePageHelpers({
  root,
  site,
  sourcePagesDir,
  renderNav,
  renderFooter,
  escapeHtmlAttr
}) {
  function titleFromHtml(html, file) {
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    if (title) return decodeHtmlEntities(title).replace(/\s*[-|]\s*Jevan Goldsmith.*$/i, '').trim();
    return file.replace(/\.html$/, '').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function descriptionFromHtml(html, title) {
    const description = html.match(/<meta\s+name=(["'])description\1\s+content=(["'])(.*?)\2/i)?.[3] || '';
    return description ? decodeHtmlEntities(description) : `${title} on ${site.siteName}.`;
  }

  function sourcePagePath(file) {
    return path.join(sourcePagesDir, file);
  }

  function hasSourcePage(file) {
    return fs.existsSync(sourcePagePath(file));
  }

  function parseSourcePage(file) {
    const source = fs.readFileSync(sourcePagePath(file), 'utf8');
    const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) {
      return {
        data: {
          title: titleFromHtml(source, file),
          layout: 'base'
        },
        content: source.trim()
      };
    }

    return {
      data: parseFrontMatter(match[1], file),
      content: match[2].trim()
    };
  }

  function parseFrontMatter(source, file) {
    const data = {};
    for (const line of source.split('\n')) {
      if (!line.trim()) continue;
      const separator = line.indexOf(':');
      if (separator < 0) {
        console.error(`${sourcePagePath(file)} has invalid front matter line: ${line}`);
        process.exitCode = 1;
        continue;
      }
      const key = line.slice(0, separator).trim();
      if (!Object.prototype.hasOwnProperty.call(FRONTMATTER_SCHEMA, key)) {
        console.error(`${sourcePagePath(file)} has unknown front matter key: ${key}`);
        process.exitCode = 1;
      }
      let value = line.slice(separator + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        try {
          value = JSON.parse(value);
        } catch (error) {
          console.error(`${sourcePagePath(file)} has invalid quoted value for ${key}: ${error.message}`);
          process.exitCode = 1;
          continue;
        }
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
    return validateFrontMatter(data, file);
  }

  function validateFrontMatter(data, file) {
    const validated = {
      layout: 'base',
      ...data
    };

    for (const [key, expectedType] of Object.entries(FRONTMATTER_SCHEMA)) {
      const value = validated[key];
      if (value == null) continue;

      if (expectedType === 'string' && typeof value !== 'string') {
        console.error(`${sourcePagePath(file)} front matter ${key} must be a string.`);
        process.exitCode = 1;
      }

      if (expectedType === 'boolean-string' && value !== 'true' && value !== 'false') {
        console.error(`${sourcePagePath(file)} front matter ${key} must be "true" or "false".`);
        process.exitCode = 1;
      }
    }

    return validated;
  }

  function renderSourcePage(file) {
    const { data, content } = parseSourcePage(file);
    const layoutName = data.layout || 'base';
    const layoutPath = path.join(root, '_src', 'layouts', `${layoutName}.html`);
    if (!fs.existsSync(layoutPath)) {
      console.error(`${file} references missing layout: ${layoutName}`);
      process.exitCode = 1;
      return content;
    }

    const bodyAttributes = data.bodyAttributes
      ? data.bodyAttributes
      : (data.bodyClass ? `class="${escapeHtmlAttr(data.bodyClass)}"` : '');
    const tokens = {
      title: data.title || titleFromHtml(content, file),
      metaDescription: data.description ? `<meta name="description" content="${escapeHtmlAttr(data.description)}">` : '',
      fontWeights: data.fontWeights || '300;400;600;700',
      bodyAttributes,
      nav: data.includeNav === 'false' ? '' : renderNav(file),
      footer: data.includeFooter === 'false' ? '' : renderFooter(file),
      content,
      scripts: data.scripts || '<script src="js/theme.js"></script>',
      extraHead: data.extraHead || ''
    };

    let html = fs.readFileSync(layoutPath, 'utf8');
    for (const [key, value] of Object.entries(tokens)) {
      html = html.split(`{{ ${key} }}`).join(value);
    }
    const unreplacedToken = html.match(/{{\s*[\w.-]+\s*}}/);
    if (unreplacedToken) {
      console.error(`${sourcePagePath(file)} left unreplaced layout token ${unreplacedToken[0]}.`);
      process.exitCode = 1;
    }
    return `${html.trim()}\n`;
  }

  return {
    descriptionFromHtml,
    hasSourcePage,
    parseFrontMatter,
    parseSourcePage,
    renderSourcePage,
    sourcePagePath,
    titleFromHtml
  };
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

module.exports = {
  createSourcePageHelpers
};
