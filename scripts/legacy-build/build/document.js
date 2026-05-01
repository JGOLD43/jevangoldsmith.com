const { escapeHTML, escapeHtmlAttr } = require('./html-utils');

function renderDocumentHead({ title, description = '', baseHref = '', extraHead = '' }) {
  return `    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(title)}</title>
    ${baseHref ? `<base href="${escapeHtmlAttr(baseHref)}">` : ''}
    <link rel="stylesheet" href="css/style.css">
    <link rel="icon" type="image/svg+xml" href="images/favicon.svg">
    ${description ? `<meta name="description" content="${escapeHtmlAttr(description)}">` : ''}
    ${extraHead}`.trimEnd();
}

function renderDocument({
  title,
  description = '',
  nav = '',
  main = '',
  footer = '',
  scripts = '<script src="js/theme.js"></script>',
  baseHref = '',
  bodyAttributes = '',
  extraHead = ''
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${renderDocumentHead({ title, description, baseHref, extraHead })}
</head>
<body${bodyAttributes ? ` ${bodyAttributes}` : ''}>
    ${nav}

    ${main}

    ${footer}
    ${scripts}
</body>
</html>
`;
}

module.exports = {
  renderDocument,
  renderDocumentHead
};
