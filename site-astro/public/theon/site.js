(() => {
  const variants = window.TRIDENT_OFFERS;
  const requested = new URLSearchParams(window.location.search).get('offer');
  const offer = variants[Object.hasOwn(variants, requested) ? requested : 'standard'];
  let billing = 'annual';
  let activePlan = 'pro';
  let returnFocus;
  const format = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const dialog = document.querySelector('#offer-dialog');
  function updatePrice() {
    document.querySelectorAll('[data-billing]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.billing === billing)));
    const annual = billing === 'annual';
    document.querySelector('#pro-price').textContent = `$${format(annual ? offer.annual / 12 : offer.monthly)}`;
    document.querySelector('#pro-billing').textContent = annual ? `US$${offer.annual} billed yearly. Proposed offer.` : `US$${offer.monthly} billed monthly. Proposed offer.`;
    document.querySelector('#saving-label').textContent = `Save ${Math.round((1 - offer.annual / (offer.monthly * 12)) * 100)}%`;
    document.querySelector('#founder-price').textContent = `$${offer.founder}`;
  }
  document.querySelectorAll('[data-billing]').forEach(button => button.addEventListener('click', () => { billing = button.dataset.billing; updatePrice(); }));
  updatePrice();
  const scenes = {
    prepare: { kicker: 'BEFORE YOU CLOSE THE LID', heading: 'Leave the work\nready for your return.', description: 'Choose a result, attach the useful material and leave one small next step.', label: 'A CLEAR NEXT ACTION', step: 'Draft the first route from your field notes.', detail: 'A chosen result: a short, illustrated guide', note: '“Start with the headland walk. The opening is in the notes.”' },
    return: { kicker: 'WELCOME BACK', heading: 'You left yourself\na good place to begin.', description: 'Your draft and field notes are together. Your next step is already here.', label: 'YOUR NEXT STEP', step: 'Draft the first route from your field notes.', detail: 'A small, concrete action · About 25 minutes', note: '“Start with the headland walk. The opening is in the notes.”' },
    forward: { kicker: 'ONE USEFUL RESULT', heading: 'A paragraph written.\nA project moving.', description: 'Keep the result, say what changed and give your next session a place to start.', label: 'READY FOR NEXT TIME', step: 'Add the route map beside the opening.', detail: 'A result to keep: the first route’s opening paragraph', note: '“The opening is drafted. Next, check the route against the map.”' },
  };
  const demoButtons = [...document.querySelectorAll('[data-demo]')];
  function showScene(button) {
    const scene = scenes[button.dataset.demo];
    demoButtons.forEach(item => { const selected = item === button; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
    document.querySelector('#demo-panel').setAttribute('aria-labelledby', button.id);
    for (const [id, value] of Object.entries({ 'demo-kicker': scene.kicker, 'demo-heading': scene.heading, 'demo-description': scene.description, 'demo-step-label': scene.label, 'demo-step': scene.step, 'demo-detail': scene.detail, 'demo-note': scene.note })) document.getElementById(id).textContent = value;
  }
  demoButtons.forEach((button, index) => {
    button.addEventListener('click', () => showScene(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % demoButtons.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + demoButtons.length) % demoButtons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = demoButtons.length - 1;
      if (next !== undefined) { event.preventDefault(); showScene(demoButtons[next]); demoButtons[next].focus(); }
    });
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('.plugin').forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; });
  }));
  async function copy(text, status, success) {
    try { await navigator.clipboard.writeText(text); status.textContent = success; }
    catch { status.textContent = `Copy manually: ${text}`; }
  }
  document.querySelector('#copy-catalogue').addEventListener('click', () => copy('https://jevangoldsmith.com/theon/plugins/catalogue.json', document.querySelector('#copy-status'), 'Catalogue link copied.'));
  function selectedOffer() {
    return activePlan === 'founder' ? `Founding licence · US$${offer.founder} once · purchased major version plus the first year of updates and support` : `Pro · US$${billing === 'annual' ? offer.annual : offer.monthly} per ${billing === 'annual' ? 'year' : 'month'} · updates while subscribed`;
  }
  document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => {
    activePlan = button.dataset.plan; returnFocus = button;
    document.querySelector('#offer-title').textContent = activePlan === 'founder' ? 'Explore the founding licence' : 'Explore Pro';
    document.querySelector('#offer-selection').textContent = selectedOffer();
    document.querySelector('#offer-status').textContent = ''; dialog.showModal();
  }));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => returnFocus?.focus());
  document.querySelector('#copy-offer').addEventListener('click', () => copy(`Trident proposed early-access offer: ${selectedOffer()}. AI costs separate; paid edition in preparation. What would make this useful to me: `, document.querySelector('#offer-status'), 'Offer copied. Add your own feedback before posting.'));
})();
