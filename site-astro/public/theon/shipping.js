let current = null;
let filter = 'all';
const byId = id => document.getElementById(id);
const date = value => new Date(value).toLocaleString('en-AU', {timeZone:'Australia/Brisbane',dateStyle:'medium',timeStyle:'short'}) + ' AEST';
function node(tag, text, className) {const element = document.createElement(tag);if (text != null) element.textContent = text;if(className) element.className = className;return element;}
function renderOutcomes() {
  const list = byId('outcomes'); list.replaceChildren();
  const items = current.cycle.items.filter(item => filter === 'all' || item.status === filter);
  for (const item of items) {
    const row = node('details',null,'outcome'); const summary = node('summary');
    summary.append(node('span',item.area,'outcome-area'),node('strong',item.title),node('span',item.status.replace('-',' '),'status '+item.status));
    row.append(summary,node('p',item.acceptance));
    if (item.startedAt) row.append(node('p','Started ' + date(item.startedAt) + (item.acceptedAt ? ' · Accepted ' + date(item.acceptedAt) : ' · ' + Math.max(0,Math.floor((Date.now()-Date.parse(item.startedAt))/3600000)) + ' elapsed hours in progress'),'fine'));
    for (const evidence of item.evidence) row.append(node('p','✓ ' + evidence,'evidence'));
    list.append(row);
  }
  if (!items.length) list.append(node('p','No outcomes in this state yet.','empty'));
}
function render(data) {
  current = data;
  const metrics = byId('metrics'); metrics.replaceChildren();
  const m = data.metrics;
  const entries = [[data.cycle.accepted+'/'+data.cycle.total,'Accepted outcomes','This bounded cycle'],[String(m.localVersionsLast7Days),'Local versions installed','Observed rolling 7 days'],[String(m.publicReleasesLast7Days),'Public releases','Observed rolling 7 days'],[m.medianCycleHours == null ? '—' : m.medianCycleHours.toFixed(1)+'h','Median cycle time',m.cycleSamples+' recorded intervals'],[String(m.inProgress),'In progress','Explicitly started'],[String(m.openRegressions),'Recorded open regressions','Reported evidence only']];
  for (const [value,label,note] of entries) {const card = node('article',null,'metric');card.append(node('strong',value),node('h2',label),node('p',note));metrics.append(card);}
  byId('cycle-name').textContent = data.cycle.name;
  byId('progress').style.width = (data.cycle.total ? 100*data.cycle.accepted/data.cycle.total : 0)+'%';
  byId('cycle-count').textContent = data.cycle.accepted+' accepted of '+data.cycle.total+' agreed outcomes. Open a row to inspect its acceptance check.';
  byId('coverage').textContent = 'Observation began '+date(data.coverageStartedAt)+'. '+(data.partialWeek ? 'The seven-day window has partial coverage. ' : '')+'Earlier Mac shipping rate is unknown.';
  byId('freshness').textContent = 'Evidence updated '+date(data.generatedAt)+'. Refreshes every minute; public release observations update every six hours. Local evidence updates when published.';
  for (const [id,values] of [['installs',data.installations],['releases',data.publicReleases]]) {
    const container = byId(id);container.replaceChildren();
    for (const value of [...values].reverse().slice(0,12)) {const row=node('div',null,'history-row');row.append(node('strong',value.version || value.tag),node('span',date(value.installedAt || value.publishedAt)));container.append(row);}
    if(!values.length) container.append(node('p',id === 'releases' ? 'No published app releases observed yet.' : 'No local installations observed yet.','empty'));
  }
  renderOutcomes();
}
let busy = false;
async function refresh() {
  if (busy) return;busy=true;byId('refresh').disabled=true;
  try {
    // Only public repository metadata is fetched. No tokens or private workspace records.
    const response = await fetch('https://raw.githubusercontent.com/JGOLD43/theon/shipping-evidence/shipping/public.json?fresh='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('Public evidence unavailable');
    const data=await response.json();if(data.schemaVersion !== 1 || !data.cycle?.items || !data.metrics) throw new Error('Invalid evidence');render(data);
  } catch {
    if(!current) {
      try {const response=await fetch('shipping.json',{cache:'no-store'});if(!response.ok) throw new Error();render(await response.json());byId('freshness').append(' Showing the website’s retained snapshot because live repository evidence is unavailable.');}
      catch {byId('freshness').textContent='Shipping evidence is unavailable. Refresh to try again.';}
    } else byId('freshness').textContent='Refresh failed. Retaining evidence dated '+date(current.generatedAt)+'.';
  } finally {busy=false;byId('refresh').disabled=false;}
}
document.querySelectorAll('[data-state]').forEach(button => button.addEventListener('click',()=>{filter=button.dataset.state;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));if(current)renderOutcomes();}));
byId('refresh').addEventListener('click',refresh);refresh();setInterval(refresh,60000);
