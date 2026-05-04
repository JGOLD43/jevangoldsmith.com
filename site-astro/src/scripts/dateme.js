// Dateme funnel orchestrator. Inlines js/dateme-content.js,
// js/dateme-state.js, js/dateme-flow.js, js/dateme-view.js, and the
// empty stub js/dateme-events.js. The shards only ever exposed
// window.JGDateMe* globals consumed by this file, so collapsing them
// drops 5 globals + 5 script tags + ~80 LOC of plumbing.

// --- content ---
const toneContent = {
    0: {
        label: "Playing it cool",
        title: "If you want to, no pressure",
        subtitle: "I mean, I'm pretty busy anyway.",
        cta: "Sure, why not →",
        guarantee: "I'll probably respond. Eventually.",
        noteLabel: "Say something if you feel like it",
        notePlaceholder: "Or don't. I'm not your boss."
    },
    1: {
        label: "Mildly interested",
        title: "I'd be down to chat",
        subtitle: "You seem cool. Let's see what happens.",
        cta: "Let's do this →",
        guarantee: "I'll text you within 48 hours.",
        noteLabel: "Tell me something interesting",
        notePlaceholder: "Impress me. Or don't. But do."
    },
    2: {
        label: "Genuinely interested",
        title: "I actually want to hear from you",
        subtitle: "You made it this far. I'm curious about you.",
        cta: "Send it to Jevan →",
        guarantee: "I respond to everyone. Within 24 hours. Personally.",
        noteLabel: "Say something that'll make me smile",
        notePlaceholder: "A joke, a question, literally anything..."
    },
    3: {
        label: "Very interested",
        title: "Okay I'm kind of excited about this",
        subtitle: "Your answers were actually really good??",
        cta: "PLEASE send this →",
        guarantee: "I will 100% text you TODAY. I promise. Pinky swear.",
        noteLabel: "Quick, say something before I overthink this",
        notePlaceholder: "Anything. I'm already composing my first text to you."
    },
    4: {
        label: "Completely unhinged",
        title: "I'M BEGGING YOU",
        subtitle: "I have SO many dad jokes saved up. Please.",
        cta: "🚨 SEND IMMEDIATELY 🚨",
        guarantee: "I will text you in the next 30 SECONDS. I'm already typing. This is not a drill.",
        noteLabel: "SAY LITERALLY ANYTHING",
        notePlaceholder: "JUST HIT SEND I'M LOSING MY MIND OVER HERE"
    }
};

const personalityMap = {
    pineapple: {
        yes: { trait: 'Adventurous', desc: 'You embrace the unconventional' },
        no: { trait: 'Traditional', desc: 'You know what you like' },
        drunk: { trait: 'Flexible', desc: 'Context matters to you' },
        never: { trait: 'Mysterious', desc: 'Full of surprises' }
    },
    loveLanguage: {
        words: { trait: 'Expressive', weight: 15 },
        touch: { trait: 'Affectionate', weight: 15 },
        time: { trait: 'Present', weight: 20 },
        gifts: { trait: 'Thoughtful', weight: 10 },
        service: { trait: 'Caring', weight: 15 }
    },
    social: {
        extrovert: { trait: 'Life of the party', weight: 10 },
        introvert: { trait: 'Deep connector', weight: 15 },
        ambivert: { trait: 'Adaptable', weight: 20 },
        selective: { trait: 'Intentional', weight: 15 }
    }
};

const stage1Questions = [
    {
        id: 'pineapple',
        question: "Okay, let's settle this once and for all...",
        subtext: "Your answer says more about you than you think",
        type: 'choice',
        options: [
            { text: "Pineapple on pizza? YES. Fight me.", value: 'yes', pass: true, reaction: "Bold. I respect it." },
            { text: "Pineapple on pizza is a crime", value: 'no', pass: true, reaction: "A purist. Classic." },
            { text: "Only after 2am or 3+ drinks", value: 'drunk', pass: true, reaction: "Ah, situational ethics." },
            { text: "Wait, is pizza the flat bread thing?", value: 'never', pass: true, reaction: "...interesting." }
        ],
        failMessage: null
    },
    {
        id: 'age',
        question: "Quick logistics check",
        subtext: "No judgment, just math",
        type: 'choice',
        options: [
            { text: "I'm 21-24", value: '21-24', pass: true, reaction: "Perfect." },
            { text: "I'm 25-28", value: '25-28', pass: true, reaction: "Perfect." },
            { text: "I'm under 21", value: 'under21', pass: false },
            { text: "I'm 29+", value: '29+', pass: false }
        ],
        failMessage: {
            title: "Timing is everything",
            text: "You seem genuinely cool, but I'm looking for someone at a similar life stage right now. Nothing personal—just where I'm at.",
            subtext: "The universe has other plans for us, and that's okay.",
            emoji: "🌙",
            buttons: [
                { text: "I get it. Show me your essays", link: "essays.html", primary: true },
                { text: "Let me try again", action: 'restart' }
            ]
        }
    },
    {
        id: 'humor',
        question: "A massive spider appears in your apartment. Your move?",
        subtext: "There are wrong answers here",
        type: 'choice',
        options: [
            { text: "Burn the building down. Insurance will understand.", value: 'burn', pass: true, reaction: "Proportional response." },
            { text: "Name it Gerald. We live together now.", value: 'pet', pass: true, reaction: "Chaotic energy. I like it." },
            { text: "Scream. Dramatically. Until someone saves me.", value: 'scream', pass: true, reaction: "Valid. Very valid." },
            { text: "Calmly escort it outside. It's just a spider.", value: 'calm', pass: false }
        ],
        failMessage: {
            title: "About that spider...",
            text: "Look, I need someone who can appreciate that a spider in the apartment is basically a home invasion. Your calmness concerns me.",
            subtext: "We might be too different on the things that matter most (spiders).",
            emoji: "🕷️",
            buttons: [
                { text: "Here's a song to soften the blow", link: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", primary: true, external: true },
                { text: "Fine, I'll pretend to be scared", action: 'restart' }
            ]
        }
    },
    {
        id: 'spontaneous',
        question: "It's 2am. I text: 'Found the best taco truck. You in?'",
        subtext: "This is a test",
        type: 'choice',
        options: [
            { text: "Already putting on pants. Send location.", value: 'yes', pass: true, reaction: "This is the energy I need." },
            { text: "I'm asleep but... fine. For tacos.", value: 'reluctant', pass: true, reaction: "The 'fine' sold me." },
            { text: "Screenshot this. I'll meet you tomorrow.", value: 'tomorrow', pass: true, reaction: "Practical. I can work with that." },
            { text: "Why are you texting me at 2am?", value: 'no', pass: false }
        ],
        failMessage: {
            title: "The tacos were incredible, btw",
            text: "I understand boundaries. I respect sleep schedules. But life's best moments happen at 2am with questionable food decisions.",
            subtext: "We might just be on different wavelengths, and that's okay.",
            emoji: "🌮",
            buttons: [
                { text: "You're right, I'm boring", action: 'restart' },
                { text: "I stand by my sleep schedule", link: "index.html", primary: true }
            ]
        }
    },
    {
        id: 'values',
        question: "Honestly, what matters most in a partner?",
        subtext: "Pick the one that's most true",
        type: 'choice',
        options: [
            { text: "Making me laugh so hard I forget my problems", value: 'humor', pass: true, reaction: "Same. 100% same." },
            { text: "Having goals and actually chasing them", value: 'ambition', pass: true, reaction: "Drive is attractive." },
            { text: "Being genuinely kind to strangers", value: 'kindness', pass: true, reaction: "The real green flag." },
            { text: "Let's be real—financial stability", value: 'money', pass: false }
        ],
        failMessage: {
            title: "Plot twist incoming",
            text: "I spent my rent money on this website. Twice. I'm rich in enthusiasm and dad jokes, but my bank account tells a different story.",
            subtext: "We want different things, and I respect that.",
            emoji: "💸",
            buttons: [
                { text: "Okay that's actually funny", action: 'restart' },
                { text: "Best of luck out there", link: "index.html", primary: true }
            ]
        }
    }
];

const stage2Questions = [
    {
        id: 'loveLanguage',
        question: "How do you know someone really loves you?",
        subtext: "No wrong answers now—I just want to understand you",
        type: 'choice',
        options: [
            { text: "They tell me. Often. With words.", value: 'words' },
            { text: "They're physically close. Holding hands, hugs, all of it.", value: 'touch' },
            { text: "They give me their undivided attention.", value: 'time' },
            { text: "They remember the little things and surprise me.", value: 'gifts' },
            { text: "They do things for me without being asked.", value: 'service' }
        ]
    },
    {
        id: 'sunday',
        question: "Paint me a picture of your ideal Sunday",
        subtext: "No judgment—unless you say 'productivity'",
        type: 'choice',
        options: [
            { text: "Brunch that accidentally becomes dinner", value: 'brunch' },
            { text: "Gym, farmers market, pretending I'm in a movie", value: 'active' },
            { text: "Absolutely nothing until at least 2pm", value: 'lazy' },
            { text: "Some random adventure I haven't planned yet", value: 'spontaneous' },
            { text: "Coffee, a book, and pretending the world doesn't exist", value: 'cozy' }
        ]
    },
    {
        id: 'controversial',
        question: "Give me your hottest take",
        subtext: "The more controversial, the more I'll like you",
        type: 'text',
        placeholder: "Pineapple was just the warm-up...",
        maxLength: 140
    },
    {
        id: 'fiveYears',
        question: "In 5 years, where does your life look?",
        subtext: "Dream big or keep it real—your call",
        type: 'choice',
        options: [
            { text: "Running something I built myself", value: 'entrepreneur' },
            { text: "Leading a team and making moves", value: 'corporate' },
            { text: "Creating things that didn't exist before", value: 'creative' },
            { text: "Somewhere with better weather than here", value: 'abroad' },
            { text: "Figuring it out as I go (the honest answer)", value: 'uncertain' }
        ]
    },
    {
        id: 'dealbreaker',
        question: "What's a subtle red flag most people miss?",
        subtext: "Teach me something",
        type: 'text',
        placeholder: "The wisdom I didn't know I needed...",
        maxLength: 140
    },
    {
        id: 'social',
        question: "At a party, you're most likely to be...",
        subtext: "Be honest—I'll find out eventually",
        type: 'choice',
        options: [
            { text: "In the center, probably telling a story", value: 'extrovert' },
            { text: "Having a deep conversation in the corner", value: 'introvert' },
            { text: "Depends entirely on my mood that day", value: 'ambivert' },
            { text: "Leaving early but making it count while I'm there", value: 'selective' }
        ]
    },
    {
        id: 'kids',
        question: "Kids? (Someday. Not like, next week.)",
        subtext: "There's no wrong answer here either",
        type: 'choice',
        options: [
            { text: "Yes—I want the chaos", value: 'yes' },
            { text: "Maybe? Ask me in 5 years", value: 'maybe' },
            { text: "Probably not my path", value: 'probably_not' },
            { text: "Hard no. I am the fun aunt/uncle.", value: 'no' }
        ]
    },
    {
        id: 'zodiac',
        question: "What's your sign? (I have to ask)",
        subtext: "Don't worry—I won't actually judge you by it. Much.",
        type: 'choice',
        options: [
            { text: "Aries ♈", value: 'aries' },
            { text: "Taurus ♉", value: 'taurus' },
            { text: "Gemini ♊", value: 'gemini' },
            { text: "Cancer ♋", value: 'cancer' },
            { text: "Leo ♌", value: 'leo' },
            { text: "Virgo ♍", value: 'virgo' },
            { text: "Libra ♎", value: 'libra' },
            { text: "Scorpio ♏", value: 'scorpio' },
            { text: "Sagittarius ♐", value: 'sagittarius' },
            { text: "Capricorn ♑", value: 'capricorn' },
            { text: "Aquarius ♒", value: 'aquarius' },
            { text: "Pisces ♓", value: 'pisces' },
            { text: "I think astrology is nonsense", value: 'skeptic' }
        ]
    }
];

// --- state ---
const dateMeState = (function createState() {
    const state = {
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
        get() {
            return {
                ...state,
                answers: { ...state.answers },
                personalityTraits: [...state.personalityTraits]
            };
        },
        reset,
        setAnswer(questionId, value) { state.answers[questionId] = value; },
        setCompatibilityScore(score) { state.compatibilityScore = score; },
        setCurrentQuestion(index) { state.currentQuestion = index; },
        setPersonalityTraits(traits) { state.personalityTraits = Array.isArray(traits) ? traits : []; },
        setRejectionReason(reason) { state.rejectionReason = reason; },
        setStage(stage) { state.stage = stage; },
        setToneLevel(level) { state.toneLevel = level; }
    };
}());

// --- flow ---
const dateMeFlow = (function createFlow() {
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

// --- view helpers ---
function animateIn(container) {
    const screen = container?.querySelector('.funnel-screen');
    if (!screen) return;
    requestAnimationFrame(() => {
        screen.classList.add('funnel-animate-in');
    });
}

function attachQuestionHandlers({ onSubmitTextAnswer }) {
    const textarea = document.getElementById('text-answer');
    const counter = document.getElementById('char-count');
    if (!textarea || !counter) return;
    textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });
    textarea.focus();
    textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmitTextAnswer();
        }
    });
}

function attachContactHandlers() {
    const textarea = document.getElementById('note');
    const counter = document.getElementById('note-char-count');
    if (textarea && counter) {
        textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });
    }
    document.getElementById('name')?.focus();
}

function renderInto(container, html, afterRender = null) {
    container.innerHTML = html;
    afterRender?.();
    animateIn(container);
}

// --- orchestrator ---
let funnelContainer;

function currentState() { return dateMeState.get(); }

function renderLanding() {
    dateMeState.reset();
    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-landing">
            <div class="funnel-content">
                <div class="funnel-badge">Only 23% make it through</div>
                <h1 class="funnel-title">Think You're My Type?</h1>
                <p class="funnel-subtitle">13 questions. 4 minutes. Zero awkward small talk.</p>
                <div class="funnel-preview-card">
                    <div class="preview-header"><span class="preview-label">Quick preview of the guy behind this</span></div>
                    <div class="preview-facts">
                        <div class="preview-fact"><span class="fact-emoji">🍕</span><span class="fact-text">Pro-pineapple (controversial, I know)</span></div>
                        <div class="preview-fact"><span class="fact-emoji">📚</span><span class="fact-text">Reads more books than is socially acceptable</span></div>
                        <div class="preview-fact"><span class="fact-emoji">🌮</span><span class="fact-text">Will 100% text you about tacos at 2am</span></div>
                        <div class="preview-fact"><span class="fact-emoji">😂</span><span class="fact-text">Dad joke enthusiast (you've been warned)</span></div>
                    </div>
                    <div class="preview-footer"><span>Finance brain. Creative soul. Probably overthinking this bio right now.</span></div>
                </div>
                <button class="funnel-cta" data-action="startStage1">See if we'd actually click →</button>
                <div class="funnel-offer-stack">
                    <div class="offer-item"><span class="offer-check">✓</span><span>I respond to <strong>everyone</strong> who passes (within 24hrs)</span></div>
                    <div class="offer-item"><span class="offer-check">✓</span><span>Worst case: you get my top date spot recommendations</span></div>
                    <div class="offer-item"><span class="offer-check">✓</span><span>If we don't click, I'll wingman you to my cool single friends</span></div>
                </div>
                <p class="funnel-social-proof">847 people have tried. 194 passed. Several are now in my group chat.</p>
            </div>
        </div>
    `);
}

function renderQuestion() {
    const snapshot = currentState();
    const questionData = dateMeFlow.getCurrentQuestionData();
    const stage1Total = stage1Questions.length;
    const stage2Total = stage2Questions.length;
    const overallCurrent = snapshot.stage === 'stage1'
        ? snapshot.currentQuestion + 1
        : stage1Total + snapshot.currentQuestion + 1;
    const overallTotal = stage1Total + stage2Total;
    const stageName = snapshot.stage === 'stage1' ? 'The Vibe Check' : 'Getting to Know You';
    const stageIcon = snapshot.stage === 'stage1' ? '⚡' : '💫';

    let optionsHtml = '';
    if (questionData.type === 'choice') {
        optionsHtml = questionData.options.map((option) => `
            <button class="funnel-option" data-reaction="${option.reaction || ''}" data-action="selectAnswer" data-action-args="${encodeURIComponent(questionData.id)}|${encodeURIComponent(option.value)}|${encodeURIComponent(String(option.pass !== false))}" data-action-this="true">
                <span class="option-text">${option.text}</span>
            </button>
        `).join('');
    } else {
        optionsHtml = `
            <div class="funnel-text-input">
                <textarea id="text-answer" class="funnel-input funnel-textarea-small" placeholder="${questionData.placeholder || ''}" maxlength="${questionData.maxLength || 200}" rows="3"></textarea>
                <div class="funnel-input-footer">
                    <span class="funnel-char-count"><span id="char-count">0</span>/${questionData.maxLength || 200}</span>
                    <button class="funnel-submit-text" data-action="submitTextAnswer" data-action-args="${encodeURIComponent(questionData.id)}">Continue →</button>
                </div>
            </div>
        `;
    }

    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-question-screen">
            <div class="funnel-progress-wrapper">
                <div class="funnel-stage-indicator"><span class="stage-icon">${stageIcon}</span><span class="stage-name">${stageName}</span></div>
                <div class="funnel-progress-bar"><div class="funnel-progress-fill" style="width: ${(overallCurrent / overallTotal) * 100}%"></div></div>
                <div class="funnel-progress-text">${overallCurrent} of ${overallTotal}</div>
            </div>
            <div class="funnel-content">
                <div class="funnel-question-wrapper">
                    <h2 class="funnel-question">${questionData.question}</h2>
                    ${questionData.subtext ? `<p class="funnel-question-subtext">${questionData.subtext}</p>` : ''}
                </div>
                <div class="funnel-options">${optionsHtml}</div>
            </div>
        </div>
    `, () => {
        if (questionData.type === 'text') {
            attachQuestionHandlers({
                onSubmitTextAnswer: () => submitTextAnswer(questionData.id)
            });
        }
    });
}

function showReaction(text, callback) {
    const reactionEl = document.createElement('div');
    reactionEl.className = 'funnel-reaction';
    reactionEl.innerHTML = `<span>${text}</span>`;
    funnelContainer.querySelector('.funnel-content')?.appendChild(reactionEl);
    setTimeout(() => reactionEl.classList.add('show'), 50);
    setTimeout(() => {
        reactionEl.classList.add('fade-out');
        setTimeout(callback, 300);
    }, 1000);
}

function renderStageTransition() {
    const snapshot = currentState();
    const pineappleAnswer = snapshot.answers.pineapple;
    const pineappleReaction = pineappleAnswer === 'yes'
        ? 'pineapple defender'
        : pineappleAnswer === 'no'
            ? 'pizza purist'
            : 'wild card';

    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-transition">
            <div class="funnel-content">
                <div class="funnel-celebration"><div class="funnel-confetti">🎉</div><div class="funnel-emoji-large">✨</div></div>
                <h2 class="funnel-title">You passed the vibe check!</h2>
                <p class="funnel-subtitle">Only 38% of people make it this far.</p>
                <div class="funnel-insight"><p>Quick read: You're a <strong>${pineappleReaction}</strong> who knows what matters.</p></div>
                <p class="funnel-transition-desc">Now I actually want to know you. 8 more questions, no wrong answers—just honesty.</p>
                <button class="funnel-cta" data-action="startStage2">I'm intrigued. Continue →</button>
                <p class="funnel-reassurance">Almost there. You've got this.</p>
            </div>
        </div>
    `);
}

function renderRejection(failMessage) {
    dateMeState.setStage('rejected');
    const buttonsHtml = failMessage.buttons.map((button) => {
        if (button.action === 'restart') {
            return `<button class="funnel-btn ${button.primary ? 'funnel-btn-primary' : 'funnel-btn-secondary'}" data-action="renderLanding">${button.text}</button>`;
        }
        const external = button.external ? 'target="_blank" rel="noopener"' : '';
        return `<a href="${button.link}" class="funnel-btn ${button.primary ? 'funnel-btn-primary' : 'funnel-btn-secondary'}" ${external}>${button.text}</a>`;
    }).join('');

    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-rejection">
            <div class="funnel-content">
                <div class="funnel-emoji-large">${failMessage.emoji}</div>
                <h2 class="funnel-title">${failMessage.title}</h2>
                <p class="funnel-text">${failMessage.text}</p>
                ${failMessage.subtext ? `<p class="funnel-subtext">${failMessage.subtext}</p>` : ''}
                <div class="funnel-buttons">${buttonsHtml}</div>
                <p class="funnel-rejection-footer">No hard feelings. Seriously. 💙</p>
            </div>
        </div>
    `);
}

function renderResults() {
    dateMeState.setStage('results');
    const insights = dateMeFlow.calculatePersonality();
    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-results">
            <div class="funnel-content">
                <div class="funnel-results-header">
                    <div class="funnel-emoji-large">🎯</div>
                    <h2 class="funnel-title">Here's what I learned about you</h2>
                </div>
                <div class="funnel-personality-card">
                    <div class="personality-score"><div class="score-circle"><span class="score-number">${insights.score}%</span><span class="score-label">match</span></div></div>
                    <div class="personality-traits">
                        <h3>Your vibe:</h3>
                        <div class="trait-tags">${insights.traits.map((trait) => `<span class="trait-tag">${trait}</span>`).join('')}</div>
                    </div>
                    <div class="personality-summary"><p>${insights.summary}</p></div>
                </div>
                <div class="funnel-results-cta">
                    <p class="funnel-results-hook">I'm genuinely curious now. Want to see if there's something here?</p>
                    <button class="funnel-cta" data-action="renderContactForm">Yes, let's connect →</button>
                </div>
            </div>
        </div>
    `);
}

function renderContactForm() {
    dateMeState.setStage('stage3');
    const tone = toneContent[currentState().toneLevel];
    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-contact">
            <div class="funnel-content">
                <div class="funnel-contact-header">
                    <h2 class="funnel-title" id="contact-title">${tone.title}</h2>
                    <p class="funnel-subtitle" id="contact-subtitle">${tone.subtitle}</p>
                </div>
                <div class="tone-slider-container">
                    <label class="tone-slider-label">How much do I want to hear from you?</label>
                    <div class="tone-slider-wrapper">
                        <span class="tone-label-left">Chill</span>
                        <input type="range" id="tone-slider" class="tone-slider" min="0" max="4" value="${currentState().toneLevel}" data-action="updateTone" data-action-event="input" data-action-value="true">
                        <span class="tone-label-right">Desperate</span>
                    </div>
                    <div class="tone-indicator" id="tone-indicator">${tone.label}</div>
                </div>
                <form id="contact-form" class="funnel-form" data-action="submitForm" data-action-event="submit" data-action-eventobj="true">
                    <input type="text" name="_trap" tabindex="-1" autocomplete="off" class="funnel-honeypot" aria-hidden="true">
                    <div class="funnel-form-group">
                        <label for="name">What should I call you?</label>
                        <input type="text" id="name" name="name" required class="funnel-input" placeholder="Your first name" autocomplete="given-name">
                    </div>
                    <div class="funnel-form-group">
                        <label for="phone">Best way to reach you <span class="funnel-required">*</span></label>
                        <input type="tel" id="phone" name="phone" required class="funnel-input" placeholder="Your number (I'll text first)" autocomplete="tel">
                    </div>
                    <div class="funnel-form-row">
                        <div class="funnel-form-group funnel-form-half">
                            <label for="email">Email <span class="funnel-optional">(backup)</span></label>
                            <input type="email" id="email" name="email" class="funnel-input" placeholder="you@email.com" autocomplete="email">
                        </div>
                        <div class="funnel-form-group funnel-form-half">
                            <label for="instagram">Instagram</label>
                            <input type="text" id="instagram" name="instagram" class="funnel-input" placeholder="@handle">
                        </div>
                    </div>
                    <div class="funnel-form-group">
                        <label for="note" id="note-label">${tone.noteLabel}</label>
                        <textarea id="note" name="note" class="funnel-textarea" placeholder="${tone.notePlaceholder}" maxlength="200"></textarea>
                        <div class="funnel-char-count"><span id="note-char-count">0</span>/200</div>
                    </div>
                    <button type="submit" class="funnel-cta funnel-submit" id="submit-btn">${tone.cta}</button>
                    <div class="funnel-guarantee" id="guarantee"><span class="guarantee-icon">🤝</span><span id="guarantee-text">${tone.guarantee}</span></div>
                    <div class="funnel-trust-signals"><span>🔒 Your info stays private</span><span>💬 No weird follow-ups if we don't click</span></div>
                </form>
            </div>
        </div>
    `, () => attachContactHandlers());
}

function renderSuccess() {
    dateMeState.setStage('success');
    const desperateSuccess = currentState().toneLevel === 4;
    renderInto(funnelContainer, `
        <div class="funnel-screen funnel-success">
            <div class="funnel-content">
                <div class="funnel-success-animation"><div class="funnel-emoji-large">${desperateSuccess ? '🎊🎉🎊' : '💌'}</div></div>
                <h2 class="funnel-title">${desperateSuccess ? 'OH THANK GOD YOU HIT SEND' : 'I got your message!'}</h2>
                <p class="funnel-subtitle">${desperateSuccess ? "I'm literally texting you right now. Check your phone. NOW." : "You'll hear from me soon. I'm already curious."}</p>
                <div class="funnel-success-box">
                    <p>While you wait, get to know me better:</p>
                    <div class="funnel-links">
                        <a href="essays.html" class="funnel-link">📝 My Essays</a>
                        <a href="adventures.html" class="funnel-link">🌎 Adventures</a>
                        <a href="books.html" class="funnel-link">📚 What I Read</a>
                        <a href="https://x.com/JevanGoldsmith" target="_blank" class="funnel-link">𝕏 Follow Me</a>
                    </div>
                </div>
                <p class="funnel-success-footer">${desperateSuccess ? 'Check. Your. Phone. 📱' : 'Talk soon ✨'}</p>
            </div>
        </div>
    `);
}

function startStage1() {
    dateMeFlow.startStage1();
    renderQuestion();
}

function startStage2() {
    dateMeFlow.startStage2();
    renderQuestion();
}

function advanceQuestionFlow() {
    const nextView = dateMeFlow.nextQuestion();
    if (nextView === 'question') { renderQuestion(); return; }
    if (nextView === 'transition') { renderStageTransition(); return; }
    renderResults();
}

function selectAnswer(questionId, value, passes, buttonEl) {
    const didPass = passes === true || passes === 'true';
    dateMeState.setAnswer(questionId, value);

    document.querySelectorAll('.funnel-option').forEach((button) => button.classList.remove('selected'));
    buttonEl.classList.add('selected');

    const handleNext = () => {
        if (currentState().stage === 'stage1' && !didPass) {
            const question = stage1Questions.find((entry) => entry.id === questionId);
            renderRejection(question.failMessage);
            return;
        }
        advanceQuestionFlow();
    };

    const reaction = buttonEl.dataset.reaction;
    if (reaction && didPass) {
        showReaction(reaction, handleNext);
        return;
    }
    setTimeout(handleNext, 200);
}

function submitTextAnswer(questionId) {
    const textarea = document.getElementById('text-answer');
    const value = textarea?.value.trim() || '';
    if (value.length < 3) {
        if (textarea) {
            textarea.classList.add('funnel-input-error');
            textarea.placeholder = 'Come on, give me something...';
            setTimeout(() => textarea.classList.remove('funnel-input-error'), 500);
        }
        return;
    }
    dateMeState.setAnswer(questionId, value);
    advanceQuestionFlow();
}

function updateTone(value) {
    const toneLevel = Number.parseInt(value, 10);
    dateMeState.setToneLevel(toneLevel);
    const tone = toneContent[toneLevel];
    document.getElementById('contact-title').textContent = tone.title;
    document.getElementById('contact-subtitle').textContent = tone.subtitle;
    document.getElementById('tone-indicator').textContent = tone.label;
    document.getElementById('note-label').textContent = tone.noteLabel;
    document.getElementById('note').placeholder = tone.notePlaceholder;
    document.getElementById('submit-btn').textContent = tone.cta;
    document.getElementById('guarantee-text').textContent = tone.guarantee;
    document.getElementById('submit-btn').classList.toggle('desperate-shake', toneLevel === 4);
}

function submitForm(event) {
    event.preventDefault();
    const form = document.getElementById('contact-form');
    const trap = form.querySelector('input[name="_trap"]');
    if (trap && trap.value.trim()) return;
    const formData = new FormData(form);
    dateMeFlow.getAllowedQuizAnswers().forEach(([key, value]) => {
        formData.append(`quiz_${key}`, value);
    });
    formData.append('compatibility_score', dateMeFlow.calculatePersonality().score);
    formData.append('tone_level', currentState().toneLevel);

    const submitBtn = form.querySelector('.funnel-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = currentState().toneLevel === 4 ? 'SENDING SENDING SENDING...' : 'Sending...';
    submitBtn.disabled = true;

    fetch('https://formsubmit.co/ajax/821f324c43f7156401c8429b575ab340', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) { renderSuccess(); return; }
            throw new Error('Failed');
        })
        .catch(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            let errorEl = form.querySelector('.funnel-error');
            if (!errorEl) {
                errorEl = document.createElement('p');
                errorEl.className = 'funnel-error';
                form.insertBefore(errorEl, submitBtn);
            }
            errorEl.textContent = 'Something broke. Try again or just DM me @JevanGoldsmith';
        });
}

window.JGActions.register({
    renderContactForm,
    renderLanding,
    selectAnswer,
    startStage1,
    startStage2,
    submitForm,
    submitTextAnswer,
    updateTone
});

function initDatemePage() {
    funnelContainer = document.getElementById('funnel-container');
    renderLanding();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDatemePage, { once: true });
} else {
    initDatemePage();
}
