#!/usr/bin/env node
// Phase 1.1: build-time merge of people.json + books + movies + profiles
// into data/people.merged.generated.json. Port of mergeBookPeople() from
// site-astro/src/scripts/people.js — keeps the runtime free of fetch/merge.
//
// people.astro reads the merged collection and SSRs all 98 cards.
// people.js detects the populated grid and skips wipe-and-render.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DATA = resolve(ROOT, 'data');

const BOOK_PEOPLE = {
  'A Few Lessons for Investors and Managers from Warren Buffett': ['Warren Buffett'],
  'A Few Lessons from Sherlock Holmes': ['Sherlock Holmes'],
  'A Man for All Markets': ['Edward O. Thorp'],
  "All I Want to Know is Where I'm Going to Die So I'll Never Go There": ['Charlie Munger'],
  'Against the Odds': ['James Dyson'],
  'Am I Being Too Subtle?': ['Sam Zell'],
  'Atomic Habits': ['James Clear'],
  'Autobiography of a Restless Mind': ['Dee Hock'],
  'Becoming Steve Jobs': ['Steve Jobs'],
  'Benjamin Franklin': ['Benjamin Franklin'],
  'Benjamin Franklin: An American Life': ['Benjamin Franklin'],
  'Berkshire Hathaway Letters to Shareholders 1965-2023': ['Warren Buffett'],
  'Bird by Bird': ['Anne Lamott'],
  'Bloomberg by Bloomberg': ['Michael Bloomberg'],
  'Bruce Lee: Wisdom for the Way': ['Bruce Lee'],
  "Can't Hurt Me": ['David Goggins'],
  'Choices, Values, and Frames': ['Daniel Kahneman'],
  'Churchill': ['Winston Churchill'],
  'Churchill: Walking with Destiny': ['Winston Churchill'],
  'Copywriting Secrets': ['Jim Edwards'],
  'Confessions of an Advertising Man': ['David Ogilvy'],
  'Creativity, Inc.': ['Ed Catmull'],
  'Damn Right!: Behind the Scenes with Berkshire Hathaway Billionaire Charlie Munger': ['Charlie Munger'],
  'Deep Work': ['Cal Newport'],
  "Disney's Land": ['Walt Disney'],
  'Evolutionary Psychology: The New Science of the Mind': ['David M. Buss'],
  'Hackers & Painters': ['Paul Graham'],
  'Hard Drive: Bill Gates and the Making of the Microsoft Empire': ['Bill Gates'],
  'High Performance Habits': ['Brendon Burchard'],
  'How to Read a Book': ['Mortimer J. Adler'],
  'How to Take Smart Notes': ['Sönke Ahrens'],
  'How to Write a Good Advertisement': ['Victor O. Schwab'],
  'Influence': ['Robert Cialdini'],
  'Incerto': ['Nassim Nicholas Taleb'],
  'Insanely Simple': ['Ken Segall'],
  'Is This Anything?': ['Jerry Seinfeld'],
  'Judgment in Managerial Decision Making': ['Don A. Moore'],
  'Letters from John D. Rockefeller to His Son': ['John D. Rockefeller'],
  'Made to Stick': ['Chip Heath', 'Dan Heath'],
  'Mastery': ['Robert Greene'],
  'Never Enough': ['Andrew Wilkinson'],
  'Nonviolent Communication': ['Marshall B. Rosenberg'],
  'Ogilvy on Advertising': ['David Ogilvy'],
  'One From Many: VISA and the Rise of Chaordic Organization': ['Dee Hock'],
  'Only the Paranoid Survive': ['Andrew Grove'],
  "Poor Charlie's Almanack": ['Charlie Munger'],
  "Poor Richard's Almanack": ['Benjamin Franklin'],
  'Pieces of the Action': ['Vannevar Bush'],
  'Predictable Revenue': ['Aaron Ross'],
  'Principles': ['Ray Dalio'],
  'Profit First': ['Mike Michalowicz'],
  'Pushing to the Front': ['Orison Swett Marden'],
  'Quotations of David Ogilvy': ['David Ogilvy'],
  'Random Reminiscences of Men and Events': ['John D. Rockefeller'],
  'Sam Walton: Made in America': ['Sam Walton'],
  'Seeking Wisdom: From Darwin to Munger': ['Charlie Munger'],
  'Sapiens': ['Yuval Noah Harari'],
  "Screw It, Let's Do It": ['Richard Branson'],
  'Shoe Dog': ['Phil Knight'],
  'Steve Jobs': ['Steve Jobs'],
  'Steve Jobs and the NeXT Big Thing': ['Steve Jobs'],
  'Striking Thoughts': ['Bruce Lee'],
  'Summerhill: A Radical Approach to Child Rearing': ['A. S. Neill'],
  "Surely You're Joking, Mr. Feynman!": ['Richard Feynman'],
  'Tao of Charlie Munger': ['Charlie Munger'],
  'Tested Advertising Methods': ['John Caples'],
  'The Adweek Copywriting Handbook': ['Joseph Sugarman'],
  '7 Powers: The Foundations of Business Strategy': ['Hamilton Helmer'],
  'The Almanack of Naval Ravikant': ['Naval Ravikant'],
  'The Art of Thinking Clearly': ['Rolf Dobelli'],
  'The Art of Worldly Wisdom': ['Baltasar Gracián'],
  'The Autobiography of Andrew Carnegie': ['Andrew Carnegie'],
  'The Autobiography of Benjamin Franklin': ['Benjamin Franklin'],
  'The Bed of Procrustes': ['Nassim Nicholas Taleb'],
  'The Checklist Manifesto': ['Atul Gawande'],
  'The Coming Wave': ['Mustafa Suleyman'],
  'The Education of a Bodybuilder': ['Arnold Schwarzenegger'],
  'The Great Mental Models': ['Shane Parrish'],
  'The Great Mental Models Volume 1: General Thinking Concepts': ['Shane Parrish'],
  'The Habit of Labor': ['Stef Wertheimer'],
  'The Hard Thing About Hard Things': ['Ben Horowitz'],
  'The King of Madison Avenue: David Ogilvy and the Making of Modern Advertising': ['David Ogilvy'],
  'The Lessons of History': ['Will Durant'],
  'The Lean Startup': ['Eric Ries'],
  'The Mind of Napoleon': ['Napoleon Bonaparte'],
  'The Mind of Napoleon: A Selection of His Written and Spoken Words': ['Napoleon Bonaparte'],
  'The Mom Test': ['Rob Fitzpatrick'],
  'The Narrow Road': ['Felix Dennis'],
  'Napoleon: A Concise Biography': ['Napoleon Bonaparte'],
  'The Power of Now': ['Eckhart Tolle'],
  'The Remains of the Day': ['Kazuo Ishiguro'],
  'The River of Doubt': ['Theodore Roosevelt'],
  'The Road Less Stupid': ['Keith J. Cunningham'],
  'The Sales Acceleration Formula': ['Mark Roberge'],
  'The Singapore Story': ['Lee Kuan Yew'],
  'The Snowball: Warren Buffett and the Business of Life': ['Warren Buffett'],
  'The Ultimate Blueprint for an Insanely Successful Business': ['Keith J. Cunningham'],
  'The Wit and Wisdom of Lee Kuan Yew': ['Lee Kuan Yew'],
  'Thinking, Fast and Slow': ['Daniel Kahneman'],
  'Titan: The Life of John D. Rockefeller, Sr.': ['John D. Rockefeller'],
  'To Pixar and Beyond': ['Lawrence Levy', 'Steve Jobs', 'Ed Catmull'],
  'Ultralearning': ['Scott Young'],
  'Unbroken': ['Louis Zamperini'],
  'Walt Disney: The Triumph of the American Imagination': ['Walt Disney'],
  'What I Talk About When I Talk About Running': ['Haruki Murakami'],
  'What It Takes': ['Stephen A. Schwarzman'],
  'What We Owe the Future': ['William MacAskill'],
  'Who: The A Method for Hiring': ['Geoff Smart', 'Randy Street'],
  'Who Moved My Cheese?': ['Spencer Johnson'],
  'Zero to One': ['Peter Thiel']
};

const MOVIE_PEOPLE = {
  'Before Sunrise': [
    {
      name: 'Jesse Wallace',
      title: 'Fictional Writer, Before Sunrise',
      lesson: 'Stay awake to the rare conversation in front of you',
      category: 'writers',
      bio: 'Jesse Wallace is a fictional traveler and writer from the Before trilogy, useful as a study in romantic attention, restlessness, and the stories people tell to make sense of their lives.'
    },
    {
      name: 'Céline',
      title: 'Fictional Character, Before Sunrise',
      lesson: 'Meet life with candor and curiosity',
      category: 'creators',
      bio: 'Céline is a fictional character from the Before trilogy whose conversations with Jesse turn ordinary time into a serious inquiry into love, choice, memory, and identity.'
    }
  ],
  'Before Sunset': ['Jesse Wallace', 'Céline'],
  "Breakfast at Tiffany's": [
    {
      name: 'Holly Golightly',
      title: "Fictional Character, Breakfast at Tiffany's",
      lesson: 'Charm cannot outrun self-knowledge forever',
      category: 'creators',
      bio: 'Holly Golightly is a fictional New York socialite whose style, evasions, and vulnerability make her a useful character study in reinvention, loneliness, and performance.'
    }
  ],
  'The Place Beyond the Pines': [
    {
      name: 'Luke Glanton',
      title: 'Fictional Character, The Place Beyond the Pines',
      lesson: 'Short-term escape can become inherited consequence',
      category: 'creators',
      bio: 'Luke Glanton is a fictional motorcycle rider whose choices turn personal desperation into a longer chain of family, moral, and generational consequences.'
    }
  ],
  'What Dreams May Come': [
    {
      name: 'Chris Nielsen',
      title: 'Fictional Character, What Dreams May Come',
      lesson: 'Love chooses presence when comfort would leave',
      category: 'creators',
      bio: "Chris Nielsen is a fictional character whose story frames devotion as an active willingness to enter another person's pain rather than merely admire them from safety."
    }
  ],
  'Lawrence of Arabia': [
    {
      name: 'T. E. Lawrence',
      title: 'Officer, Writer',
      lesson: 'Mythmaking can outrun the person beneath it',
      category: 'business',
      sourceType: 'nonfiction',
      bio: 'T. E. Lawrence was a British officer and writer whose World War I role in the Arab Revolt made him both a historical actor and a case study in charisma, identity, strategy, and myth.'
    }
  ]
};

const GENERATED_PERSON_META = {
  'Andrew Wilkinson': { category: 'business', lesson: 'Build patiently, own what lasts', title: 'Entrepreneur, Investor' },
  'Anne Lamott': { category: 'writers', lesson: 'Write one honest sentence at a time', title: 'Writer' },
  'Atul Gawande': { category: 'science', lesson: 'Complex work needs simple checks', title: 'Surgeon, Writer' },
  'Baltasar Gracián': { category: 'writers', lesson: 'Wisdom is precision under pressure', title: 'Philosopher, Writer' },
  'Cal Newport': { category: 'writers', lesson: 'Protect the depth that compounds', title: 'Writer, Computer Scientist' },
  'Charlie Munger': { category: 'business', lesson: 'Collect models, avoid stupidity', title: 'Investor, Berkshire Hathaway' },
  'David Goggins': { category: 'athletes', lesson: 'Expand the standard you answer to', title: 'Endurance Athlete, Author' },
  'David Ogilvy': { category: 'creators', lesson: 'Sell with research and clarity', title: 'Advertising Executive' },
  'Eckhart Tolle': { category: 'writers', lesson: 'Return attention to the present', title: 'Spiritual Teacher' },
  'Eric Ries': { category: 'business', lesson: 'Validate before you scale', title: 'Entrepreneur, Author' },
  'John D. Rockefeller': { category: 'business', lesson: 'Systemize the machine, then improve it', title: 'Founder, Standard Oil' },
  'Keith J. Cunningham': { category: 'business', lesson: 'Think clearly before acting quickly', title: 'Entrepreneur, Business Teacher' },
  'Peter Thiel': { category: 'business', lesson: 'Compete by escaping competition', title: 'Entrepreneur, Investor' },
  'Rob Fitzpatrick': { category: 'business', lesson: 'Ask questions reality can answer', title: 'Entrepreneur, Author' },
  'Robert Cialdini': { category: 'science', lesson: 'Influence follows predictable triggers', title: 'Psychologist, Author' },
  'Shane Parrish': { category: 'writers', lesson: 'Make better decisions with better models', title: 'Writer, Mental Models Teacher' },
  'Sherlock Holmes': { category: 'creators', lesson: 'Observe before you infer', sourceType: 'fiction', title: 'Fictional Detective' },
  'Victor O. Schwab': { category: 'creators', lesson: "Lead with the reader's desire", title: 'Copywriter' }
};

const PERSON_BIOS = {
  'Andrew Wilkinson': 'Andrew Wilkinson is the co-founder of Tiny, a holding company built around buying, operating, and compounding simple internet businesses.',
  'Anne Lamott': 'Anne Lamott is an American novelist and writing teacher whose work is known for its honesty, humor, faith, and practical creative guidance.',
  'Andrew Huberman': 'Andrew Huberman is a Stanford neuroscientist and educator known for making neuroscience, physiology, and behavioral tools useful to a broad audience.',
  'Atul Gawande': 'Atul Gawande is a surgeon, writer, and public health thinker who studies how professionals make complex systems safer and more reliable.',
  'Baltasar Gracián': 'Baltasar Gracián was a Spanish Jesuit philosopher and writer whose aphorisms compress practical wisdom about judgment, reputation, and power.',
  'Cal Newport': 'Cal Newport is a computer science professor and author focused on deep work, attention, skill-building, and the discipline required for meaningful output.',
  'Charlie Munger': "Charlie Munger was Warren Buffett's longtime partner at Berkshire Hathaway and a relentless advocate for multidisciplinary thinking, incentives, and avoiding obvious stupidity.",
  'Christopher Nolan': 'Christopher Nolan is a filmmaker known for large-scale, structurally ambitious movies built around time, memory, obsession, and moral pressure.',
  'David Goggins': 'David Goggins is an endurance athlete and former Navy SEAL known for his extreme mental toughness and self-discipline philosophy.',
  'David Ogilvy': 'David Ogilvy was a legendary advertising executive who helped define modern direct-response and brand advertising through research, clarity, and craft.',
  'Eckhart Tolle': 'Eckhart Tolle is a spiritual teacher and author whose work centers on presence, attention, and loosening identification with thought.',
  'Elon Musk': 'Elon Musk is an entrepreneur and engineer associated with Tesla, SpaceX, and other companies pushing aggressive technology and manufacturing frontiers.',
  'Eric Ries': 'Eric Ries is an entrepreneur and author best known for the Lean Startup method: rapid experimentation, validated learning, and disciplined product iteration.',
  'James Clear': 'James Clear is an author and habits thinker whose work turns behavior change into simple, repeatable systems.',
  'John D. Rockefeller': "John D. Rockefeller built Standard Oil into one of history's most powerful companies and became a defining figure in American business, monopoly, and philanthropy.",
  'Keith J. Cunningham': 'Keith J. Cunningham is an entrepreneur and business teacher focused on judgment, financial discipline, and asking better questions before acting.',
  'Lex Fridman': 'Lex Fridman is an AI researcher and long-form interviewer known for conversations about technology, science, philosophy, and human nature.',
  'Morgan Housel': 'Morgan Housel is a writer and investor known for explaining money, risk, behavior, and long-term decision-making through clear stories.',
  'Naval Ravikant': 'Naval Ravikant is an entrepreneur, investor, and thinker known for compact ideas about leverage, judgment, wealth, happiness, and independence.',
  'Peter Thiel': 'Peter Thiel is an entrepreneur and investor known for PayPal, Palantir, Founders Fund, and contrarian ideas about monopoly and startups.',
  'Ray Dalio': 'Ray Dalio founded Bridgewater Associates and is known for principles-based management, macro investing, and systematic decision-making.',
  'Richard Feynman': 'Richard Feynman was a Nobel Prize-winning physicist celebrated for curiosity, clear explanation, playful problem-solving, and scientific honesty.',
  'Rick Rubin': 'Rick Rubin is a music producer known for stripping work down to its essence and helping artists find what feels true.',
  'Rob Fitzpatrick': 'Rob Fitzpatrick is an entrepreneur and author who teaches practical customer discovery and how to ask questions that reveal reality.',
  'Robert Cialdini': 'Robert Cialdini is a psychologist whose research on persuasion and social influence shaped how people understand compliance, trust, and decision triggers.',
  'Ryan Holiday': 'Ryan Holiday is a writer and media strategist who popularized modern Stoicism through books about discipline, resilience, ego, and action.',
  'Shane Parrish': 'Shane Parrish is the founder of Farnam Street and a writer focused on mental models, decision-making, and practical wisdom.',
  "Sherlock Holmes": "Sherlock Holmes is Arthur Conan Doyle's fictional detective and a durable symbol of observation, inference, and disciplined attention.",
  'Victor O. Schwab': 'Victor O. Schwab was a direct-response copywriter whose advertising work emphasized reader desire, specific promises, and clear selling.',
  'Warren Buffett': 'Warren Buffett is the chairman of Berkshire Hathaway and one of the most influential investors in history, known for patience, temperament, and business quality.'
};

function normalizePersonName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generatedImageForPerson(name) {
  const slug = normalizePersonName(name);
  return {
    image: `images/generated/people/${slug}-400.jpg`,
    srcset: [
      `images/generated/people/${slug}-200.jpg 200w`,
      `images/generated/people/${slug}-400.jpg 400w`,
      `images/generated/people/${slug}-800.jpg 800w`
    ].join(', ')
  };
}

function bookLabel(book) {
  const year = book.year || book.published || book.readYear;
  return year ? `${book.title} (${year})` : book.title;
}

function attachBook(person, book) {
  if (!person.books) person.books = [];
  const label = bookLabel(book);
  if (!person.books.some((entry) => entry.title === book.title)) {
    person.books.push({
      author: book.author || '',
      coverImage: book.coverImageMedium || book.coverImage || '',
      href: `books.html?book=${encodeURIComponent(book.title)}`,
      label,
      title: book.title
    });
  }
}

function movieLabel(movie) {
  return movie.year ? `${movie.title} (${movie.year})` : movie.title;
}

function attachMovie(person, movie) {
  if (!person.movies) person.movies = [];
  if (!person.movies.some((entry) => entry.title === movie.title)) {
    person.movies.push({
      coverImage: movie.poster || '',
      href: `movies.html?movie=${encodeURIComponent(movie.title)}`,
      label: movieLabel(movie),
      title: movie.title,
      year: movie.year || ''
    });
  }
}

function normalizeSubject(subject) {
  return typeof subject === 'string' ? { name: subject } : subject;
}

function profileForName(profiles, name) {
  const id = normalizePersonName(name);
  return profiles.find((profile) => profile.id === id || profile.name === name) || null;
}

function sourceTypeFor(person) {
  return person.sourceType || (person.title?.toLowerCase().includes('fictional') ? 'fiction' : 'nonfiction');
}

function mergeBookPeople(people, books, movies, profiles) {
  const byName = new Map();
  people.forEach((person) => {
    const profile = profileForName(profiles, person.name);
    byName.set(person.name, {
      ...person,
      bio: profile?.bio || PERSON_BIOS[person.name] || person.lesson || '',
      movies: [],
      profileHref: profile ? `people/${profile.id}.html` : '',
      sourceType: sourceTypeFor(person),
      thesis: profile?.thesis || person.lesson || '',
      books: []
    });
  });

  books.forEach((book) => {
    const subjects = BOOK_PEOPLE[book.title];
    if (!subjects) return;
    subjects.forEach((name) => {
      const existing = byName.get(name);
      const meta = GENERATED_PERSON_META[name] || {};
      const profile = profileForName(profiles, name);
      const imageMeta = generatedImageForPerson(name);
      const person = existing || {
        bio: profile?.bio || meta.bio || PERSON_BIOS[name] || '',
        category: meta.category || 'writers',
        image: imageMeta.image,
        lesson: meta.lesson || 'Learn from the life behind the work',
        name,
        movies: [],
        profileHref: profile ? `people/${profile.id}.html` : '',
        srcset: imageMeta.srcset,
        sourceType: meta.sourceType || 'nonfiction',
        thesis: profile?.thesis || meta.lesson || '',
        title: meta.title || 'Subject'
      };
      byName.set(name, {
        ...person,
        ...meta,
        bio: person.bio || profile?.bio || meta.bio || PERSON_BIOS[name] || '',
        image: person.image || imageMeta.image,
        movies: person.movies || [],
        profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
        srcset: person.srcset || imageMeta.srcset,
        sourceType: person.sourceType || meta.sourceType || 'nonfiction',
        thesis: person.thesis || profile?.thesis || meta.lesson || ''
      });
      attachBook(byName.get(name), book);
    });
  });

  movies.forEach((movie) => {
    const subjects = MOVIE_PEOPLE[movie.title];
    if (!subjects) return;
    subjects.map(normalizeSubject).forEach((subject) => {
      const name = subject.name;
      if (!name) return;
      const existing = byName.get(name);
      const profile = profileForName(profiles, name);
      const meta = GENERATED_PERSON_META[name] || {};
      const imageMeta = generatedImageForPerson(name);
      const sourceType = subject.sourceType || meta.sourceType || 'fiction';
      const person = existing || {
        bio: profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
        category: subject.category || meta.category || 'creators',
        image: subject.image || movie.poster || imageMeta.image,
        lesson: subject.lesson || meta.lesson || 'Study the character under pressure',
        name,
        profileHref: profile ? `people/${profile.id}.html` : '',
        sourceType,
        srcset: subject.srcset || '',
        thesis: profile?.thesis || subject.lesson || meta.lesson || '',
        title: subject.title || meta.title || 'Fictional Character'
      };
      byName.set(name, {
        ...person,
        ...subject,
        bio: person.bio || profile?.bio || subject.bio || meta.bio || PERSON_BIOS[name] || '',
        books: person.books || [],
        category: person.category || subject.category || meta.category || 'creators',
        image: person.image || subject.image || movie.poster || imageMeta.image,
        movies: person.movies || [],
        profileHref: person.profileHref || (profile ? `people/${profile.id}.html` : ''),
        sourceType: person.sourceType || sourceType,
        srcset: person.srcset || subject.srcset || '',
        thesis: person.thesis || profile?.thesis || subject.lesson || meta.lesson || ''
      });
      attachMovie(byName.get(name), movie);
    });
  });

  return Array.from(byName.values())
    .map((person) => ({
      ...person,
      bio: person.bio || PERSON_BIOS[person.name] || person.lesson || '',
      books: person.books || [],
      movies: person.movies || [],
      sourceType: sourceTypeFor(person),
      searchText: [
        person.name,
        person.title,
        person.lesson,
        sourceTypeFor(person) === 'fiction' ? 'fiction fictional character' : 'non-fiction nonfiction real historical',
        ...(person.books || []).map((book) => book.label),
        ...(person.movies || []).map((movie) => movie.label)
      ].join(' ')
    }))
    .sort((a, b) =>
      (b.books.length + b.movies.length) - (a.books.length + a.movies.length) ||
      a.name.localeCompare(b.name)
    );
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(DATA, path), 'utf8'));
}

function main() {
  const peopleRaw = readJson('people.json');
  const booksGenerated = readJson('books.generated.json');
  const movies = readJson('movies.json');
  const profilesRaw = readJson('people.profiles.json');

  const people = Array.isArray(peopleRaw.people) ? peopleRaw.people : [];
  const books = Array.isArray(booksGenerated) ? booksGenerated : (booksGenerated.books || []);
  const movieList = Array.isArray(movies) ? movies : (movies.movies || []);
  const profiles = Array.isArray(profilesRaw.profiles) ? profilesRaw.profiles : [];

  const merged = mergeBookPeople(people, books, movieList, profiles);
  const out = { people: merged };
  const outPath = resolve(DATA, 'people.merged.generated.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`merge-people: wrote ${merged.length} merged records to ${outPath}`);
}

main();
