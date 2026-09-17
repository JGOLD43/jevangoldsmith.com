const roles = [...document.querySelectorAll<HTMLDetailsElement>('.resume-role')];
const controls = document.querySelector<HTMLElement>('[data-resume-controls]');
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-resume-filter]')];
const expand = document.querySelector<HTMLButtonElement>('[data-resume-expand]');
const count = document.querySelector<HTMLElement>('[data-resume-count]');

function visibleRoles() {
  return roles.filter((role) => !role.hidden);
}

function updateExpandLabel() {
  if (expand) expand.textContent = visibleRoles().every((role) => role.open) ? 'Collapse all' : 'Expand all';
}

function showCategory(category: string) {
  for (const role of roles) role.hidden = category !== 'all' && role.dataset.resumeCategory !== category;
  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.resumeFilter === category));
  const total = visibleRoles().length;
  if (count) count.textContent = `${total} ${total === 1 ? 'role' : 'roles'} shown`;
  updateExpandLabel();
}

if (controls && roles.length) {
  controls.hidden = false;
  for (const filter of filters) filter.addEventListener('click', () => showCategory(filter.dataset.resumeFilter || 'all'));
  for (const role of roles) role.addEventListener('toggle', updateExpandLabel);
  expand?.addEventListener('click', () => {
    const visible = visibleRoles();
    const shouldOpen = !visible.every((role) => role.open);
    for (const role of visible) role.open = shouldOpen;
    updateExpandLabel();
  });

  // Links to individual roles remain useful, including after filtering.
  const revealLinkedRole = () => {
    const role = roles.find((item) => `#${item.id}` === location.hash);
    if (!role) return;
    showCategory('all');
    role.open = true;
    role.scrollIntoView({ block: 'start' });
  };
  window.addEventListener('hashchange', revealLinkedRole);
  revealLinkedRole();
  updateExpandLabel();
}
