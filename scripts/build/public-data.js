const path = require('path');

function localizeBooks({ books, remoteAssetFor }) {
  return books.map((book) => {
    const isbn = String(book.isbn || '').replace(/[^0-9X]/gi, '');
    const coverUrl = isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : '';
    return {
      ...book,
      coverImage: coverUrl ? remoteAssetFor(coverUrl, 360) : book.coverImage,
      coverImageMedium: coverUrl ? remoteAssetFor(coverUrl, 240) : book.coverImageMedium
    };
  });
}

function writeLocalizedPublicData({
  distDir,
  adventures,
  projects,
  books,
  localizeRemoteStrings,
  remoteAssetFor,
  writeGenerated
}) {
  writeGenerated(path.join(distDir, 'data', 'adventures.json'), `${JSON.stringify(localizeRemoteStrings(adventures), null, 2)}\n`);
  writeGenerated(path.join(distDir, 'data', 'projects.json'), `${JSON.stringify(localizeRemoteStrings(projects), null, 2)}\n`);
  const localizedBooks = `${JSON.stringify(localizeBooks({ books, remoteAssetFor }), null, 2)}\n`;
  writeGenerated(path.join('data', 'books.generated.json'), localizedBooks);
  writeGenerated(path.join(distDir, 'data', 'books.json'), localizedBooks);
  writeGenerated(path.join(distDir, 'data', 'books.generated.json'), localizedBooks);
}

module.exports = {
  localizeBooks,
  writeLocalizedPublicData
};
