(function () {
    const DEFAULT_STATE = {
        answers: {},
        compatibilityScore: 0,
        currentQuestion: 0,
        personalityTraits: [],
        rejectionReason: null,
        stage: 'landing',
        toneLevel: 2
    };

    function create() {
        const state = {
            ...DEFAULT_STATE,
            answers: {}
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
            get() {
                return {
                    ...state,
                    answers: { ...state.answers },
                    personalityTraits: [...state.personalityTraits]
                };
            },
            reset,
            setAnswer(questionId, value) {
                state.answers[questionId] = value;
            },
            setCompatibilityScore(score) {
                state.compatibilityScore = score;
            },
            setCurrentQuestion(index) {
                state.currentQuestion = index;
            },
            setPersonalityTraits(traits) {
                state.personalityTraits = Array.isArray(traits) ? traits : [];
            },
            setRejectionReason(reason) {
                state.rejectionReason = reason;
            },
            setStage(stage) {
                state.stage = stage;
            },
            setToneLevel(level) {
                state.toneLevel = level;
            }
        };
    }

    window.JGDateMeState = {
        create
    };
}());
