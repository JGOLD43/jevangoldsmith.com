export type VaultKind = 'note' | 'finance' | 'photo';

export type LifeArea = 'goal' | 'fucket' | 'learning' | 'interest' | 'trip';
export type EssayVisibility = 'private' | 'public';
export type EssayRevisionReason = 'created' | 'autosave' | 'manual' | 'studio';

export type EssayDocument = {
  id: string;
  sourceId: string | null;
  title: string;
  summary: string;
  body: string;
  collectionName: string;
  visibility: EssayVisibility;
  createdAt: string;
  updatedAt: string;
};

export type NewEssayDocument = Pick<EssayDocument, 'title' | 'summary' | 'body' | 'collectionName' | 'visibility'> & {
  sourceId?: string | null;
};

export type EssayRevision = {
  id: string;
  essayId: string;
  sequence: number;
  title: string;
  summary: string;
  body: string;
  characterCount: number;
  changeSize: number;
  reason: EssayRevisionReason;
  createdAt: string;
};

export type LifeItem = {
  id: string;
  area: LifeArea;
  title: string;
  note: string;
  progress: number;
  targetDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewLifeItem = Pick<LifeItem, 'area' | 'title' | 'note' | 'progress' | 'targetDate'>;

export type RelationshipContact = {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  tags: string[];
  notes: string;
  cadenceDays: number;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewRelationshipContact = Pick<RelationshipContact,
  'name' | 'company' | 'role' | 'email' | 'phone' | 'website' | 'location' | 'tags' | 'notes' | 'cadenceDays' | 'nextFollowUpAt'
>;

export type RelationshipInteraction = {
  id: string;
  contactId: string;
  summary: string;
  occurredAt: string;
  createdAt: string;
};

export type VaultItem = {
  id: string;
  kind: VaultKind;
  title: string;
  body: string;
  amount: number | null;
  attachmentUri: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DraftType = 'essay' | 'adventure' | 'project' | 'challenge' | 'product' | 'quote' | 'now';
export type DraftStatus = 'draft' | 'ready' | 'published';
export type DraftOperation = 'create' | 'update';

export type PublicationJobStatus = 'queued' | 'submitted' | 'failed';

export type PublicationJob = {
  id: string;
  itemType: DraftType | 'book';
  localId: string;
  manifestJson: string;
  status: PublicationJobStatus;
  error: string;
  commitUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NowLocation = {
  label: string;
  lat: number;
  lng: number;
  zoom: number;
};

export type PublicDraft = {
  id: string;
  type: DraftType;
  title: string;
  summary: string;
  body: string;
  sourceId: string | null;
  operation: DraftOperation;
  nowLocation: NowLocation | null;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
};

export type AiRole = 'user' | 'assistant';

export type AiMessage = {
  id: string;
  role: AiRole;
  content: string;
  createdAt: string;
};

export type BookFormat = 'epub' | 'pdf' | 'metadata';
export type BookReadingStatus = 'unread' | 'reading' | 'finished';

export type Movie = {
  id: string;
  title: string;
  year: string;
  watchedDate: string;
  posterUri: string | null;
  backdropUri: string | null;
  genre: string;
  genres: string[];
  rating: string;
  starCount: number;
  timesWatched: number;
  runtimeMinutes: number;
  overview: string;
  review: string;
  websiteUrl: string;
  letterboxdUrl: string;
};

export type Book = {
  id: string;
  publicId: string | null;
  title: string;
  author: string;
  isbn: string;
  year: string;
  rating: number;
  reReads: number;
  category: string;
  summary: string;
  review: string;
  coverUri: string | null;
  format: BookFormat;
  encryptedFileUri: string | null;
  originalFileName: string | null;
  fileHash: string | null;
  readingStatus: BookReadingStatus;
  progress: number;
  locator: string | null;
  totalPages: number | null;
  currentPage: number | null;
  isPublic: boolean;
  addedAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type NewBook = Pick<Book, 'title' | 'author' | 'format'> & Partial<Pick<Book,
  'publicId' | 'isbn' | 'year' | 'rating' | 'reReads' | 'category' | 'summary' | 'review' |
  'coverUri' | 'encryptedFileUri' | 'originalFileName' | 'fileHash' | 'readingStatus' | 'isPublic'
>>;

export type BookAnnotationKind = 'highlight' | 'note' | 'bookmark';

export type BookAnnotation = {
  id: string;
  bookId: string;
  kind: BookAnnotationKind;
  locator: string;
  selectedText: string;
  note: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type BookCollection = {
  id: string;
  name: string;
  createdAt: string;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  localDay: string;
};

export type DailyActivity = {
  date: string;
  value: number;
  count: number;
};

export type BookReadingStats = {
  bookId: string;
  totalSeconds: number;
  todaySeconds: number;
  daysRead: number;
  sessionCount: number;
  highlightCount: number;
  noteCount: number;
  currentStreak: number;
  lastReadAt: string | null;
};

export type LibraryReadingStats = {
  totalSeconds: number;
  todaySeconds: number;
  lastSevenDaysSeconds: number;
  daysRead: number;
  booksStarted: number;
  booksFinished: number;
  highlightCount: number;
  currentStreak: number;
  longestStreak: number;
  currentWeekStreak: number;
  longestWeekStreak: number;
  sessionCount: number;
  dailyActivity: DailyActivity[];
};

export type PublicBookFields = Pick<Book,
  'title' | 'author' | 'isbn' | 'year' | 'rating' | 'reReads' | 'category' | 'summary' | 'review'
> & {
  read: boolean;
};

export type NewVaultItem = Pick<VaultItem, 'kind' | 'title' | 'body'> & {
  amount?: number | null;
  attachmentUri?: string | null;
};

export type NewPublicDraft = Pick<PublicDraft, 'type' | 'title' | 'summary' | 'body'> & {
  sourceId?: string | null;
  operation?: DraftOperation;
  nowLocation?: NowLocation | null;
};
