/**
 * Date Me Funnel - Conversion-Optimized Interactive Questionnaire
 * Built with psychology-backed engagement techniques + Hormozi value equation
 */

// ============================================
// STATE
// ============================================
const state = {
    stage: 'landing',
    currentQuestion: 0,
    answers: {},
    rejectionReason: null,
    compatibilityScore: 0,
    personalityTraits: [],
    toneLevel: 2 // 0-4 scale for the slider
};

// ============================================
// TONE SLIDER CONTENT
// ============================================
const toneContent = {
    0: { // Chill
        label: "Playing it cool",
        title: "If you want to, no pressure",
        subtitle: "I mean, I'm pretty busy anyway.",
        cta: "Sure, why not →",
        guarantee: "I'll probably respond. Eventually.",
        noteLabel: "Say something if you feel like it",
        notePlaceholder: "Or don't. I'm not your boss."
    },
    1: { // Casual
        label: "Mildly interested",
        title: "I'd be down to chat",
        subtitle: "You seem cool. Let's see what happens.",
        cta: "Let's do this →",
        guarantee: "I'll text you within 48 hours.",
        noteLabel: "Tell me something interesting",
        notePlaceholder: "Impress me. Or don't. But do."
    },
    2: { // Genuine (default)
        label: "Genuinely interested",
        title: "I actually want to hear from you",
        subtitle: "You made it this far. I'm curious about you.",
        cta: "Send it to Jevan →",
        guarantee: "I respond to everyone. Within 24 hours. Personally.",
        noteLabel: "Say something that'll make me smile",
        notePlaceholder: "A joke, a question, literally anything..."
    },
    3: { // Eager
        label: "Very interested",
        title: "Okay I'm kind of excited about this",
        subtitle: "Your answers were actually really good??",
        cta: "PLEASE send this →",
        guarantee: "I will 100% text you TODAY. I promise. Pinky swear.",
        noteLabel: "Quick, say something before I overthink this",
        notePlaceholder: "Anything. I'm already composing my first text to you."
    },
    4: { // Desperate
        label: "Completely unhinged",
        title: "I'M BEGGING YOU",
        subtitle: "I have SO many dad jokes saved up. Please.",
        cta: "🚨 SEND IMMEDIATELY 🚨",
        guarantee: "I will text you in the next 30 SECONDS. I'm already typing. This is not a drill.",
        noteLabel: "SAY LITERALLY ANYTHING",
        notePlaceholder: "JUST HIT SEND I'M LOSING MY MIND OVER HERE"
    }
};

// ============================================
// PERSONALITY MAPPING (for results)
// ============================================
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

// ============================================
// QUESTION DATA - Stage 1: The Vibe Check
// ============================================
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

// ============================================
// QUESTION DATA - Stage 2: Getting to Know You
// ============================================
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

// ============================================
// DOM & INITIALIZATION
// ============================================
let funnelContainer;

document.addEventListener('DOMContentLoaded', () => {
    funnelContainer = document.getElementById('funnel-container');
    renderLanding();
});

// ============================================
// LANDING PAGE - With Personality Preview
// ============================================
function renderLanding() {
    state.stage = 'landing';
    state.answers = {};
    state.compatibilityScore = 0;
    state.personalityTraits = [];
    state.toneLevel = 2;

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-landing">
            <div class="funnel-content">
                <div class="funnel-badge">Only 23% make it through</div>
                <h1 class="funnel-title">Think You're My Type?</h1>
                <p class="funnel-subtitle">13 questions. 4 minutes. Zero awkward small talk.</p>

                <!-- Quick Preview of Me -->
                <div class="funnel-preview-card">
                    <div class="preview-header">
                        <span class="preview-label">Quick preview of the guy behind this</span>
                    </div>
                    <div class="preview-facts">
                        <div class="preview-fact">
                            <span class="fact-emoji">🍕</span>
                            <span class="fact-text">Pro-pineapple (controversial, I know)</span>
                        </div>
                        <div class="preview-fact">
                            <span class="fact-emoji">📚</span>
                            <span class="fact-text">Reads more books than is socially acceptable</span>
                        </div>
                        <div class="preview-fact">
                            <span class="fact-emoji">🌮</span>
                            <span class="fact-text">Will 100% text you about tacos at 2am</span>
                        </div>
                        <div class="preview-fact">
                            <span class="fact-emoji">😂</span>
                            <span class="fact-text">Dad joke enthusiast (you've been warned)</span>
                        </div>
                    </div>
                    <div class="preview-footer">
                        <span>Finance brain. Creative soul. Probably overthinking this bio right now.</span>
                    </div>
                </div>

                <button class="funnel-cta" onclick="startStage1()">
                    See if we'd actually click →
                </button>

                <!-- Irresistible Offer Stack -->
                <div class="funnel-offer-stack">
                    <div class="offer-item">
                        <span class="offer-check">✓</span>
                        <span>I respond to <strong>everyone</strong> who passes (within 24hrs)</span>
                    </div>
                    <div class="offer-item">
                        <span class="offer-check">✓</span>
                        <span>Worst case: you get my top date spot recommendations</span>
                    </div>
                    <div class="offer-item">
                        <span class="offer-check">✓</span>
                        <span>If we don't click, I'll wingman you to my cool single friends</span>
                    </div>
                </div>

                <p class="funnel-social-proof">847 people have tried. 194 passed. Several are now in my group chat.</p>
            </div>
        </div>
    `;
    animateIn();
}

// ============================================
// STAGE 1: The Vibe Check
// ============================================
function startStage1() {
    state.stage = 'stage1';
    state.currentQuestion = 0;
    renderQuestion();
}

function renderQuestion() {
    const questions = state.stage === 'stage1' ? stage1Questions : stage2Questions;
    const questionData = questions[state.currentQuestion];

    const stage1Total = stage1Questions.length;
    const stage2Total = stage2Questions.length;
    const overallCurrent = state.stage === 'stage1'
        ? state.currentQuestion + 1
        : stage1Total + state.currentQuestion + 1;
    const overallTotal = stage1Total + stage2Total;

    const stageName = state.stage === 'stage1' ? 'The Vibe Check' : 'Getting to Know You';
    const stageIcon = state.stage === 'stage1' ? '⚡' : '💫';

    let optionsHtml = '';

    if (questionData.type === 'choice') {
        optionsHtml = questionData.options.map((opt) => `
            <button class="funnel-option" data-reaction="${opt.reaction || ''}" onclick="selectAnswer('${questionData.id}', '${opt.value}', ${opt.pass !== false}, this)">
                <span class="option-text">${opt.text}</span>
            </button>
        `).join('');
    } else if (questionData.type === 'text') {
        optionsHtml = `
            <div class="funnel-text-input">
                <textarea
                    id="text-answer"
                    class="funnel-input funnel-textarea-small"
                    placeholder="${questionData.placeholder || ''}"
                    maxlength="${questionData.maxLength || 200}"
                    rows="3"
                ></textarea>
                <div class="funnel-input-footer">
                    <span class="funnel-char-count"><span id="char-count">0</span>/${questionData.maxLength || 200}</span>
                    <button class="funnel-submit-text" onclick="submitTextAnswer('${questionData.id}')">
                        Continue →
                    </button>
                </div>
            </div>
        `;
    }

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-question-screen">
            <div class="funnel-progress-wrapper">
                <div class="funnel-stage-indicator">
                    <span class="stage-icon">${stageIcon}</span>
                    <span class="stage-name">${stageName}</span>
                </div>
                <div class="funnel-progress-bar">
                    <div class="funnel-progress-fill" style="width: ${(overallCurrent / overallTotal) * 100}%"></div>
                </div>
                <div class="funnel-progress-text">${overallCurrent} of ${overallTotal}</div>
            </div>

            <div class="funnel-content">
                <div class="funnel-question-wrapper">
                    <h2 class="funnel-question">${questionData.question}</h2>
                    ${questionData.subtext ? `<p class="funnel-question-subtext">${questionData.subtext}</p>` : ''}
                </div>
                <div class="funnel-options">
                    ${optionsHtml}
                </div>
            </div>
        </div>
    `;

    if (questionData.type === 'text') {
        const textarea = document.getElementById('text-answer');
        const counter = document.getElementById('char-count');

        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });

        textarea.focus();

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitTextAnswer(questionData.id);
            }
        });
    }

    animateIn();
}

function selectAnswer(questionId, value, passes, buttonEl) {
    state.answers[questionId] = value;

    document.querySelectorAll('.funnel-option').forEach(btn => btn.classList.remove('selected'));
    buttonEl.classList.add('selected');

    const reaction = buttonEl.dataset.reaction;
    if (reaction && passes) {
        showReaction(reaction, () => {
            if (state.stage === 'stage1' && !passes) {
                const question = stage1Questions.find(q => q.id === questionId);
                renderRejection(question.failMessage);
            } else {
                nextQuestion();
            }
        });
    } else {
        setTimeout(() => {
            if (state.stage === 'stage1' && !passes) {
                const question = stage1Questions.find(q => q.id === questionId);
                renderRejection(question.failMessage);
            } else {
                nextQuestion();
            }
        }, 200);
    }
}

function showReaction(text, callback) {
    const reactionEl = document.createElement('div');
    reactionEl.className = 'funnel-reaction';
    reactionEl.innerHTML = `<span>${text}</span>`;
    funnelContainer.querySelector('.funnel-content').appendChild(reactionEl);

    setTimeout(() => reactionEl.classList.add('show'), 50);
    setTimeout(() => {
        reactionEl.classList.add('fade-out');
        setTimeout(callback, 300);
    }, 1000);
}

function submitTextAnswer(questionId) {
    const textarea = document.getElementById('text-answer');
    const value = textarea.value.trim();

    if (value.length < 3) {
        textarea.classList.add('funnel-input-error');
        textarea.placeholder = "Come on, give me something...";
        setTimeout(() => textarea.classList.remove('funnel-input-error'), 500);
        return;
    }

    state.answers[questionId] = value;
    nextQuestion();
}

function nextQuestion() {
    const questions = state.stage === 'stage1' ? stage1Questions : stage2Questions;

    if (state.currentQuestion < questions.length - 1) {
        state.currentQuestion++;
        renderQuestion();
    } else {
        if (state.stage === 'stage1') {
            renderStageTransition();
        } else {
            renderResults();
        }
    }
}

// ============================================
// STAGE TRANSITION
// ============================================
function renderStageTransition() {
    const pineappleAnswer = state.answers.pineapple;
    const pineappleReaction = pineappleAnswer === 'yes' ? "pineapple defender" :
                              pineappleAnswer === 'no' ? "pizza purist" : "wild card";

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-transition">
            <div class="funnel-content">
                <div class="funnel-celebration">
                    <div class="funnel-confetti">🎉</div>
                    <div class="funnel-emoji-large">✨</div>
                </div>

                <h2 class="funnel-title">You passed the vibe check!</h2>
                <p class="funnel-subtitle">Only 38% of people make it this far.</p>

                <div class="funnel-insight">
                    <p>Quick read: You're a <strong>${pineappleReaction}</strong> who knows what matters.</p>
                </div>

                <p class="funnel-transition-desc">Now I actually want to know you. 8 more questions, no wrong answers—just honesty.</p>

                <button class="funnel-cta" onclick="startStage2()">
                    I'm intrigued. Continue →
                </button>

                <p class="funnel-reassurance">Almost there. You've got this.</p>
            </div>
        </div>
    `;
    animateIn();
}

function startStage2() {
    state.stage = 'stage2';
    state.currentQuestion = 0;
    renderQuestion();
}

// ============================================
// REJECTION SCREENS
// ============================================
function renderRejection(failMessage) {
    state.stage = 'rejected';

    const buttonsHtml = failMessage.buttons.map(btn => {
        if (btn.action === 'restart') {
            return `<button class="funnel-btn ${btn.primary ? 'funnel-btn-primary' : 'funnel-btn-secondary'}" onclick="renderLanding()">${btn.text}</button>`;
        } else {
            const external = btn.external ? 'target="_blank" rel="noopener"' : '';
            return `<a href="${btn.link}" class="funnel-btn ${btn.primary ? 'funnel-btn-primary' : 'funnel-btn-secondary'}" ${external}>${btn.text}</a>`;
        }
    }).join('');

    funnelContainer.innerHTML = `
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
    `;
    animateIn();
}

// ============================================
// RESULTS
// ============================================
function renderResults() {
    const insights = calculatePersonality();

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-results">
            <div class="funnel-content">
                <div class="funnel-results-header">
                    <div class="funnel-emoji-large">🎯</div>
                    <h2 class="funnel-title">Here's what I learned about you</h2>
                </div>

                <div class="funnel-personality-card">
                    <div class="personality-score">
                        <div class="score-circle">
                            <span class="score-number">${insights.score}%</span>
                            <span class="score-label">match</span>
                        </div>
                    </div>

                    <div class="personality-traits">
                        <h3>Your vibe:</h3>
                        <div class="trait-tags">
                            ${insights.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}
                        </div>
                    </div>

                    <div class="personality-summary">
                        <p>${insights.summary}</p>
                    </div>
                </div>

                <div class="funnel-results-cta">
                    <p class="funnel-results-hook">I'm genuinely curious now. Want to see if there's something here?</p>
                    <button class="funnel-cta" onclick="renderContactForm()">
                        Yes, let's connect →
                    </button>
                </div>
            </div>
        </div>
    `;
    animateIn();
}

function calculatePersonality() {
    const traits = [];
    let score = 70;

    if (state.answers.pineapple) {
        const p = personalityMap.pineapple[state.answers.pineapple];
        if (p) traits.push(p.trait);
    }

    if (state.answers.loveLanguage) {
        const ll = personalityMap.loveLanguage[state.answers.loveLanguage];
        if (ll) { traits.push(ll.trait); score += ll.weight; }
    }

    if (state.answers.social) {
        const s = personalityMap.social[state.answers.social];
        if (s) { traits.push(s.trait); score += s.weight; }
    }

    if (state.answers.sunday === 'spontaneous' || state.answers.sunday === 'brunch') {
        traits.push('Fun-seeker'); score += 5;
    }

    if (state.answers.fiveYears === 'entrepreneur' || state.answers.fiveYears === 'creative') {
        traits.push('Ambitious'); score += 5;
    }

    score = Math.min(98, Math.max(72, score));

    const summaries = [
        `You're the kind of person who makes ordinary moments interesting. ${traits.includes('Adventurous') ? "Your sense of adventure is contagious." : "You know how to find depth in simplicity."}`,
        `I get the sense you don't do things halfway. ${traits.includes('Ambitious') ? "That drive is attractive." : "You're intentional about what matters."}`,
        `There's something refreshingly genuine about your answers. ${traits.includes('Deep connector') ? "Deep conversations over small talk—I'm here for it." : "You seem like someone who keeps life interesting."}`
    ];

    return {
        score: score,
        traits: traits.slice(0, 4),
        summary: summaries[Math.floor(Math.random() * summaries.length)]
    };
}

// ============================================
// CONTACT FORM - With Tone Slider
// ============================================
function renderContactForm() {
    state.stage = 'stage3';
    const tone = toneContent[state.toneLevel];

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-contact">
            <div class="funnel-content">
                <div class="funnel-contact-header">
                    <h2 class="funnel-title" id="contact-title">${tone.title}</h2>
                    <p class="funnel-subtitle" id="contact-subtitle">${tone.subtitle}</p>
                </div>

                <!-- Tone Slider -->
                <div class="tone-slider-container">
                    <label class="tone-slider-label">How much do I want to hear from you?</label>
                    <div class="tone-slider-wrapper">
                        <span class="tone-label-left">Chill</span>
                        <input type="range" id="tone-slider" class="tone-slider" min="0" max="4" value="${state.toneLevel}" oninput="updateTone(this.value)">
                        <span class="tone-label-right">Desperate</span>
                    </div>
                    <div class="tone-indicator" id="tone-indicator">${tone.label}</div>
                </div>

                <form id="contact-form" class="funnel-form" onsubmit="submitForm(event)">
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

                    <button type="submit" class="funnel-cta funnel-submit" id="submit-btn">
                        ${tone.cta}
                    </button>

                    <div class="funnel-guarantee" id="guarantee">
                        <span class="guarantee-icon">🤝</span>
                        <span id="guarantee-text">${tone.guarantee}</span>
                    </div>

                    <div class="funnel-trust-signals">
                        <span>🔒 Your info stays private</span>
                        <span>💬 No weird follow-ups if we don't click</span>
                    </div>
                </form>
            </div>
        </div>
    `;

    const textarea = document.getElementById('note');
    const counter = document.getElementById('note-char-count');
    textarea.addEventListener('input', () => {
        counter.textContent = textarea.value.length;
    });

    document.getElementById('name').focus();
    animateIn();
}

function updateTone(value) {
    state.toneLevel = parseInt(value);
    const tone = toneContent[state.toneLevel];

    // Update all the dynamic content
    document.getElementById('contact-title').textContent = tone.title;
    document.getElementById('contact-subtitle').textContent = tone.subtitle;
    document.getElementById('tone-indicator').textContent = tone.label;
    document.getElementById('note-label').textContent = tone.noteLabel;
    document.getElementById('note').placeholder = tone.notePlaceholder;
    document.getElementById('submit-btn').textContent = tone.cta;
    document.getElementById('guarantee-text').textContent = tone.guarantee;

    // Add shake animation at max desperation
    if (state.toneLevel === 4) {
        document.getElementById('submit-btn').classList.add('desperate-shake');
    } else {
        document.getElementById('submit-btn').classList.remove('desperate-shake');
    }
}

function submitForm(event) {
    event.preventDefault();

    const form = document.getElementById('contact-form');
    const formData = new FormData(form);

    for (const [key, value] of Object.entries(state.answers)) {
        formData.append(`quiz_${key}`, value);
    }

    formData.append('compatibility_score', calculatePersonality().score);
    formData.append('tone_level', state.toneLevel);

    const submitBtn = form.querySelector('.funnel-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = state.toneLevel === 4 ? 'SENDING SENDING SENDING...' : 'Sending...';
    submitBtn.disabled = true;

    fetch('https://formsubmit.co/ajax/821f324c43f7156401c8429b575ab340', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderSuccess();
        } else {
            throw new Error('Failed');
        }
    })
    .catch(error => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

        let errorEl = form.querySelector('.funnel-error');
        if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.className = 'funnel-error';
            form.insertBefore(errorEl, submitBtn);
        }
        errorEl.textContent = "Something broke. Try again or just DM me @JevanGoldsmith";
    });
}

// ============================================
// SUCCESS SCREEN
// ============================================
function renderSuccess() {
    state.stage = 'success';

    const desperateSuccess = state.toneLevel === 4;

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-success">
            <div class="funnel-content">
                <div class="funnel-success-animation">
                    <div class="funnel-emoji-large">${desperateSuccess ? '🎊🎉🎊' : '💌'}</div>
                </div>

                <h2 class="funnel-title">${desperateSuccess ? "OH THANK GOD YOU HIT SEND" : "I got your message!"}</h2>
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

                <p class="funnel-success-footer">${desperateSuccess ? "Check. Your. Phone. 📱" : "Talk soon ✨"}</p>
            </div>
        </div>
    `;
    animateIn();
}

// ============================================
// ANIMATIONS
// ============================================
function animateIn() {
    const screen = funnelContainer.querySelector('.funnel-screen');
    if (screen) {
        requestAnimationFrame(() => {
            screen.classList.add('funnel-animate-in');
        });
    }
}
