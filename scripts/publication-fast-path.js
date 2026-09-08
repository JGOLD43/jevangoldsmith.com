'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

function isPublicationOnly(paths) {
  const data = /^data\/(?:now|now-history|essays|adventures|projects|challenges|products|quotes)\.json$/;
  return paths.length > 0 && paths.every((file) => data.test(file)
    || file === '.jgold-publication-state.json'
    || /^images\/now-map\.jpg(?:\.meta)?$/.test(file)
    || /^images\/now-archive\/[a-zA-Z0-9._-]+\.jpg$/.test(file)
    || /^site-astro\/public\/media\/studio\/[a-f0-9]{64}\.(?:jpg|jpeg|png|webp|mp4|webm)$/.test(file));
}

async function main() {
  let focused = false;
  const base = process.env.CONTENT_BASE || '';
  const repository = process.env.GITHUB_REPOSITORY;
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' && /^[a-f0-9]{40}$/.test(base)) {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', base, 'HEAD']);
      const paths = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
      if (isPublicationOnly(paths)) {
        const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/test.yml/runs?status=success&head_sha=${base}&per_page=20`, {
          headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          const data = await response.json();
          focused = data.workflow_runs?.some((run) => run.head_sha === base && run.head_branch === 'main'
            && run.head_repository?.full_name === repository && ['push', 'workflow_dispatch'].includes(run.event)) === true;
        }
      }
    } catch { /* Missing evidence always falls back to the full code checks. */ }
  }
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `focused=${focused}\n`);
  console.log(focused ? 'Approved content changes on a tested code revision: focused publication checks.' : 'Running the complete code-change checks.');
}

module.exports = { isPublicationOnly };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
