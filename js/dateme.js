/**
 * Date Me Funnel - Conversion-Optimized Interactive Questionnaire
 * Built with psychology-backed engagement techniques
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
    personalityTraits: []
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
            spotifyLink: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
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
            { text: "Aries ♈ (main character energy)", value: 'aries' },
            { text: "Taurus ♉ (stubborn but loyal)", value: 'taurus' },
            { text: "Gemini ♊ (two for one deal)", value: 'gemini' },
            { text: "Cancer ♋ (emotional in the best way)", value: 'cancer' },
            { text: "Leo ♌ (we get it, you're the star)", value: 'leo' },
            { text: "Virgo ♍ (perfectionist vibes)", value: 'virgo' },
            { text: "Libra ♎ (can't make a decision)", value: 'libra' },
            { text: "Scorpio ♏ (intense and mysterious)", value: 'scorpio' },
            { text: "Sagittarius ♐ (always leaving)", value: 'sagittarius' },
            { text: "Capricorn ♑ (CEO energy)", value: 'capricorn' },
            { text: "Aquarius ♒ (definitely weird)", value: 'aquarius' },
            { text: "Pisces ♓ (living in a fantasy)", value: 'pisces' },
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
// LANDING PAGE - Optimized for Curiosity & Commitment
// ============================================
function renderLanding() {
    state.stage = 'landing';
    state.answers = {};
    state.compatibilityScore = 0;
    state.personalityTraits = [];

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-landing">
            <div class="funnel-content">
                <div class="funnel-badge">Only 23% make it through</div>
                <h1 class="funnel-title">Think You're My Type?</h1>
                <p class="funnel-subtitle">13 questions. 4 minutes. Zero awkward small talk.</p>

                <div class="funnel-value-props">
                    <div class="funnel-prop">
                        <span class="funnel-prop-icon">🎯</span>
                        <span>Actually find out if we'd click</span>
                    </div>
                    <div class="funnel-prop">
                        <span class="funnel-prop-icon">🎭</span>
                        <span>More fun than swiping, I promise</span>
                    </div>
                    <div class="funnel-prop">
                        <span class="funnel-prop-icon">🔒</span>
                        <span>Your info stays private until the end</span>
                    </div>
                </div>

                <button class="funnel-cta" onclick="startStage1()">
                    Let's see if I'm your type →
                </button>

                <p class="funnel-social-proof">847 people have tried. 194 passed. 12 actually texted me back.</p>
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
    const totalQuestions = questions.length;

    // Calculate overall progress
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
        optionsHtml = questionData.options.map((opt, index) => `
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

    // Add selected state
    document.querySelectorAll('.funnel-option').forEach(btn => btn.classList.remove('selected'));
    buttonEl.classList.add('selected');

    // Show reaction if exists
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

    setTimeout(() => {
        reactionEl.classList.add('show');
    }, 50);

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
        setTimeout(() => {
            textarea.classList.remove('funnel-input-error');
        }, 500);
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
// STAGE TRANSITION - Celebrate & Build Anticipation
// ============================================
function renderStageTransition() {
    // Calculate a fun stat
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
// REJECTION SCREENS - Make it Feel Like a Game
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

                <div class="funnel-buttons">
                    ${buttonsHtml}
                </div>

                <p class="funnel-rejection-footer">No hard feelings. Seriously. 💙</p>
            </div>
        </div>
    `;
    animateIn();
}

// ============================================
// RESULTS - Give Before You Ask
// ============================================
function renderResults() {
    // Calculate personality insights
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
    let score = 70; // Base score

    // Add traits based on answers
    if (state.answers.pineapple) {
        const p = personalityMap.pineapple[state.answers.pineapple];
        if (p) traits.push(p.trait);
    }

    if (state.answers.loveLanguage) {
        const ll = personalityMap.loveLanguage[state.answers.loveLanguage];
        if (ll) {
            traits.push(ll.trait);
            score += ll.weight;
        }
    }

    if (state.answers.social) {
        const s = personalityMap.social[state.answers.social];
        if (s) {
            traits.push(s.trait);
            score += s.weight;
        }
    }

    // Add some based on other answers
    if (state.answers.sunday === 'spontaneous' || state.answers.sunday === 'brunch') {
        traits.push('Fun-seeker');
        score += 5;
    }

    if (state.answers.fiveYears === 'entrepreneur' || state.answers.fiveYears === 'creative') {
        traits.push('Ambitious');
        score += 5;
    }

    // Cap and ensure minimum
    score = Math.min(98, Math.max(72, score));

    // Generate summary based on traits
    const summaries = [
        `You're the kind of person who makes ordinary moments interesting. ${traits.includes('Adventurous') ? "Your sense of adventure is contagious." : "You know how to find depth in simplicity."}`,
        `I get the sense you don't do things halfway. ${traits.includes('Ambitious') ? "That drive is attractive." : "You're intentional about what matters."}`,
        `There's something refreshingly genuine about your answers. ${traits.includes('Deep connector') ? "Deep conversations over small talk—I'm here for it." : "You seem like someone who keeps life interesting."}`
    ];

    return {
        score: score,
        traits: traits.slice(0, 4), // Max 4 traits
        summary: summaries[Math.floor(Math.random() * summaries.length)]
    };
}

// ============================================
// CONTACT FORM - Optimized for Completion
// ============================================
function renderContactForm() {
    state.stage = 'stage3';

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-contact">
            <div class="funnel-content">
                <div class="funnel-contact-header">
                    <h2 class="funnel-title">Last step—how do I reach you?</h2>
                    <p class="funnel-subtitle">I actually read every submission. Personally.</p>
                </div>

                <form id="contact-form" class="funnel-form" onsubmit="submitForm(event)">
                    <div class="funnel-form-group">
                        <label for="name">What should I call you?</label>
                        <input type="text" id="name" name="name" required class="funnel-input" placeholder="Your first name" autocomplete="given-name">
                    </div>

                    <div class="funnel-form-group">
                        <label for="phone">Best way to reach you <span class="funnel-required">*</span></label>
                        <input type="tel" id="phone" name="phone" required class="funnel-input" placeholder="Your number (I'll text first)" autocomplete="tel">
                        <span class="funnel-field-hint">Texting > calling. Always.</span>
                    </div>

                    <div class="funnel-form-row">
                        <div class="funnel-form-group funnel-form-half">
                            <label for="email">Email <span class="funnel-optional">(backup)</span></label>
                            <input type="email" id="email" name="email" class="funnel-input" placeholder="you@email.com" autocomplete="email">
                        </div>

                        <div class="funnel-form-group funnel-form-half">
                            <label for="instagram">Instagram <span class="funnel-optional">(so I can see you)</span></label>
                            <input type="text" id="instagram" name="instagram" class="funnel-input" placeholder="@handle">
                        </div>
                    </div>

                    <div class="funnel-form-group">
                        <label for="note">Say something that'll make me smile</label>
                        <textarea id="note" name="note" class="funnel-textarea" placeholder="A joke, a question, literally anything..." maxlength="200"></textarea>
                        <div class="funnel-char-count"><span id="note-char-count">0</span>/200</div>
                    </div>

                    <button type="submit" class="funnel-cta funnel-submit">
                        Send it to Jevan →
                    </button>

                    <div class="funnel-trust-signals">
                        <span>🔒 Your info is private</span>
                        <span>📱 I'll text within 48hrs</span>
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

    // Auto-focus first field
    document.getElementById('name').focus();

    animateIn();
}

function submitForm(event) {
    event.preventDefault();

    const form = document.getElementById('contact-form');
    const formData = new FormData(form);

    // Add quiz answers
    for (const [key, value] of Object.entries(state.answers)) {
        formData.append(`quiz_${key}`, value);
    }

    // Add calculated score
    formData.append('compatibility_score', calculatePersonality().score);

    const submitBtn = form.querySelector('.funnel-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            renderSuccess();
        } else {
            throw new Error('Failed');
        }
    })
    .catch(error => {
        submitBtn.textContent = 'Try again →';
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

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-success">
            <div class="funnel-content">
                <div class="funnel-success-animation">
                    <div class="funnel-emoji-large">💌</div>
                </div>

                <h2 class="funnel-title">I got your message!</h2>
                <p class="funnel-subtitle">You'll hear from me soon. I'm already curious.</p>

                <div class="funnel-success-box">
                    <p>While you wait, get to know me better:</p>
                    <div class="funnel-links">
                        <a href="essays.html" class="funnel-link">📝 My Essays</a>
                        <a href="adventures.html" class="funnel-link">🌎 Adventures</a>
                        <a href="books.html" class="funnel-link">📚 What I Read</a>
                        <a href="https://x.com/JevanGoldsmith" target="_blank" class="funnel-link">𝕏 Follow Me</a>
                    </div>
                </div>

                <p class="funnel-success-footer">Talk soon ✨</p>
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
