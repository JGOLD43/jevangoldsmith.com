import type { SkillDimension } from './types';

export type UpskillingSeedNode = {
  key: string;
  title: string;
  description: string;
  dimension: SkillDimension;
  practicePrompt: string;
  successCriteria: string;
  prerequisiteKeys: string[];
  sourcePatterns: RegExp[];
  mathAcademySource?: string;
};

export const UPSKILLING_TREE_TITLE = 'Learning how to learn';

export const UPSKILLING_SEED_NODES: UpskillingSeedNode[] = [
  {
    key: 'define-performance', title: 'Define a reproducible performance', dimension: 'conceptual', prerequisiteKeys: [],
    description: 'Turn a vague topic into something you can demonstrably do again under stated conditions.',
    practicePrompt: 'Choose something you want to learn. Write one observable performance that would prove improvement, including the conditions and quality bar.',
    successCriteria: 'A neutral observer could run the test twice and agree whether you succeeded.',
    sourcePatterns: [/tangible, reproducible skill/i, /concrete way of measuring/i],
  },
  {
    key: 'map-prerequisites', title: 'Map the prerequisite staircase', dimension: 'procedural', prerequisiteKeys: ['define-performance'],
    description: 'Work backward from a target, then order the smallest learnable abilities from foundations upward.',
    practicePrompt: 'Take the target performance. Identify the first failure point, ask what ability it assumes, and repeat until the bottom ability is already achievable.',
    successCriteria: 'Every edge explains why the lower ability is needed, and every step is small enough to practise now.',
    sourcePatterns: [/prerequisite abilities/i, /systematically climb skill trees/i, /foundational knowledge/i],
    mathAcademySource: 'The knowledge graph records topics, prerequisites, variations and remedial relevance so learning can start at the student’s frontier.',
  },
  {
    key: 'calibrate-edge', title: 'Calibrate practice at the edge', dimension: 'conditional', prerequisiteKeys: ['define-performance', 'map-prerequisites'],
    description: 'Choose work just beyond current independent ability: hard enough to require adjustment, not so hard that feedback becomes noise.',
    practicePrompt: 'Pick three candidate exercises. Predict which one will produce roughly four clean attempts out of five, then test the prediction.',
    successCriteria: 'You can explain why the task is neither comfort-zone repetition nor an unproductive deep-end task.',
    sourcePatterns: [/just beyond the edge/i, /properly calibrated/i, /overly difficult/i],
    mathAcademySource: 'Adaptive selection aims for the highest learning per unit time and adjusts task difficulty and length from observed performance.',
  },
  {
    key: 'retrieval-first', title: 'Retrieve before reviewing', dimension: 'procedural', prerequisiteKeys: ['define-performance'],
    description: 'Attempt recall or production before exposing yourself to the answer or worked example.',
    practicePrompt: 'Hide the source. Reconstruct the idea, procedure or example from memory, then compare and mark exactly what was absent or distorted.',
    successCriteria: 'The first attempt is unaided, discrepancies are explicit, and the corrected version is retrieved again.',
    sourcePatterns: [/retriev/i, /following along/i, /recall first/i],
  },
  {
    key: 'feedback-loop', title: 'Run a tight correction loop', dimension: 'procedural', prerequisiteKeys: ['calibrate-edge'],
    description: 'Perform, inspect the result, isolate one error, adjust, and retry while the context is still active.',
    practicePrompt: 'Do one representative task. Name the highest-leverage error in one sentence, change one thing, and repeat the task immediately.',
    successCriteria: 'The second attempt is measurably better for the stated reason, not merely repeated.',
    sourcePatterns: [/coach corrects/i, /adjustments on every single repetition/i, /analyze your mistakes/i],
  },
  {
    key: 'schedule-retrieval', title: 'Schedule minimum-effective review', dimension: 'conditional', prerequisiteKeys: ['retrieval-first'],
    description: 'Review near the point where retrieval becomes effortful, using later clean recall as stronger evidence than immediate repetition.',
    practicePrompt: 'For one ability, predict when unaided recall will fall below 80%, schedule that test, and adjust the next interval from the result.',
    successCriteria: 'Intervals expand after delayed clean retrieval, contract after misses, and do not reward immediate rereading as mastery.',
    sourcePatterns: [/review should feel challenging/i, /vicious cycle of forgetting/i, /long-term memory/i],
    mathAcademySource: 'Spaced repetition supplies a minimum effective dose at the right time; review that is too early wastes time and review that is too late allows backsliding.',
  },
  {
    key: 'interleave', title: 'Discriminate between similar tools', dimension: 'discrimination', prerequisiteKeys: ['retrieval-first', 'calibrate-edge'],
    description: 'Mix tasks so you must identify which concept or procedure applies instead of following a blocked pattern.',
    practicePrompt: 'Create four mixed cases: two for the target method and two plausible confusers. For each, decide which method applies and state the decisive cue.',
    successCriteria: 'You choose correctly without a section heading or prompt that reveals the method.',
    sourcePatterns: [/context overload/i, /prereq yo/i],
    mathAcademySource: 'Interleaving mixes problem types and separates similar topics to reduce associative interference and require method selection.',
  },
  {
    key: 'produce-transfer', title: 'Produce in a changed context', dimension: 'transfer', prerequisiteKeys: ['feedback-loop', 'interleave'],
    description: 'Use the skill to create or solve something meaningfully different from the training example.',
    practicePrompt: 'Apply the ability to a new context with one changed constraint. Explain what stayed invariant and what had to change.',
    successCriteria: 'The result works in the new context and was produced without copying the original form.',
    sourcePatterns: [/consuming is only helpful/i, /actively doing/i, /enables you to produce/i],
  },
  {
    key: 'use-encompassment', title: 'Credit skills used inside harder work', dimension: 'conceptual', prerequisiteKeys: ['map-prerequisites', 'produce-transfer'],
    description: 'Recognise when advanced performance exercises component abilities, while discounting that implicit evidence relative to a direct test.',
    practicePrompt: 'Take one advanced task and list the component abilities it actually exercises. Exclude abilities that are merely prerequisites but not used during execution.',
    successCriteria: 'Each credited component is visibly exercised in the performance, and implicit credit is weaker than direct evidence.',
    sourcePatterns: [/layer.*advanced skills/i, /fundamental skills/i],
    mathAcademySource: 'Fractional Implicit Repetition credits encompassed component skills used inside advanced work, while distinguishing them from prerequisites that are not exercised.',
  },
  {
    key: 'operate-system', title: 'Operate an evidence-driven training system', dimension: 'transfer', prerequisiteKeys: ['schedule-retrieval', 'produce-transfer', 'use-encompassment'],
    description: 'Run the complete loop: frontier diagnosis, targeted practice, correction, delayed retrieval, transfer and graph revision.',
    practicePrompt: 'Plan a seven-day training cycle for a real goal. Include a measurable target, prerequisite repair, short frequent practice, delayed reviews, mixed transfer tasks and a rule for revising the graph.',
    successCriteria: 'Every activity produces evidence tied to a skill, and the next activity changes when that evidence changes.',
    sourcePatterns: [/efficient learning loop/i, /short and frequent/i, /measurable progress/i],
    mathAcademySource: 'The system continually updates a learner model, selects tasks at the knowledge frontier, repairs weak prerequisites and compresses review through tasks that cover multiple due skills.',
  },
];
