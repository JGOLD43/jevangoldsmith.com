(function () {
    function create({ personalityMap, stage1Questions, stage2Questions, state }) {
        function getQuestionsForStage(stage = state.get().stage) {
            return stage === 'stage1' ? stage1Questions : stage2Questions;
        }

        function getCurrentQuestionData() {
            const snapshot = state.get();
            const questions = getQuestionsForStage(snapshot.stage);
            return questions[snapshot.currentQuestion] || null;
        }

        function startStage1() {
            state.setStage('stage1');
            state.setCurrentQuestion(0);
        }

        function startStage2() {
            state.setStage('stage2');
            state.setCurrentQuestion(0);
        }

        function nextQuestion() {
            const snapshot = state.get();
            const questions = getQuestionsForStage(snapshot.stage);

            if (snapshot.currentQuestion < questions.length - 1) {
                state.setCurrentQuestion(snapshot.currentQuestion + 1);
                return 'question';
            }

            return snapshot.stage === 'stage1' ? 'transition' : 'results';
        }

        function calculatePersonality() {
            const snapshot = state.get();
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

            state.setCompatibilityScore(result.score);
            state.setPersonalityTraits(result.traits);
            return result;
        }

        function getAllowedQuizAnswers() {
            const snapshot = state.get();
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
    }

    window.JGDateMeFlow = {
        create
    };
}());
