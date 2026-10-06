document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelectorAll('.plugin').forEach(card => {card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;});
}));
document.querySelector('#copy-catalogue').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {await navigator.clipboard.writeText('https://jevangoldsmith.com/theon/plugins/catalogue.json'); status.textContent = 'Copied.';}
  catch {status.textContent = 'Select and copy the catalogue link above.';}
});
