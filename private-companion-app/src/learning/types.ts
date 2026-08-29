export type LearningSkillStatus = 'locked' | 'ready' | 'learning' | 'reliable' | 'automatic';
export type AttemptResult = 'clean' | 'helped' | 'missed';
export type ExerciseKind = 'retrieve' | 'respond' | 'repair' | 'fluency' | 'real_world';

export type FrenchSkill = {
  id: string;
  title: string;
  ability: string;
  phrases: string[];
  meaning: string;
  kind: ExerciseKind;
  prerequisites: string[];
  unlockLeverage: number;
  realWorldFrequency: number;
  estimatedSeconds: number;
};

export type LearningSkillState = {
  skillId: string;
  status: LearningSkillStatus;
  strength: number;
  cleanRetrievals: number;
  helpedRetrievals: number;
  misses: number;
  nextReviewAt: string | null;
  lastAttemptAt: string | null;
};

export type LearningExercise = {
  id: string;
  skillId: string;
  kind: ExerciseKind;
  prompt: string;
  answer: string;
  coachingNote: string;
  targetSeconds: number;
};

export type LearningSessionPlan = {
  id: string;
  durationMinutes: number;
  createdAt: string;
  focus: string;
  phrases: string[];
  exercises: LearningExercise[];
  voiceBrief: string;
};

export type LearningMilestone = {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  realLifeTest: string;
  targetMinutes: number;
  requiredSkillIds: string[];
};

export type LearningDashboard = {
  totalMinutes: number;
  todayMinutes: number;
  currentStreak: number;
  reliableSkills: number;
  totalSkills: number;
  dueReviews: number;
  nextMilestone: LearningMilestone | null;
  milestoneProgress: number;
  recentActivity: { date: string; value: number; count: number }[];
};

export type LearningCardDirection = 'forward' | 'reverse';

export type LearningCard = {
  id: string;
  skillId: string | null;
  deckName: string;
  front: string;
  back: string;
  note: string;
  tags: string[];
  reverseEnabled: boolean;
  archived: boolean;
  source: 'curriculum' | 'personal';
};

export type LearningCardState = {
  cardId: string;
  direction: LearningCardDirection;
  stability: number;
  difficulty: number;
  dueAt: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt: string | null;
};

export type ReviewCard = LearningCard & {
  direction: LearningCardDirection;
  prompt: string;
  answer: string;
  state: LearningCardState;
};

export type CardDashboard = {
  dueCount: number;
  newCount: number;
  learnedCount: number;
  totalCount: number;
  reviewedToday: number;
  retentionPercent: number;
  deckCounts: { name: string; total: number; due: number }[];
};

export type SkillTree = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type SkillDimension = 'conceptual' | 'procedural' | 'conditional' | 'discrimination' | 'transfer';
export type SkillRelationship = 'prerequisite' | 'encompasses' | 'confusable';

export type SkillSourceReference = {
  annotationId: string;
  bookId: string;
  bookTitle: string;
  locator: string;
  excerpt: string;
};

export type SkillTreeNode = {
  id: string;
  treeId: string;
  title: string;
  description: string;
  practicePrompt: string;
  successCriteria: string;
  prerequisites: string[];
  dimension: SkillDimension;
  sourceReferences: SkillSourceReference[];
  inferenceConfidence: number;
  createdAt: string;
  updatedAt: string;
};

export type SkillTreeProgress = {
  nodeId: string;
  strength: number;
  cleanAttempts: number;
  helpedAttempts: number;
  misses: number;
  lastPracticedAt: string | null;
  stabilityDays: number;
  difficulty: number;
  dueAt: string | null;
  retentionEstimate: number;
  dimensionScores: Record<SkillDimension, number>;
};

export type SkillPracticeEvidence = {
  result: AttemptResult;
  dimension: SkillDimension;
  responseMs: number;
  hintCount: number;
  transferContext: boolean;
  practicedAt?: string;
};

export type SkillTreeAnalytics = {
  attempts: number;
  cleanRate: number;
  medianResponseMs: number;
  estimatedRetention: number;
  dueCount: number;
  reliableCount: number;
  masteredCount: number;
  transferRate: number;
  independentRate: number;
  growthLast30Days: number;
  dimensionScores: Record<SkillDimension, number>;
};

export type SkillTreeNodeStatus = 'locked' | 'ready' | 'practising' | 'reliable' | 'mastered';

export type SkillTreeNodeView = SkillTreeNode & {
  depth: number;
  status: SkillTreeNodeStatus;
  progress: SkillTreeProgress;
};

export type SkillTreeDetail = SkillTree & { nodes: SkillTreeNodeView[] };

export type SkillTreeSummary = SkillTree & {
  nodeCount: number;
  reliableCount: number;
  readyCount: number;
};
