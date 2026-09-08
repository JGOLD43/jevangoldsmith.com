import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { runLearningMigrations } from '../src/storage/learning-migrations.ts';
import * as adaptive from '../src/learning/adaptive-skill-engine.ts';
import * as engine from '../src/learning/skill-tree-engine.ts';
import * as core from '../src/learning/core-skill-seeds.ts';
import * as focused from '../src/learning/focused-skill-seeds.ts';
import * as priority from '../src/learning/priority-curricula.ts';
import * as upskill from '../src/learning/upskilling-seed.ts';

function load(path, dependencies, exports) {
  const source = stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8')).replace(/^import .*;$/gm, '').replace(/^export /gm, '');
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${exports} };`)(...Object.values(dependencies));
}
function setup() {
  const db = new DatabaseSync(':memory:');
  const primary = {
    execAsync: async sql => db.exec(sql),
    runAsync: async (sql, ...args) => db.prepare(sql).run(...args),
    getFirstAsync: async (sql, ...args) => db.prepare(sql).get(...args),
    getAllAsync: async (sql, ...args) => db.prepare(sql).all(...args),
    withExclusiveTransactionAsync: async () => { throw new Error('file is not a database: unkeyed Expo transaction'); },
  };
  let closed = 0, keyed = 0;
  const { withVaultTransaction } = load('../src/storage/vault-transaction.ts', {
    getOrCreateVaultKey: async () => 'a'.repeat(64),
    openDatabaseAsync: async (_name, options) => {
      assert.equal(options.useNewConnection, true);
      let hasKey = false;
      return { ...primary,
        execAsync: async sql => {
          if (sql.startsWith('PRAGMA key')) { hasKey = true; keyed++; return; }
          assert.ok(hasKey, 'connection must be keyed before BEGIN or any other query');
          db.exec(sql);
        },
        closeAsync: async () => { closed++; },
      };
    },
  }, 'withVaultTransaction');
  const repository = load('../src/storage/skill-tree-repository.ts', {
    ...adaptive, ...engine, ...core, ...focused, ...priority, ...upskill,
    Crypto: { randomUUID }, getDatabase: async () => primary, withVaultTransaction,
  }, 'ensureCoreSkillTrees, listSkillTrees, getSkillTree, recordSkillTreeAttempt');
  return { db, primary, repository, withVaultTransaction, counts: () => ({ keyed, closed }) };
}

test('Library creates every curriculum with keyed transactions and preserves practice on retry', async () => {
  const { db, primary, repository, counts } = setup();
  try {
    await runLearningMigrations(primary);
    db.exec('CREATE TABLE books(id TEXT, title TEXT, updated_at TEXT)');
    await repository.ensureCoreSkillTrees();
    const trees = await repository.listSkillTrees();
    for (const spec of priority.PRIORITY_CURRICULA) {
      const tree = trees.find(tree => tree.title === spec.title);
      assert.equal(tree?.nodeCount, spec.nodes.length, spec.title);
    }
    const copy = trees.find(tree => tree.title === 'Copywriting');
    const detail = await repository.getSkillTree(copy.id);
    const node = detail.nodes.find(node => node.status === 'ready');
    await repository.recordSkillTreeAttempt(copy.id, node.id, 'clean');
    await repository.ensureCoreSkillTrees();
    assert.equal((await repository.listSkillTrees()).length, trees.length);
    const repeated = await repository.getSkillTree(copy.id);
    assert.equal(repeated.nodes.length, detail.nodes.length);
    assert.equal(repeated.nodes.find(item => item.id === node.id).progress.cleanAttempts, 1);
    assert.equal(counts().keyed, counts().closed);
  } finally { db.close(); }
});

test('keyed transactions roll back and close on a failed write', async () => {
  const { db, withVaultTransaction, counts } = setup();
  try {
    db.exec('CREATE TABLE evidence(id INTEGER)');
    await assert.rejects(withVaultTransaction(async tx => { await tx.runAsync('INSERT INTO evidence VALUES (1)'); throw new Error('test failure'); }), /test failure/);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM evidence').get().count, 0);
    assert.equal(counts().closed, 1);
  } finally { db.close(); }
});
