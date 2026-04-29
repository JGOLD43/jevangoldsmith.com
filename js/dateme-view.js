(function () {
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

        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });

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
            textarea.addEventListener('input', () => {
                counter.textContent = textarea.value.length;
            });
        }
        document.getElementById('name')?.focus();
    }

    function render(container, html, afterRender = null) {
        container.innerHTML = html;
        afterRender?.();
        animateIn(container);
    }

    window.JGDateMeView = {
        attachContactHandlers,
        attachQuestionHandlers,
        render
    };
}());
