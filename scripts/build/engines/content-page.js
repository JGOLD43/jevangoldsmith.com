function createContentPageEngine({ fs, hasSourcePage, renderSourcePage }) {
  return {
    render({ file }) {
      if (hasSourcePage(file)) return renderSourcePage(file);
      return fs.readFileSync(file, 'utf8');
    }
  };
}

module.exports = {
  createContentPageEngine
};
