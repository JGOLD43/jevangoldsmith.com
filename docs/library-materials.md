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

Additional resources selected directly by Jevan live in
`data/library-additions.json`, so refreshing the original import cannot remove
them. Entries may supply an author and their own attribution; otherwise the
original collection credit is used. The first addition is Jonny Miller's
*How to Unclench*, linked as a 32-minute article with audio available at its source.

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

## Problem collections

`data/library-collections.json` contains an individually authored classification
for each of the 234 saved materials, reviewed on 23 September 2026. Twenty
problem-oriented collections are grouped into Life, People, Making & learning,
Work & money, and A wider world. Each item belongs to one to three collections,
with a specific explanation, a role (guide, perspective, case study, cautionary
story, creative example or reference), and the source used for classification.
Each collection has three deliberately chosen starting points; these are not
personal ratings or a claim that Jevan has completed the works.

The review used accessible article/PDF text and excerpts, uploader descriptions,
and film or publisher synopses. It did not watch every film or unlock paid
material. Sparse descriptions and inaccessible works have explicitly provisional
placements; paid workbooks/artbooks are classified from their public introductions.
The public “Why this is here” dialog discloses the classification basis and links
to it. Contrasting and cautionary examples are not presented as advice to imitate.
The two versions of Falkovich's 100 tips remain separate source entries.

Sort → By collection opens with hover, click or keyboard; touch opens the same
picker. Selecting a collection filters across the archive (switching from Books
to All material when necessary). Material type and search narrow that selection
further. Three starting points lead the default collection order, followed by
the remaining titles alphabetically. A–Z and tiers can still reorder a filtered
collection. “Group by original topic” retains the imported topic ordering.
`libraryCollection` joins the existing URL state, including selected item, search,
format and sort, so reloads and shared links reproduce the shelf.

`data/library-material-corrections.json` overlays reviewed corrections without
changing original imported IDs or losing them on refresh. It repairs duplicated
URLs for Rams and Miyazaki, corrects two film titles, identifies the linked Thiel
PDF as an article, and removes the source's tongue-in-cheek documentary label
from the fictional film *Thank You for Smoking*. Existing deep links still work.

When adding or refreshing materials, author a classification and source basis for
every new ID. The unit checks reject missing/orphan classifications, invalid
collection membership, duplicate generic explanations, invalid starting points,
and corrections that replace identities. Review uncertain placements again when
more of their source becomes available; do not silently imply completed viewing.

## Collection guides

Resources (`/free-resources.html#collection-guides`) contains one suggested route
for each of the 20 problem collections. Static pages at `/guides/<collection>.html`
connect five reviewed sources in an authored sequence, with an introduction,
placement rationale, specific practice prompts, and a closing application.

`data/library-guides.json` stores the prose and stable material IDs. The server-only
`site-astro/src/lib/library-guides.ts` resolves the same source corrections and
attributions as the shelf. Guide source links open separately, while “Find on the
shelf” preserves the collection and selected material. An item's context dialog
links to the active collection's guide (or its first collection when unfiltered).

These are editorial reading/viewing suggestions, not claims of completed reading
or personal ratings. The note remains visible on the index and every guide. No
provisional placements are used as guide stops. Series are introduced as material
to approach over multiple sittings; no invented total completion time is shown.
The complete collection remains available after the five-stop path.

When updating a collection, review its guide alongside its three shelf starters.
A guide may order sources differently when its written progression explains the
choice. Unit checks require a unique guide per collection, five distinct valid
members, non-provisional classifications and individually authored prompts.
