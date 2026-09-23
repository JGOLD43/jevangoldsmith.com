export interface InterviewArtwork {
  kicker: string;
  paper: string;
  ink: string;
  accent: string;
  motif: 'keys' | 'orbit' | 'grid' | 'stripe' | 'spectrum' | 'wave';
  font: 'serif' | 'sans' | 'mono';
}

// Individual cassette labels, with visual cues from each conversation's subject.
const designs: Record<string, InterviewArtwork> = {
  'archive-9a2ab2e9a6f9': { kicker: 'Miles Davis', paper: '#c9dbe3', ink: '#172c40', accent: '#345a80', motif: 'keys', font: 'serif' },
  'archive-f4ec946bd645': { kicker: 'Jimmy Carter', paper: '#ede2ba', ink: '#343e28', accent: '#63714b', motif: 'stripe', font: 'serif' },
  'archive-d7c1842a66ae': { kicker: 'Luigi Colani', paper: '#f6dfc9', ink: '#502c20', accent: '#b74e27', motif: 'orbit', font: 'sans' },
  'archive-386e2563d338': { kicker: 'Jeff Bezos · 2001', paper: '#d8e6e4', ink: '#193d46', accent: '#cf8430', motif: 'stripe', font: 'sans' },
  'archive-27ff2cac4f03': { kicker: 'Jim Simons', paper: '#22363e', ink: '#f5ebcf', accent: '#89b7ae', motif: 'grid', font: 'mono' },
  'archive-52637c118209': { kicker: 'David Ogilvy', paper: '#f4e9d2', ink: '#312523', accent: '#a52d36', motif: 'stripe', font: 'serif' },
  'archive-0743466e3c79': { kicker: 'Work for yourself', paper: '#d9e1cd', ink: '#284039', accent: '#527b65', motif: 'wave', font: 'sans' },
  'archive-0ac2b501f974': { kicker: 'The One Percent', paper: '#302f39', ink: '#f6e8c6', accent: '#c49a59', motif: 'stripe', font: 'serif' },
  'archive-dca48c6d9d5e': { kicker: 'Sam Altman', paper: '#e1e5ef', ink: '#293755', accent: '#687daa', motif: 'grid', font: 'sans' },
  'archive-f4244d751a77': { kicker: 'Hunter Thompson', paper: '#efd474', ink: '#342723', accent: '#b24430', motif: 'stripe', font: 'mono' },
  'archive-643546a06b80': { kicker: 'Steve Jobs · Lost interview', paper: '#e1ded4', ink: '#26292d', accent: '#666d74', motif: 'grid', font: 'mono' },
  'archive-500609e83ae7': { kicker: 'Steve Jobs · Aspen 1983', paper: '#f0e8cf', ink: '#292e2b', accent: '#637c51', motif: 'spectrum', font: 'sans' },
  'archive-bacf6e60b5fc': { kicker: 'John McAfee', paper: '#352b33', ink: '#f1e4cb', accent: '#c46257', motif: 'grid', font: 'mono' },
  'archive-756effc9b792': { kicker: 'Michael Jordan', paper: '#e7d2c8', ink: '#39221f', accent: '#a8332e', motif: 'orbit', font: 'sans' },
  'archive-1cde0fd23030': { kicker: 'Brian Chesky', paper: '#f2ded8', ink: '#603e49', accent: '#b66078', motif: 'orbit', font: 'serif' },
  'archive-ba56a6f4d28f': { kicker: 'Hans Zimmer', paper: '#303840', ink: '#f4e5ca', accent: '#d0ac6a', motif: 'keys', font: 'serif' },
  'archive-e26c73186259': { kicker: 'Kapil Gupta', paper: '#dce6e0', ink: '#253e38', accent: '#5b8678', motif: 'wave', font: 'serif' },
  'archive-c57e33955afd': { kicker: 'Richard Feynman', paper: '#e9dcc6', ink: '#443348', accent: '#86698e', motif: 'orbit', font: 'sans' },
  'archive-7025101c927b': { kicker: 'Brian Eno', paper: '#d4dbe9', ink: '#33375d', accent: '#8272ad', motif: 'wave', font: 'sans' },
};

export function interviewArtwork(item: { id: string; topic: string }): InterviewArtwork {
  if (designs[item.id]) return designs[item.id];
  const seed = Array.from(item.id).reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 0);
  const palette = Object.values(designs)[seed % Object.keys(designs).length];
  return { ...palette, kicker: item.topic };
}
