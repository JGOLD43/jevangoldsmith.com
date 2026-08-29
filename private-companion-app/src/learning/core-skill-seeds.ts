import type { SkillDimension } from './types';

export type CoreSkillSeedNode = {
  key: string;
  title: string;
  description: string;
  dimension: SkillDimension;
  practicePrompt: string;
  successCriteria: string;
  prerequisiteKeys: string[];
};

export type CoreSkillTreeSeed = {
  key: string;
  title: string;
  description: string;
  nodes: CoreSkillSeedNode[];
};

const node = (key: string, title: string, dimension: SkillDimension, prerequisiteKeys: string[], description: string, practicePrompt: string, successCriteria: string): CoreSkillSeedNode => ({ key, title, dimension, prerequisiteKeys, description, practicePrompt, successCriteria });

export const CORE_SKILL_TREE_SEEDS: CoreSkillTreeSeed[] = [
  {
    key: 'business-building',
    title: 'Business building',
    description: 'Find valuable problems, create an offer, win customers and operate a durable business.',
    nodes: [
      node('customer-observation', 'Observe customer behaviour', 'conceptual', [], 'Separate what people actually do from what they say they might do.', 'Interview one target customer about the last time they faced a costly problem. Capture events, workarounds, spending and consequences without pitching.', 'The account contains specific past behaviour, a current workaround and a measurable cost or consequence.'),
      node('problem-selection', 'Select a painful problem', 'conditional', ['customer-observation'], 'Prioritise problems by urgency, frequency, willingness to pay and reachable demand.', 'Score three observed problems from 1–5 on urgency, frequency, budget and access. Choose one and state why the others lose.', 'The chosen problem has behavioural evidence, a reachable buyer and a reason action is likely now.'),
      node('market-map', 'Map the market and alternatives', 'discrimination', ['customer-observation'], 'Understand competitors, substitutes and the option of doing nothing from the buyer’s perspective.', 'Map five ways a customer currently solves the problem, including manual work and inaction. State the advantage and weakness of each.', 'The map explains switching barriers and identifies a specific underserved position without relying on “no competitors”.'),
      node('value-proposition', 'Design a sharp value proposition', 'procedural', ['problem-selection', 'market-map'], 'Connect a defined customer and problem to a differentiated, credible outcome.', 'Write a one-sentence offer naming the customer, painful situation, promised outcome, mechanism and reason to believe.', 'A target buyer can quickly tell whether it is for them, what improves and why this approach differs.'),
      node('unit-economics', 'Model unit economics', 'procedural', ['problem-selection'], 'Estimate how revenue, variable cost, acquisition cost, retention and cash timing interact.', 'Build a base, upside and downside model for one customer cohort using explicit price, gross margin, acquisition cost and retention assumptions.', 'The model exposes break-even volume and the two assumptions that most change viability.'),
      node('sell-manually', 'Sell the offer manually', 'transfer', ['value-proposition', 'unit-economics'], 'Run direct sales conversations that diagnose fit, handle objections and ask for commitment.', 'Conduct or role-play a discovery call, summarise the buyer’s problem in their words, present the offer and ask for a paid next step.', 'The buyer gives a clear decision or concrete objection; the conversation produces evidence beyond politeness.'),
      node('distribution-system', 'Build a repeatable distribution loop', 'procedural', ['sell-manually'], 'Turn one-off customer acquisition into a measured channel with a repeatable cadence.', 'Choose one channel and define audience, message, weekly actions, conversion stages, cost and a four-week falsification threshold.', 'Another person could run the loop and determine from the metrics whether to scale, change or stop it.'),
      node('operating-system', 'Operate with leading indicators', 'procedural', ['unit-economics', 'distribution-system'], 'Translate strategy into ownership, cadence, constraints and measurable operating signals.', 'Create a one-page weekly operating review with goals, leading indicators, cash, bottlenecks, owners and next experiments.', 'The review identifies the largest constraint and assigns a dated action whose result changes the next decision.'),
      node('strategic-choice', 'Make a coherent strategic choice', 'transfer', ['operating-system', 'market-map'], 'Choose where to play and how to win while explicitly declining attractive distractions.', 'Write a strategy kernel: diagnosis, guiding policy, coordinated actions and three things the business will not pursue.', 'The actions reinforce one another, address the diagnosed constraint and create a testable advantage.'),
    ],
  },
  {
    key: 'finance-investing',
    title: 'Finance & investing',
    description: 'Read financial reality, manage cash, value opportunities and make risk-aware capital decisions.',
    nodes: [
      node('time-value', 'Reason about compounding', 'conceptual', [], 'Translate money across time using rates, inflation and opportunity cost.', 'Compare receiving $10,000 now with a future payment under three discount-rate assumptions and explain the decision.', 'The calculation is correct and the chosen rate is tied to inflation, risk and alternatives.'),
      node('statements', 'Read the three financial statements', 'procedural', [], 'Connect profit, cash flow and the balance sheet without treating them as interchangeable.', 'Trace five transactions through the income statement, balance sheet and cash-flow statement.', 'Assets equal liabilities plus equity after every transaction, and cash differs from profit for an explained reason.'),
      node('cash-control', 'Build a cash runway model', 'procedural', ['statements'], 'Forecast cash timing and recognise insolvency risk before accounting profit reveals it.', 'Create a 13-week cash forecast with opening cash, dated inflows, committed outflows and downside cases.', 'The model identifies runway, the lowest cash point and a trigger for corrective action.'),
      node('returns-risk', 'Compare return and risk', 'discrimination', ['time-value'], 'Distinguish expected return, volatility, permanent loss, liquidity and concentration.', 'Compare three investments using expected return, downside, liquidity, correlation and confidence in assumptions.', 'The recommendation states which risks are compensated, which are avoidable and what evidence would reverse it.'),
      node('business-quality', 'Diagnose business quality', 'conditional', ['statements'], 'Judge economics through margins, returns on capital, reinvestment, durability and incentives.', 'Analyse one company across five years of revenue, margins, free cash flow and invested capital.', 'The conclusion distinguishes growth that creates value from growth that consumes capital.'),
      node('valuation', 'Value an uncertain asset', 'procedural', ['time-value', 'business-quality'], 'Estimate value as a range built from cash flows, scenarios and explicit uncertainty.', 'Build a simple discounted-cash-flow or owner-earnings valuation with bear, base and bull cases.', 'The range reconciles to operating assumptions and identifies the variables carrying most of the valuation.'),
      node('portfolio', 'Construct a resilient portfolio', 'transfer', ['returns-risk', 'valuation'], 'Size positions around goals, time horizon, diversification and the ability to survive error.', 'Design a portfolio for a stated goal and stress it against a recession, inflation shock and one thesis failure.', 'No single plausible failure prevents the goal, and every allocation has a stated role.'),
      node('capital-allocation', 'Allocate capital across competing uses', 'transfer', ['cash-control', 'valuation', 'portfolio'], 'Compare reinvestment, hiring, debt reduction, acquisition and distributions on a common basis.', 'Rank five uses of a fixed pool of capital using expected return, strategic value, reversibility and downside.', 'The chosen allocation preserves survival and beats alternatives under explicit assumptions.'),
    ],
  },
  {
    key: 'quantitative-reasoning',
    title: 'Quantitative reasoning',
    description: 'Use algebra, probability, statistics and models to reason clearly from numerical evidence.',
    nodes: [
      node('number-sense', 'Estimate orders of magnitude', 'procedural', [], 'Build numerical intuition through units, ratios, bounds and back-of-the-envelope checks.', 'Estimate an unfamiliar real-world quantity two ways before looking it up, showing units and plausible bounds.', 'Both methods land within the same order of magnitude and every assumption is inspectable.'),
      node('algebra-model', 'Express relationships with algebra', 'procedural', ['number-sense'], 'Turn verbal relationships into variables, equations and constraints.', 'Model a break-even, mixture or rate problem symbolically, solve it and verify the result in the original situation.', 'Variables have units, transformations are valid and substitution confirms the answer.'),
      node('probability', 'Update beliefs with probability', 'conceptual', ['number-sense'], 'Reason about base rates, conditional probability and repeated uncertainty.', 'Solve a base-rate problem with a tree or table, then explain why the intuitive answer differs.', 'Joint and conditional probabilities are not confused, and the result lies within sensible bounds.'),
      node('descriptive-data', 'Summarise a dataset honestly', 'discrimination', ['number-sense'], 'Choose summaries and visual comparisons that reveal distribution rather than hide it.', 'Summarise a small dataset using centre, spread, shape and outliers; compare mean with median.', 'The summary preserves important variation and explains which statistic is appropriate.'),
      node('inference', 'Quantify sampling uncertainty', 'procedural', ['probability', 'descriptive-data'], 'Use samples to estimate populations while respecting uncertainty and assumptions.', 'Estimate a proportion or mean with an interval and explain it to a non-technical decision-maker.', 'The interpretation describes repeated-sampling uncertainty and avoids claiming certainty about one interval.'),
      node('causal-experiment', 'Design a causal test', 'conditional', ['probability', 'inference'], 'Separate correlation from intervention using randomisation, controls and predeclared outcomes.', 'Design an experiment for a real decision, including unit, treatment, outcome, sample logic and stopping rule.', 'The design blocks the main confounders and states what result would change the decision.'),
      node('forecast', 'Build and calibrate a forecast', 'procedural', ['probability', 'algebra-model'], 'Turn uncertain judgments into probabilities and improve them against outcomes.', 'Make ten dated predictions with probabilities, then score resolved forecasts and inspect calibration.', 'Predictions are unambiguous, probabilities vary with confidence and errors produce a specific model update.'),
      node('decision-model', 'Make a decision under uncertainty', 'transfer', ['causal-experiment', 'forecast'], 'Combine probabilities, payoffs, information value and reversibility into an action.', 'Build a decision tree for a live choice with scenarios, payoffs, probabilities and the value of one additional test.', 'The recommended action remains coherent across a stated sensitivity range and includes a review trigger.'),
    ],
  },
  {
    key: 'technology-ai',
    title: 'Technology & AI',
    description: 'Understand software systems, automate work and build reliable products with modern AI.',
    nodes: [
      node('systems-model', 'Model a software system', 'conceptual', [], 'Describe inputs, state, transformations, outputs and failure boundaries.', 'Draw the data flow for an everyday app from user action through storage and response, including one failure path.', 'Each component has a responsibility and every boundary explains what data crosses it.'),
      node('programming', 'Write and debug a small program', 'procedural', ['systems-model'], 'Use variables, functions, control flow and tests to automate a defined transformation.', 'Implement a small data transformation from examples, add tests, then diagnose one introduced bug from evidence.', 'Tests cover normal and edge cases, and the fix addresses the cause rather than the symptom.'),
      node('data-model', 'Design a durable data model', 'procedural', ['systems-model'], 'Represent entities, identity, relationships, constraints and change over time.', 'Model a small product domain with sample records, unique identities and deletion/update rules.', 'The model prevents impossible states and supports the required queries without duplicated truth.'),
      node('api-integration', 'Integrate a service through an API', 'procedural', ['programming', 'data-model'], 'Exchange structured data while handling authentication, validation, retries and rate limits.', 'Build or specify an integration that fetches, validates, stores and safely retries one external resource.', 'Failures are bounded, secrets stay out of logs and repeated requests do not corrupt state.'),
      node('ai-task-design', 'Design an effective AI task', 'conditional', ['systems-model'], 'Decide when AI is useful and supply context, constraints, examples and a verifiable output contract.', 'Turn a vague recurring task into an AI brief with inputs, rubric, counterexamples and an escalation rule.', 'A second evaluator can judge the output consistently and risky uncertainty is surfaced.'),
      node('ai-evaluation', 'Evaluate AI output systematically', 'discrimination', ['ai-task-design'], 'Test usefulness, factuality, robustness, cost and failure modes against representative cases.', 'Create a 20-case evaluation set for an AI workflow, including edge, adversarial and abstention cases.', 'The rubric catches consequential failures and produces a release threshold tied to the real task.'),
      node('automation', 'Automate a reliable workflow', 'transfer', ['api-integration', 'ai-evaluation'], 'Join deterministic software and AI judgment with observability and human control.', 'Automate a repeated workflow with validation, idempotency, logs, retry limits and a human review boundary.', 'The workflow saves measurable effort and a partial failure can be detected and safely recovered.'),
      node('ship-product', 'Ship and improve a technical product', 'transfer', ['automation'], 'Move from user need to a monitored release through small vertical slices and feedback.', 'Ship a narrow end-to-end improvement, define adoption and failure metrics, then review real usage.', 'A user can complete the promised outcome, failures are observable and evidence determines the next iteration.'),
    ],
  },
  {
    key: 'communication-influence',
    title: 'Communication & influence',
    description: 'Think clearly with others through writing, speaking, listening, negotiation and leadership.',
    nodes: [
      node('listen', 'Listen for the underlying model', 'conceptual', [], 'Recover another person’s facts, feelings, incentives and assumptions before responding.', 'In a conversation, summarise the other person’s view and ask them to correct it before offering yours.', 'They agree the summary is accurate and add no major missing premise.'),
      node('clear-writing', 'Write a clear argument', 'procedural', [], 'Structure a claim, evidence, reasoning and implication for a defined reader.', 'Write a 300-word recommendation beginning with the decision and supporting it with the strongest evidence.', 'A reader can state the claim, reasons and requested action after one pass.'),
      node('explain', 'Explain a complex idea simply', 'transfer', ['listen', 'clear-writing'], 'Adapt an explanation to prior knowledge without removing the mechanism.', 'Explain one technical idea to a novice using an analogy, example and check-for-understanding question.', 'The listener can predict a new example and identify where the analogy stops working.'),
      node('present', 'Deliver a persuasive presentation', 'procedural', ['clear-writing'], 'Guide attention through a spoken narrative with evidence, pacing and a clear ask.', 'Deliver a five-minute presentation without reading, record it and remove one unclear section.', 'The audience recalls the main point and knows the requested next action.'),
      node('feedback', 'Give actionable feedback', 'conditional', ['listen'], 'Address observable behaviour, impact and next attempt while preserving candour and dignity.', 'Give feedback on a real work sample using situation, behaviour, impact and a specific next repetition.', 'The recipient can repeat the requested change and has a near-term chance to practise it.'),
      node('negotiate', 'Negotiate interests and trades', 'discrimination', ['listen', 'explain'], 'Separate positions from interests and create options across differently valued terms.', 'Prepare a negotiation with BATNA, reservation point, interests, questions and three multi-issue packages.', 'You can reject a bad deal, explain each trade and reach agreement without hiding material terms.'),
      node('conflict', 'Resolve productive conflict', 'transfer', ['feedback', 'negotiate'], 'Surface disagreement, test assumptions and commit to a decision without personalising the issue.', 'Facilitate a disagreement by stating the decision, each model, shared evidence and a decision rule.', 'The real disagreement becomes explicit and the group leaves with an owner, decision or experiment.'),
      node('leadership', 'Create aligned ownership', 'transfer', ['present', 'feedback', 'conflict'], 'Set context, standards and decision rights so others can act without waiting for instructions.', 'Delegate a meaningful outcome with purpose, constraints, authority, check-ins and success measures.', 'The owner can make the next decisions independently and escalation boundaries are clear.'),
    ],
  },
  {
    key: 'personal-effectiveness',
    title: 'Personal effectiveness',
    description: 'Direct attention, energy and decisions toward meaningful long-term outcomes.',
    nodes: [
      node('values', 'Define a personal decision standard', 'conceptual', [], 'Turn broad values into observable principles for choosing and refusing commitments.', 'Write five decision principles, each with one example of what it makes you do and decline.', 'The principles distinguish between two genuinely attractive options.'),
      node('attention', 'Protect focused attention', 'procedural', [], 'Create conditions for sustained work by controlling cues, scope and interruption.', 'Run a 50-minute focus block with one defined output, distractions removed and interruptions captured.', 'The output exists, interruptions are recorded and the next block changes based on what broke focus.'),
      node('planning', 'Convert goals into executable projects', 'procedural', ['values'], 'Define outcomes, next actions, constraints and review points instead of maintaining vague intentions.', 'Turn one goal into an outcome, milestones, next physical action, calendar time and kill criteria.', 'The next action can begin immediately and progress can be judged without motivational language.'),
      node('habits', 'Design a behaviour loop', 'procedural', ['attention'], 'Shape cues, friction, rewards and recovery so repetition does not rely on mood.', 'Design one tiny behaviour with a stable cue, reduced friction, visible completion and missed-day recovery rule.', 'The behaviour occurs in the intended context for seven days and a miss does not become abandonment.'),
      node('decisions', 'Run a decision process', 'conditional', ['values', 'planning'], 'Match decision effort to stakes, reversibility and uncertainty.', 'Classify a current decision by consequence and reversibility, then choose a deadline, evidence threshold and review date.', 'The process prevents both impulsive commitment and indefinite analysis.'),
      node('energy', 'Manage energy as a constraint', 'procedural', ['habits'], 'Use sleep, movement, food and workload patterns as inputs to reliable performance.', 'Track energy against sleep, movement and work type for two weeks; change one controllable variable.', 'The change produces a measurable performance signal or is rejected from evidence.'),
      node('resilience', 'Recover from setbacks deliberately', 'transfer', ['decisions', 'energy'], 'Regulate the immediate response, extract information and resume useful action.', 'Write a setback review separating facts, interpretation, controllable causes, repair and next exposure.', 'The review yields one changed behaviour and a scheduled return to the avoided situation.'),
      node('weekly-system', 'Run a personal operating review', 'transfer', ['planning', 'energy', 'resilience'], 'Integrate commitments, learning evidence, energy and priorities into a recurring correction loop.', 'Complete a weekly review covering wins, evidence, unfinished commitments, constraints and next week’s three outcomes.', 'The calendar reflects the chosen priorities and at least one low-value commitment is changed or removed.'),
    ],
  },
  {
    key: 'creative-writing',
    title: 'Creative thinking & writing',
    description: 'Generate original ideas, research deeply and turn them into writing people remember.',
    nodes: [
      node('notice', 'Notice specific, surprising details', 'conceptual', [], 'Collect concrete observations that resist cliché and create raw material for ideas.', 'Record ten specific observations from one place, conversation or work session without interpreting them.', 'At least five details could only have come from direct attention to that situation.'),
      node('question', 'Form a generative question', 'conditional', ['notice'], 'Turn tension, anomaly or curiosity into a question that can sustain investigation.', 'Create five questions from your observations and choose the one with highest stakes and genuine uncertainty.', 'The chosen question admits multiple plausible answers and suggests where evidence could be found.'),
      node('research', 'Build an evidence map', 'procedural', ['question'], 'Gather primary evidence, competing explanations and source provenance around a question.', 'Create a research map with claims, sources, contradictions, missing evidence and confidence levels.', 'Every major claim traces to a source and the strongest counterevidence is represented fairly.'),
      node('generate', 'Generate distinct candidate ideas', 'procedural', ['question'], 'Produce multiple approaches before converging so the first familiar answer does not dominate.', 'Generate 20 possible theses, angles or solutions using at least four different prompts or constraints.', 'The final set includes genuinely different mechanisms, not cosmetic variations.'),
      node('thesis', 'Develop an original thesis', 'discrimination', ['research', 'generate'], 'Select a defensible claim that is useful, non-obvious and supported by evidence.', 'Write a thesis, strongest supporting evidence, strongest objection and the insight that survives the objection.', 'The claim is precise enough to be wrong and adds more than a summary of sources.'),
      node('structure', 'Structure a compelling piece', 'procedural', ['thesis'], 'Arrange tension, evidence and resolution so each section earns the next.', 'Outline a piece as reader questions, assigning one job and one proof to every section.', 'Removing any section would create a visible reasoning gap; no two sections do the same job.'),
      node('draft-revise', 'Draft and revise with separation', 'procedural', ['structure'], 'Generate freely, then revise for argument, structure, sentences and accuracy in distinct passes.', 'Draft one section without editing, then run separate passes for claim, order, compression and fact-checking.', 'The revision is shorter or clearer, preserves the core insight and has verified factual claims.'),
      node('publish-learn', 'Publish and learn from response', 'transfer', ['draft-revise'], 'Ship work to a real audience and use behaviour rather than praise as feedback.', 'Publish one complete piece with a prediction about who will care and what they will do next.', 'Observed reader behaviour confirms or changes the audience, thesis or distribution model for the next piece.'),
    ],
  },
];

