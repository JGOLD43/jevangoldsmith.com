// Dateme funnel state machine — funnel position, answers, derived
// personality traits + compatibility score, rejection reason. Plus
// dateMeFlow which advances the state through stages based on answers.
// View module reads, view+entry mutate via the exported APIs.

import { stage1Questions, stage2Questions, personalityMap } from './dateme-content';

type Answers = Record<string, string>;
type DateState = {
    answers: Answers;
    compatibilityScore: number;
    currentQuestion: number;
    personalityTraits: string[];
    rejectionReason: string | null;
    stage: string;
    toneLevel: number;
};

export const dateMeState = (function createState() {
    const state: DateState = {
        answers: {},
        compatibilityScore: 0,
        currentQuestion: 0,
        personalityTraits: [],
        rejectionReason: null,
        stage: 'landing',
        toneLevel: 2
    };
    function reset() {
        state.answers = {};
        state.compatibilityScore = 0;
        state.currentQuestion = 0;
        state.personalityTraits = [];
        state.rejectionReason = null;
        state.stage = 'landing';
        state.toneLevel = 2;
    }
    return {
        get(): DateState {
            return {
                ...state,
                answers: { ...state.answers },
                personalityTraits: [...state.personalityTraits]
            };
        },
        reset,
        setAnswer(questionId: string, value: string) { state.answers[questionId] = value; },
        setCompatibilityScore(score: number) { state.compatibilityScore = score; },
        setCurrentQuestion(index: number) { state.currentQuestion = index; },
        setPersonalityTraits(traits: string[]) { state.personalityTraits = Array.isArray(traits) ? traits : []; },
        setRejectionReason(reason: string | null) { state.rejectionReason = reason; },
        setStage(stage: string) { state.stage = stage; },
        setToneLevel(level: number) { state.toneLevel = level; }
    };
}());


export const dateMeFlow = (function createFlow() {
    function getQuestionsForStage(stage = dateMeState.get().stage) {
        return stage === 'stage1' ? stage1Questions : stage2Questions;
    }
    function getCurrentQuestionData() {
        const snapshot = dateMeState.get();
        const questions = getQuestionsForStage(snapshot.stage);
        return questions[snapshot.currentQuestion] || null;
    }
    function startStage1() {
        dateMeState.setStage('stage1');
        dateMeState.setCurrentQuestion(0);
    }
    function startStage2() {
        dateMeState.setStage('stage2');
        dateMeState.setCurrentQuestion(0);
    }
    function nextQuestion() {
        const snapshot = dateMeState.get();
        const questions = getQuestionsForStage(snapshot.stage);
        if (snapshot.currentQuestion < questions.length - 1) {
            dateMeState.setCurrentQuestion(snapshot.currentQuestion + 1);
            return 'question';
        }
        return snapshot.stage === 'stage1' ? 'transition' : 'results';
    }
    function calculatePersonality() {
        const snapshot = dateMeState.get();
        const traits = [];
        let score = 70;
        if (snapshot.answers.pineapple) {
            const pineapple = personalityMap.pineapple[snapshot.answers.pineapple];
            if (pineapple) traits.push(pineapple.trait);
        }
        if (snapshot.answers.loveLanguage) {
            const loveLanguage = personalityMap.loveLanguage[snapshot.answers.loveLanguage];
            if (loveLanguage) {
                traits.push(loveLanguage.trait);
                score += loveLanguage.weight;
            }
        }
        if (snapshot.answers.social) {
            const social = personalityMap.social[snapshot.answers.social];
            if (social) {
                traits.push(social.trait);
                score += social.weight;
            }
        }
        if (snapshot.answers.sunday === 'spontaneous' || snapshot.answers.sunday === 'brunch') {
            traits.push('Fun-seeker');
            score += 5;
        }
        if (snapshot.answers.fiveYears === 'entrepreneur' || snapshot.answers.fiveYears === 'creative') {
            traits.push('Ambitious');
            score += 5;
        }
        score = Math.min(98, Math.max(72, score));
        const summaries = [
            `You're the kind of person who makes ordinary moments interesting. ${traits.includes('Adventurous') ? "Your sense of adventure is contagious." : "You know how to find depth in simplicity."}`,
            `I get the sense you don't do things halfway. ${traits.includes('Ambitious') ? "That drive is attractive." : "You're intentional about what matters."}`,
            `There's something refreshingly genuine about your answers. ${traits.includes('Deep connector') ? "Deep conversations over small talk—I'm here for it." : "You seem like someone who keeps life interesting."}`
        ];
        const result = {
            score,
            summary: summaries[Math.floor(Math.random() * summaries.length)],
            traits: traits.slice(0, 4)
        };
        dateMeState.setCompatibilityScore(result.score);
        dateMeState.setPersonalityTraits(result.traits);
        return result;
    }
    function getAllowedQuizAnswers() {
        const snapshot = dateMeState.get();
        const allowedQuizFields = new Set(['pineapple', 'humor', 'spontaneous', 'values', 'loveLanguage', 'social']);
        return Object.entries(snapshot.answers).filter(([key]) => allowedQuizFields.has(key));
    }
    return {
        calculatePersonality,
        getAllowedQuizAnswers,
        getCurrentQuestionData,
        getQuestionsForStage,
        nextQuestion,
        startStage1,
        startStage2
    };
}());
