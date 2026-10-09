(() => {
  const inputs = [...document.querySelectorAll('input')];
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
  const labels = { entry: 'Accessible', standard: 'Balanced', premium: 'Higher value' };
  function render() {
    const valid = inputs.every(input => input.value.trim() !== '' && input.checkValidity() && Number.isFinite(Number(input.value)));
    document.querySelector('#input-status').textContent = valid ? '' : 'Enter values within the ranges shown before comparing offers.';
    const target = document.querySelector('#scenarios');
    target.replaceChildren();
    if (!valid) return;
    const [visitors, conversion, share, variable, fixed] = inputs.map(input => Number(input.value));
    const buyers = Math.floor(visitors * conversion / 100);
    for (const [key, offer] of Object.entries(window.TRIDENT_OFFERS)) {
      const rate = offer.monthly * (1 - share / 100) + offer.annual / 12 * share / 100;
      const revenue = buyers * rate;
      const contribution = revenue - buyers * variable - fixed;
      const breakEven = rate > variable ? `${Math.ceil(fixed / (rate - variable))} active subscribers` : 'No break-even at these costs';
      const card = document.createElement('article');
      card.className = `scenario${key === 'standard' ? ' recommended' : ''}`;
      const eyebrow = document.createElement('p'); eyebrow.className = 'eyebrow'; eyebrow.textContent = key === 'standard' ? 'STARTING HYPOTHESIS' : 'ALTERNATIVE HYPOTHESIS';
      const heading = document.createElement('h2'); heading.textContent = labels[key];
      const prices = document.createElement('p'); prices.className = 'offer-line'; prices.textContent = `${money(offer.monthly)}/month · ${money(offer.annual)}/year · ${money(offer.founder)} once`;
      const list = document.createElement('dl');
      for (const [label, value, small] of [
        ['Illustrative new subscribers', String(buyers), false],
        ['Recurring revenue / month', money(revenue), false],
        ['After entered costs / month', money(contribution), false],
        ['Break-even at the entered mix', breakEven, true],
        ['If those buyers all chose one-time', `${money(buyers * offer.founder)} upfront`, true],
      ]) { const term = document.createElement('dt'); term.textContent = label; const output = document.createElement('dd'); output.textContent = value; if (small) output.className = 'small-output'; list.append(term, output); }
      const link = document.createElement('a'); link.className = 'button secondary full'; link.href = `http://127.0.0.1:8943/theon/?offer=${key}#pricing`; link.textContent = 'Preview this offer';
      card.append(eyebrow, heading, prices, list, link); target.append(card);
    }
  }
  inputs.forEach(input => input.addEventListener('input', render)); render();
})();
