export interface ArticleArtwork {
  source: string;
  paper: string;
  ink: string;
  accent: string;
  layout: 'essay' | 'press' | 'journal' | 'notebook' | 'technical' | 'studio';
  font: 'serif' | 'sans' | 'mono';
}

type Profile = [string, ArticleArtwork['layout'], string, string, ArticleArtwork['font']?];
// Original source names, with editorial treatments rather than copied logos.
const profiles: Record<string, Profile> = {
  'henrikkarlsson.xyz': ['Escaping Flatland', 'essay', '#f1ecdf', '#98613e'],
  'paulgraham.com': ['Paul Graham', 'technical', '#fafafa', '#36578c', 'sans'],
  'blog.samaltman.com': ['Sam Altman', 'essay', '#f3eee7', '#ad5a3e'],
  'newyorker.com': ['The New Yorker', 'press', '#f4f1e8', '#252a26'],
  'nytimes.com': ['The New York Times', 'press', '#f8f6ef', '#343d3b'],
  'washingtonpost.com': ['The Washington Post', 'press', '#f4f3ed', '#304b59'],
  'theatlantic.com': ['The Atlantic', 'journal', '#f8ece2', '#b12c31'],
  'hbr.org': ['Harvard Business Review', 'journal', '#f5eeee', '#ab242e', 'sans'],
  'a16z.com': ['Andreessen Horowitz', 'studio', '#f6f4ee', '#3d6b58'],
  'sequoiacap.com': ['Sequoia', 'studio', '#e7eee1', '#337244', 'sans'],
  '37signals.com': ['37signals', 'studio', '#f5e4d3', '#a64727', 'sans'],
  'meltingasphalt.com': ['Melting Asphalt', 'notebook', '#e3eee6', '#3e6c5a'],
  'scotthyoung.com': ['Scott H. Young', 'journal', '#e7edf1', '#3d617d', 'sans'],
  'tim.blog': ['Tim Ferriss', 'journal', '#f0e7d7', '#aa5430', 'sans'],
  'jamesclear.com': ['James Clear', 'essay', '#f5f4e8', '#8f713a', 'sans'],
  'perell.com': ['David Perell', 'essay', '#e6ebf3', '#456390'],
  'nabeelqu.co': ['Nabeel Qureshi', 'essay', '#ece6f1', '#6b4b83'],
  'nabeelqu.substack.com': ['Nabeel Qureshi', 'essay', '#ece6f1', '#6b4b83'],
  'benroy.substack.com': ['Ben Roy', 'notebook', '#e2eee9', '#3e756d'],
  'riverkenna.substack.com': ['River Kenna', 'essay', '#eee5d9', '#8a5b42'],
  'map.simonsarris.com': ['Simon Sarris', 'notebook', '#e5e9da', '#5e6d44'],
  'orwellfoundation.com': ['The Orwell Foundation', 'press', '#eee8dc', '#554a3c'],
  'theamericanscholar.org': ['The American Scholar', 'press', '#f4ebdc', '#914f3e'],
  'propublica.org': ['ProPublica', 'press', '#ececec', '#345c83', 'sans'],
  'gutenberg.org': ['Project Gutenberg', 'press', '#e8dcc6', '#745533'],
  'researchgate.net': ['ResearchGate', 'technical', '#e5f0eb', '#267664', 'sans'],
  'cs.stanford.edu': ['Stanford · Computer Science', 'technical', '#f2e8e6', '#8d3e42', 'mono'],
  'web.cs.ucdavis.edu': ['UC Davis · Archive', 'technical', '#e6ebee', '#3d5b76', 'mono'],
  'csun.edu': ['CSUN · Archive', 'technical', '#ece7e1', '#9a4143', 'mono'],
  'danluu.com': ['Dan Luu', 'technical', '#e8ece6', '#53644c', 'mono'],
  'moxie.org': ['Moxie Marlinspike', 'technical', '#eee6df', '#8b654b', 'mono'],
  'patrickcollison.com': ['Patrick Collison', 'technical', '#e7e8f0', '#646a97', 'sans'],
  'kalzumeus.com': ['Kalzumeus', 'technical', '#e6edf3', '#496d8b', 'mono'],
  'waitbutwhy.com': ['Wait But Why', 'notebook', '#f7eac6', '#b37827', 'sans'],
  'ribbonfarm.com': ['Ribbonfarm', 'notebook', '#e9e4ef', '#75568d'],
  'lesswrong.com': ['LessWrong', 'technical', '#e8eee8', '#578172', 'sans'],
  'longnow.org': ['The Long Now', 'journal', '#e5e8db', '#697249'],
  'longform.asmartbear.com': ['A Smart Bear', 'studio', '#f3e5d9', '#aa6740', 'sans'],
  'highagency.com': ['High Agency', 'studio', '#e8edcd', '#647e34', 'sans'],
  'collabfund.com': ['Collaborative Fund', 'journal', '#f1e3dc', '#a84b3b'],
  'generalist.com': ['The Generalist', 'journal', '#e4eafa', '#4b639f', 'sans'],
  'fs.blog': ['Farnam Street', 'essay', '#ebe5d8', '#726341'],
  'kk.org': ['Kevin Kelly', 'notebook', '#eee9d5', '#8b7844'],
  'reddit.com': ['Reddit', 'studio', '#f7e5da', '#b34d2d', 'sans'],
  'x.com': ['X · Scott Adams', 'technical', '#ededeb', '#424745', 'sans'],
  'howtounclench.com': ['How to Unclench', 'essay', '#e5ede5', '#5b7868'],
};

export function articleSourceHost(url: string): string {
  const parsed = new URL(url);
  // Archived links retain the publication's identity, not the archive wrapper.
  const original = parsed.pathname.match(/https?:\/\/.+/)?.[0];
  const host = new URL(original || url).hostname.replace(/^www\./, '');
  return host === 'archive.nytimes.com' ? 'nytimes.com' : host;
}

export function articleArtwork(item: { url: string }): ArticleArtwork {
  const host = articleSourceHost(item.url);
  let profile = profiles[host];
  if (!profile) {
    const seed = Array.from(host).reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 0);
    const layouts: ArticleArtwork['layout'][] = ['essay', 'journal', 'notebook', 'technical', 'studio'];
    const palettes = [['#eee8dc', '#8f6842'], ['#e4ebef', '#426681'], ['#e9e4ee', '#765689'], ['#e5ecdd', '#637349'], ['#f0e2da', '#a25940']];
    const [paper, accent] = palettes[seed % palettes.length];
    profile = [host, layouts[seed % layouts.length], paper, accent];
  }
  const [source, layout, paper, accent, font = 'serif'] = profile;
  return { source, layout, paper, accent, font, ink: '#272c2b' };
}
