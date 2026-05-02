document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = Array.from(document.querySelectorAll('.ion-filter-btn'));
  const cards = Array.from(document.querySelectorAll('.ion-card'));

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.getAttribute('data-filter');

      filterButtons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');

      cards.forEach((card) => {
        const verdict = card.getAttribute('data-verdict');
        card.style.display = filter === 'all' || verdict === filter ? 'block' : 'none';
      });
    });
  });
});
