/**
 * Date Me Funnel - Interactive Dating Questionnaire
 * A playfully absurd 3-stage qualification funnel
 */

// ============================================
// STATE
// ============================================
const state = {
    stage: 'landing', // landing, stage1, stage2, stage3, rejected, success
    currentQuestion: 0,
    answers: {},
    rejectionReason: null
};

// ============================================
// QUESTION DATA
// ============================================

const stage1Questions = [
    {
        id: 'pineapple',
        question: "First things first: Pineapple on pizza?",
        type: 'choice',
        options: [
            { text: "Absolutely yes", value: 'yes', pass: true },
            { text: "Absolutely not", value: 'no', pass: true },
            { text: "Only if I'm drunk", value: 'drunk', pass: true },
            { text: "I've never had pizza", value: 'never', pass: true }
        ],
        failMessage: null // No wrong answer
    },
    {
        id: 'age',
        question: "How old are you?",
        type: 'choice',
        options: [
            { text: "Under 21", value: 'under21', pass: false },
            { text: "21-24", value: '21-24', pass: true },
            { text: "25-28", value: '25-28', pass: true },
            { text: "29-32", value: '29-32', pass: false },
            { text: "33+", value: '33+', pass: false }
        ],
        failMessage: {
            title: "Age is just a number... but also a filter",
            text: "You seem great, but I'm looking for someone in a specific life stage right now. But hey, the best things in life are worth waiting for... or not. You do you!",
            emoji: "🌟",
            buttons: [
                { text: "Check out my essays instead", link: "essays.html" },
                { text: "Try again", action: 'restart' }
            ]
        }
    },
    {
        id: 'spider',
        question: "A spider appears in your apartment. You:",
        type: 'choice',
        options: [
            { text: "Burn the whole building down", value: 'burn', pass: true },
            { text: "Name it and keep it as a pet", value: 'pet', pass: true },
            { text: "Scream dramatically for help", value: 'scream', pass: true },
            { text: "I would simply leave, unbothered", value: 'leave', pass: false }
        ],
        failMessage: {
            title: "We need to talk about your spider response",
            text: "I need someone who laughs at my terrible jokes. It's not you, it's me. Actually, it's you. But in the nicest way possible!",
            emoji: "💀",
            buttons: [
                { text: "Song to cheer you up", link: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" },
                { text: "Try again?", action: 'restart' }
            ]
        }
    },
    {
        id: 'tacos',
        question: "It's 2am. I text you 'I found the best taco truck.' You:",
        type: 'choice',
        options: [
            { text: "On my way 🏃‍♀️", value: 'omw', pass: true },
            { text: "Send location", value: 'location', pass: true },
            { text: "I'm asleep like a normal person", value: 'asleep', pass: true },
            { text: "That's irresponsible", value: 'irresponsible', pass: false }
        ],
        failMessage: {
            title: "About those tacos...",
            text: "Life's too short to not chase 2am tacos. We might be on different wavelengths, but you're probably right about the sleep thing.",
            emoji: "🌮",
            buttons: [
                { text: "Back to safety", link: "index.html" },
                { text: "Maybe I was too harsh", action: 'restart' }
            ]
        }
    },
    {
        id: 'quality',
        question: "The most important quality in a partner is:",
        type: 'choice',
        options: [
            { text: "Making me laugh until I can't breathe", value: 'humor', pass: true },
            { text: "Being ambitious and driven", value: 'ambition', pass: true },
            { text: "Good communication", value: 'communication', pass: true },
            { text: "Their bank account", value: 'money', pass: false }
        ],
        failMessage: {
            title: "Plot twist",
            text: "I'm actually broke. But rich in dad jokes and questionable life decisions!",
            emoji: "💸",
            buttons: [
                { text: "Fair enough", link: "index.html" },
                { text: "I was kidding!", action: 'restart' }
            ]
        }
    }
];

const stage2Questions = [
    {
        id: 'loveLanguage',
        question: "What's your love language?",
        type: 'choice',
        options: [
            { text: "Words of affirmation", value: 'words' },
            { text: "Physical touch", value: 'touch' },
            { text: "Quality time", value: 'time' },
            { text: "Receiving gifts", value: 'gifts' },
            { text: "Acts of service", value: 'service' }
        ]
    },
    {
        id: 'sunday',
        question: "Ideal Sunday morning:",
        type: 'choice',
        options: [
            { text: "Bottomless brunch", value: 'brunch' },
            { text: "Gym then smoothie", value: 'gym' },
            { text: "Sleep until noon", value: 'sleep' },
            { text: "Farmers market adventure", value: 'farmers' },
            { text: "Spontaneous road trip", value: 'roadtrip' }
        ]
    },
    {
        id: 'controversial',
        question: "Your most controversial opinion:",
        type: 'text',
        placeholder: "Hot takes only...",
        maxLength: 100
    },
    {
        id: 'fiveYears',
        question: "In 5 years you see yourself:",
        type: 'choice',
        options: [
            { text: "Running my own business", value: 'entrepreneur' },
            { text: "Climbing the corporate ladder", value: 'corporate' },
            { text: "Creating art/content full-time", value: 'creative' },
            { text: "Living abroad somewhere warm", value: 'abroad' },
            { text: "Honestly, no clue", value: 'uncertain' }
        ]
    },
    {
        id: 'heart',
        question: "The way to my heart is:",
        type: 'text',
        placeholder: "Be specific...",
        maxLength: 100
    },
    {
        id: 'social',
        question: "Socially, I'm:",
        type: 'choice',
        options: [
            { text: "Full extrovert - I get energy from people", value: 'extrovert' },
            { text: "Introvert who's good at pretending", value: 'introvert' },
            { text: "Ambivert - depends on my mood", value: 'ambivert' },
            { text: "Selectively social", value: 'selective' }
        ]
    },
    {
        id: 'kids',
        question: "Kids someday?",
        type: 'choice',
        options: [
            { text: "Yes, definitely", value: 'yes' },
            { text: "Maybe, we'll see", value: 'maybe' },
            { text: "Probably not", value: 'probablyNot' },
            { text: "No way", value: 'no' }
        ]
    },
    {
        id: 'zodiac',
        question: "What's your sign?",
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
            { text: "I don't believe in this stuff", value: 'skeptic' }
        ]
    }
];

// ============================================
// DOM ELEMENTS
// ============================================
let funnelContainer;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    funnelContainer = document.getElementById('funnel-container');
    renderLanding();
});

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderLanding() {
    state.stage = 'landing';
    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-landing">
            <div class="funnel-content">
                <h1 class="funnel-title">So You Want to Date Me?</h1>
                <p class="funnel-subtitle">Let's see if we're compatible.</p>
                <p class="funnel-description">This takes about 4 minutes and is mostly painless.</p>
                <button class="funnel-cta" onclick="startStage1()">
                    Let's Go →
                </button>
                <p class="funnel-disclaimer">No personal data collected until the end. Promise.</p>
            </div>
        </div>
    `;
    animateIn();
}

function startStage1() {
    state.stage = 'stage1';
    state.currentQuestion = 0;
    state.answers = {};
    renderQuestion();
}

function startStage2() {
    state.stage = 'stage2';
    state.currentQuestion = 0;
    renderQuestion();
}

function renderQuestion() {
    const questions = state.stage === 'stage1' ? stage1Questions : stage2Questions;
    const questionData = questions[state.currentQuestion];
    const totalQuestions = questions.length;
    const stageLabel = state.stage === 'stage1' ? 'Stage 1: The Vibe Check' : 'Stage 2: Getting to Know You';

    let optionsHtml = '';

    if (questionData.type === 'choice') {
        optionsHtml = questionData.options.map((opt, index) => `
            <button class="funnel-option" onclick="selectAnswer('${questionData.id}', '${opt.value}', ${opt.pass !== false})">
                ${opt.text}
            </button>
        `).join('');
    } else if (questionData.type === 'text') {
        optionsHtml = `
            <div class="funnel-text-input">
                <input
                    type="text"
                    id="text-answer"
                    class="funnel-input"
                    placeholder="${questionData.placeholder || ''}"
                    maxlength="${questionData.maxLength || 200}"
                >
                <div class="funnel-char-count">
                    <span id="char-count">0</span>/${questionData.maxLength || 200}
                </div>
                <button class="funnel-submit-text" onclick="submitTextAnswer('${questionData.id}')">
                    Continue →
                </button>
            </div>
        `;
    }

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-question-screen">
            <div class="funnel-progress">
                <div class="funnel-progress-label">${stageLabel}</div>
                <div class="funnel-progress-bar">
                    <div class="funnel-progress-fill" style="width: ${((state.currentQuestion) / totalQuestions) * 100}%"></div>
                </div>
                <div class="funnel-progress-count">Question ${state.currentQuestion + 1} of ${totalQuestions}</div>
            </div>
            <div class="funnel-content">
                <h2 class="funnel-question">${questionData.question}</h2>
                <div class="funnel-options">
                    ${optionsHtml}
                </div>
            </div>
        </div>
    `;

    // Add character counter for text inputs
    if (questionData.type === 'text') {
        const input = document.getElementById('text-answer');
        const counter = document.getElementById('char-count');
        input.addEventListener('input', () => {
            counter.textContent = input.value.length;
        });
        input.focus();

        // Allow Enter key to submit
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                submitTextAnswer(questionData.id);
            }
        });
    }

    animateIn();
}

function selectAnswer(questionId, value, passes) {
    state.answers[questionId] = value;

    if (state.stage === 'stage1' && !passes) {
        // Find the question to get its fail message
        const question = stage1Questions.find(q => q.id === questionId);
        renderRejection(question.failMessage);
        return;
    }

    nextQuestion();
}

function submitTextAnswer(questionId) {
    const input = document.getElementById('text-answer');
    const value = input.value.trim();

    if (value.length === 0) {
        input.classList.add('funnel-input-error');
        setTimeout(() => input.classList.remove('funnel-input-error'), 500);
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
        // Stage complete
        if (state.stage === 'stage1') {
            renderStageTransition();
        } else {
            renderContactForm();
        }
    }
}

function renderStageTransition() {
    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-transition">
            <div class="funnel-content">
                <div class="funnel-emoji">✨</div>
                <h2 class="funnel-title">Nice! You passed the vibe check.</h2>
                <p class="funnel-subtitle">Now let's get to know you a bit better.</p>
                <p class="funnel-description">8 more questions, no wrong answers this time.</p>
                <button class="funnel-cta" onclick="startStage2()">
                    Continue →
                </button>
            </div>
        </div>
    `;
    animateIn();
}

function renderRejection(failMessage) {
    state.stage = 'rejected';

    const buttonsHtml = failMessage.buttons.map(btn => {
        if (btn.action === 'restart') {
            return `<button class="funnel-btn funnel-btn-secondary" onclick="renderLanding()">${btn.text}</button>`;
        } else {
            return `<a href="${btn.link}" class="funnel-btn funnel-btn-primary" ${btn.link.startsWith('http') ? 'target="_blank"' : ''}>${btn.text}</a>`;
        }
    }).join('');

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-rejection">
            <div class="funnel-content">
                <div class="funnel-emoji">${failMessage.emoji}</div>
                <h2 class="funnel-title">${failMessage.title}</h2>
                <p class="funnel-text">${failMessage.text}</p>
                <div class="funnel-buttons">
                    ${buttonsHtml}
                </div>
            </div>
        </div>
    `;
    animateIn();
}

function renderContactForm() {
    state.stage = 'stage3';

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-contact">
            <div class="funnel-content">
                <div class="funnel-emoji">🎉</div>
                <h2 class="funnel-title">You made it!</h2>
                <p class="funnel-subtitle">You're clearly my type of person. Now let's see if there's real chemistry...</p>

                <form id="contact-form" class="funnel-form" onsubmit="submitForm(event)">
                    <div class="funnel-form-group">
                        <label for="name">Your name *</label>
                        <input type="text" id="name" name="name" required class="funnel-input" placeholder="What should I call you?">
                    </div>

                    <div class="funnel-form-group">
                        <label for="phone">Phone number * <span class="funnel-label-hint">(preferred)</span></label>
                        <input type="tel" id="phone" name="phone" required class="funnel-input" placeholder="For texting purposes">
                    </div>

                    <div class="funnel-form-group">
                        <label for="email">Email <span class="funnel-label-hint">(optional backup)</span></label>
                        <input type="email" id="email" name="email" class="funnel-input" placeholder="your@email.com">
                    </div>

                    <div class="funnel-form-group">
                        <label for="instagram">Instagram handle <span class="funnel-label-hint">(optional)</span></label>
                        <input type="text" id="instagram" name="instagram" class="funnel-input" placeholder="@yourhandle">
                    </div>

                    <div class="funnel-form-group">
                        <label for="note">One thing I should know about you</label>
                        <textarea id="note" name="note" class="funnel-textarea" placeholder="Impress me, make me laugh, or just say hi..." maxlength="200"></textarea>
                        <div class="funnel-char-count"><span id="note-char-count">0</span>/200</div>
                    </div>

                    <button type="submit" class="funnel-cta funnel-submit">
                        Send it! →
                    </button>
                </form>
            </div>
        </div>
    `;

    // Add character counter for textarea
    const textarea = document.getElementById('note');
    const counter = document.getElementById('note-char-count');
    textarea.addEventListener('input', () => {
        counter.textContent = textarea.value.length;
    });

    animateIn();
}

function submitForm(event) {
    event.preventDefault();

    const form = document.getElementById('contact-form');
    const formData = new FormData(form);

    // Add quiz answers to form data
    for (const [key, value] of Object.entries(state.answers)) {
        formData.append(`quiz_${key}`, value);
    }

    // Show loading state
    const submitBtn = form.querySelector('.funnel-submit');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    // Submit to Formspree (replace with your endpoint)
    fetch('https://formspree.io/f/YOUR_FORM_ID', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            renderSuccess();
        } else {
            throw new Error('Form submission failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        submitBtn.textContent = 'Try again →';
        submitBtn.disabled = false;

        // Show error message
        const errorMsg = document.createElement('p');
        errorMsg.className = 'funnel-error';
        errorMsg.textContent = 'Something went wrong. Please try again or DM me on X!';
        form.insertBefore(errorMsg, submitBtn);
    });
}

function renderSuccess() {
    state.stage = 'success';

    funnelContainer.innerHTML = `
        <div class="funnel-screen funnel-success">
            <div class="funnel-content">
                <div class="funnel-emoji">💌</div>
                <h2 class="funnel-title">Got it!</h2>
                <p class="funnel-subtitle">I'll reach out soon. In the meantime, feel free to stalk my other pages.</p>

                <div class="funnel-links">
                    <a href="essays.html" class="funnel-link">Read my essays</a>
                    <a href="adventures.html" class="funnel-link">See my adventures</a>
                    <a href="books.html" class="funnel-link">Check my reading list</a>
                    <a href="https://x.com/JevanGoldsmith" target="_blank" class="funnel-link">Follow me on X</a>
                </div>
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
        screen.classList.add('funnel-animate-in');
    }
}
