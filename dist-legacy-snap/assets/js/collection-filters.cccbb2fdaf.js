(function () {
  const groups = document.querySelectorAll('[data-filter-group]');

  groups.forEach((group) => {
    const groupName = group.dataset.filterGroup;
    const field = group.dataset.filterField;
    const buttons = Array.from(group.querySelectorAll('[data-filter-value]'));
    const cards = Array.from(document.querySelectorAll(`[data-${field}]`));

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.filterValue;

        buttons.forEach((candidate) => candidate.classList.remove('active'));
        button.classList.add('active');

        cards.forEach((card) => {
          const matchesGroup = groupName === 'quotes'
            ? card.classList.contains('quote-card')
            : card.classList.contains('project-card');
          if (!matchesGroup) return;

          const visible = value === 'all' || card.dataset[field] === value;
          card.hidden = !visible;
        });
      });
    });
  });
}());
