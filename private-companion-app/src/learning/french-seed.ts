import type { FrenchSkill, LearningMilestone } from './types';

export const FRENCH_SKILLS: FrenchSkill[] = [
  { id: 'greet', title: 'Open a conversation', ability: 'Greet someone naturally and choose the right register.', phrases: ['Bonjour', 'Salut', 'Bonsoir'], meaning: 'Hello / Hi / Good evening', kind: 'respond', prerequisites: [], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 90 },
  { id: 'name', title: 'Introduce yourself', ability: 'Give your name and ask for theirs.', phrases: ["Je m’appelle Jevan. Et vous ?", 'Comment vous vous appelez ?'], meaning: 'My name is Jevan. And you? / What is your name?', kind: 'respond', prerequisites: ['greet'], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 120 },
  { id: 'repeat', title: 'Ask for repetition', ability: 'Keep the conversation alive when you miss something.', phrases: ['Vous pouvez répéter, s’il vous plaît ?', 'Encore une fois, s’il vous plaît.'], meaning: 'Can you repeat, please? / One more time, please.', kind: 'repair', prerequisites: ['greet'], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 100 },
  { id: 'slower', title: 'Ask them to slow down', ability: 'Control the speed of a real conversation.', phrases: ['Plus lentement, s’il vous plaît.', 'Vous pouvez parler plus lentement ?'], meaning: 'More slowly, please. / Can you speak more slowly?', kind: 'repair', prerequisites: ['repeat'], unlockLeverage: 10, realWorldFrequency: 9, estimatedSeconds: 100 },
  { id: 'meaning', title: 'Ask what something means', ability: 'Resolve an unknown word without changing language.', phrases: ['Qu’est-ce que ça veut dire ?', 'Comment dit-on … en français ?'], meaning: 'What does that mean? / How do you say … in French?', kind: 'repair', prerequisites: ['repeat'], unlockLeverage: 10, realWorldFrequency: 9, estimatedSeconds: 120 },
  { id: 'origin', title: 'Say where you are from', ability: 'Share your origin and where you live.', phrases: ["Je viens d’Australie.", "J’habite à Brisbane."], meaning: 'I come from Australia. / I live in Brisbane.', kind: 'retrieve', prerequisites: ['name'], unlockLeverage: 8, realWorldFrequency: 9, estimatedSeconds: 120 },
  { id: 'core_want', title: 'Say what you want', ability: 'Build useful requests with je voudrais and je veux.', phrases: ['Je voudrais …', 'Je veux …'], meaning: 'I would like … / I want …', kind: 'retrieve', prerequisites: ['greet'], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 150 },
  { id: 'core_can', title: 'Ask and say what is possible', ability: 'Use pouvoir for help and permission.', phrases: ['Je peux … ?', 'Vous pouvez m’aider ?'], meaning: 'Can I …? / Can you help me?', kind: 'retrieve', prerequisites: ['repeat'], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 150 },
  { id: 'questions', title: 'Ask core questions', ability: 'Use where, when, how much and why.', phrases: ['Où est … ?', 'Quand ?', 'Combien ça coûte ?', 'Pourquoi ?'], meaning: 'Where is …? / When? / How much is it? / Why?', kind: 'retrieve', prerequisites: ['greet'], unlockLeverage: 9, realWorldFrequency: 10, estimatedSeconds: 180 },
  { id: 'likes', title: 'Talk about interests', ability: 'Say what you like and ask a follow-up.', phrases: ["J’aime …", "Qu’est-ce que vous aimez ?", 'Moi aussi.'], meaning: 'I like … / What do you like? / Me too.', kind: 'respond', prerequisites: ['name'], unlockLeverage: 8, realWorldFrequency: 9, estimatedSeconds: 180 },
  { id: 'follow_up', title: 'Keep someone talking', ability: 'Ask a natural follow-up instead of ending the exchange.', phrases: ['Ah bon ?', 'Et après ?', 'Depuis combien de temps ?'], meaning: 'Really? / And then? / For how long?', kind: 'respond', prerequisites: ['questions', 'likes'], unlockLeverage: 9, realWorldFrequency: 9, estimatedSeconds: 180 },
  { id: 'cafe', title: 'Order at a café', ability: 'Order, modify and pay politely.', phrases: ["Je voudrais un café, s’il vous plaît.", "L’addition, s’il vous plaît.", 'Sur place ou à emporter ?'], meaning: 'I would like a coffee. / The bill, please. / Here or takeaway?', kind: 'real_world', prerequisites: ['core_want', 'questions'], unlockLeverage: 9, realWorldFrequency: 9, estimatedSeconds: 240 },
  { id: 'directions', title: 'Ask for directions', ability: 'Ask where something is and understand basic direction words.', phrases: ['Excusez-moi, où est la gare ?', 'à gauche', 'à droite', 'tout droit'], meaning: 'Excuse me, where is the station? / left / right / straight ahead', kind: 'real_world', prerequisites: ['questions', 'repeat'], unlockLeverage: 8, realWorldFrequency: 8, estimatedSeconds: 240 },
  { id: 'clarify', title: 'Check understanding', ability: 'Confirm what you think you heard.', phrases: ['Si j’ai bien compris …', 'Vous voulez dire que … ?'], meaning: 'If I understood correctly … / Do you mean that …?', kind: 'repair', prerequisites: ['meaning', 'core_can'], unlockLeverage: 9, realWorldFrequency: 8, estimatedSeconds: 180 },
  { id: 'weather', title: 'Make small talk', ability: 'Start with weather and move to a personal question.', phrases: ['Il fait beau aujourd’hui.', 'Quel temps fait-il chez vous ?'], meaning: 'The weather is nice today. / What is the weather like where you live?', kind: 'respond', prerequisites: ['origin', 'questions'], unlockLeverage: 6, realWorldFrequency: 7, estimatedSeconds: 180 },
  { id: 'past', title: 'Say what you did', ability: 'Give a simple account of yesterday.', phrases: ["Hier, j’ai …", 'Ensuite …', 'C’était …'], meaning: 'Yesterday, I … / Then … / It was …', kind: 'fluency', prerequisites: ['likes', 'follow_up'], unlockLeverage: 8, realWorldFrequency: 8, estimatedSeconds: 300 },
  { id: 'future', title: 'Say what you will do', ability: 'Describe a near-future plan.', phrases: ['Demain, je vais …', "J’ai l’intention de …", 'Peut-être …'], meaning: 'Tomorrow, I am going to … / I intend to … / Maybe …', kind: 'fluency', prerequisites: ['likes', 'follow_up'], unlockLeverage: 8, realWorldFrequency: 8, estimatedSeconds: 300 },
  { id: 'travel_help', title: 'Handle a travel problem', ability: 'Explain a problem and request practical help.', phrases: ["J’ai un problème avec ma réservation.", "J’ai perdu …", 'Qu’est-ce que je dois faire ?'], meaning: 'I have a problem with my booking. / I lost … / What should I do?', kind: 'real_world', prerequisites: ['core_can', 'clarify', 'directions'], unlockLeverage: 9, realWorldFrequency: 7, estimatedSeconds: 360 },
  { id: 'circumlocution', title: 'Explain an unknown word', ability: 'Describe around a missing word instead of freezing.', phrases: ["C’est une chose qu’on utilise pour …", "C’est comme … mais …"], meaning: 'It is a thing used to … / It is like … but …', kind: 'repair', prerequisites: ['clarify', 'likes'], unlockLeverage: 10, realWorldFrequency: 8, estimatedSeconds: 300 },
  { id: 'conversation_5', title: 'Hold a five-minute conversation', ability: 'Introduce, explore a familiar topic, repair trouble and close naturally.', phrases: ['Alors …', 'Par contre …', 'À bientôt !'], meaning: 'So … / On the other hand … / See you soon!', kind: 'fluency', prerequisites: ['follow_up', 'clarify', 'past', 'future'], unlockLeverage: 10, realWorldFrequency: 10, estimatedSeconds: 600 },
];

export const FRENCH_MILESTONES: LearningMilestone[] = [
  { id: 'intro_90', level: 'A1', title: '90-second first meeting', realLifeTest: 'Introduce yourself, ask two questions, and use a repair phrase without switching to English.', targetMinutes: 2, requiredSkillIds: ['greet', 'name', 'origin', 'repeat', 'slower'] },
  { id: 'cafe_live', level: 'A1', title: 'Complete a café exchange', realLifeTest: 'Order, answer a follow-up, change one detail, and pay entirely in French.', targetMinutes: 3, requiredSkillIds: ['core_want', 'questions', 'cafe', 'repeat'] },
  { id: 'directions_live', level: 'A2', title: 'Find your way', realLifeTest: 'Ask for directions, confirm what you heard, and repeat the route back.', targetMinutes: 4, requiredSkillIds: ['directions', 'clarify', 'slower'] },
  { id: 'conversation_5', level: 'A2', title: 'Five-minute familiar conversation', realLifeTest: 'Hold a spontaneous conversation with three follow-ups and recover from one unknown word.', targetMinutes: 5, requiredSkillIds: ['likes', 'follow_up', 'clarify', 'circumlocution'] },
  { id: 'story_plan', level: 'B1', title: 'Yesterday and tomorrow', realLifeTest: 'Tell a short past story, explain a future plan, and answer unprepared follow-ups.', targetMinutes: 7, requiredSkillIds: ['past', 'future', 'conversation_5'] },
  { id: 'travel_problem', level: 'B1', title: 'Solve a travel problem', realLifeTest: 'Explain a booking or transport problem, clarify the response, and agree on a solution.', targetMinutes: 8, requiredSkillIds: ['travel_help', 'circumlocution', 'conversation_5'] },
];

export type FrenchSkillStage = {
  id: string;
  number: number;
  level: 'A1' | 'A2' | 'B1';
  title: string;
  outcome: string;
  skillIds: string[];
};

export const FRENCH_SKILL_STAGES: FrenchSkillStage[] = [
  { id: 'entry', number: 1, level: 'A1', title: 'Enter the conversation', outcome: 'Start speaking immediately instead of waiting to feel ready.', skillIds: ['greet'] },
  { id: 'survival', number: 2, level: 'A1', title: 'Build your survival kit', outcome: 'Introduce yourself, request what you need, and ask the questions that unlock everything else.', skillIds: ['name', 'repeat', 'core_want', 'questions'] },
  { id: 'control', number: 3, level: 'A1', title: 'Control the exchange', outcome: 'Slow people down, repair gaps, and move beyond memorised introductions.', skillIds: ['slower', 'meaning', 'origin', 'core_can', 'likes'] },
  { id: 'situations', number: 4, level: 'A2', title: 'Operate in real situations', outcome: 'Keep people talking and complete common social and travel interactions.', skillIds: ['follow_up', 'cafe', 'directions', 'clarify', 'weather'] },
  { id: 'range', number: 5, level: 'B1', title: 'Create conversational range', outcome: 'Talk across time, handle problems, and speak around words you do not know.', skillIds: ['past', 'future', 'travel_help', 'circumlocution'] },
  { id: 'independent', number: 6, level: 'B1', title: 'Speak independently', outcome: 'Combine every branch into a sustained unprepared conversation.', skillIds: ['conversation_5'] },
];

export const FRENCH_SKILLS_BY_ID = new Map(FRENCH_SKILLS.map((skill) => [skill.id, skill]));

export function skillsForStage(stage: FrenchSkillStage): FrenchSkill[] {
  return stage.skillIds.flatMap((id) => {
    const skill = FRENCH_SKILLS_BY_ID.get(id);
    return skill ? [skill] : [];
  });
}

export function unlockedSkillIds(skillId: string): string[] {
  return FRENCH_SKILLS.filter((skill) => skill.prerequisites.includes(skillId)).map((skill) => skill.id);
}
