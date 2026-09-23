# Library material archive

The material dropdown in `BookLibrary.astro` extends the existing book library with
articles, art, videos, interviews, documentaries, memos, and other material.
`data/learning-archive.json` contains the 233 material links listed in The
Unintuitive's archive as updated on 22 September 2026. Import metadata credits
that collection; individual items retain their exact destination URL, source
section, subject, medium, and duration when supplied.

This is a collection saved to explore, not a record of completed reading or
viewing or personal recommendations. Imported material has no personal ratings
and does not count toward books read. The public shelf explicitly notes that
Jevan has not read or watched everything in it.

## Refreshing the source

Save the public article HTML, then run:

```sh
python3 scripts/import-learning-archive.py /path/to/source.html
```

Review the data diff and update the completeness assertions in
`tests/unit/learning-archive.test.js` if the source gained or removed items.
The importer ignores navigation, updates repeated above the archive, article
prose, and comments. It rejects duplicate destinations and incomplete imports.
It does not crawl or reproduce linked articles, videos, or artwork. Destination
availability and paid access remain controlled by their publishers; some links
retained from the source are affiliate links.

The shelf's paper, frame, video case, tape, folder, and film-tin covers are original
CSS/typographic illustrations, not official covers or reproductions of artwork.
Search and selected type/item are reflected in the page URL, so a shelf can be
bookmarked or shared. The native app's highlight-count bridge receives books
only. No native app update is needed for this public website change.
