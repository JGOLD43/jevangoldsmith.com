// @ts-nocheck — pending typed migration
// Dateme funnel orchestrator. Inlines js/dateme-content.js,
// js/dateme-state.js, js/dateme-flow.js, js/dateme-view.js, and the
// empty stub js/dateme-events.js. The shards only ever exposed
// window.JGDateMe* globals consumed by this file, so collapsing them
// drops 5 globals + 5 script tags + ~80 LOC of plumbing.

import { toneContent, personalityMap, stage1Questions, stage2Questions } from './dateme-content';
import { dateMeState, dateMeFlow } from './dateme-state';

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

export {};
