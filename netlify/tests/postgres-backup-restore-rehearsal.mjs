import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;
const sourceUrl = process.env.GASI_INTEGRATION_DB_URL;
if (!sourceUrl) throw new Error('GASI_INTEGRATION_DB_URL is required');

const restoreUrl = new URL(sourceUrl);
restoreUrl.pathname = '/gasi_restore_rehearsal';
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = '/postgres';

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

const workdir = await mkdtemp(path.join(tmpdir(), 'gasi-pg-restore-'));
const dumpPath = path.join(workdir, 'gasi.dump');
const corruptPath = path.join(workdir, 'gasi-corrupt.dump');
const marker = `restore-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const source = new Client({ connectionString: sourceUrl });
const admin = new Client({ connectionString: adminUrl.toString() });
let restored;

try {
  await source.connect();
  await source.query('CREATE TABLE IF NOT EXISTS webinfra_restore_probe (id integer PRIMARY KEY, marker text NOT NULL)');
  await source.query('INSERT INTO webinfra_restore_probe (id, marker) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET marker = EXCLUDED.marker', [marker]);

  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', dumpPath, sourceUrl]);
  const dump = await readFile(dumpPath);
  assert.ok(dump.length > 0, 'backup artifact must not be empty');
  const digest = createHash('sha256').update(dump).digest('hex');
  assert.match(digest, /^[a-f0-9]{64}$/);

  const corrupted = Buffer.from(dump);
  corrupted.fill(0, 0, Math.min(64, corrupted.length));
  await writeFile(corruptPath, corrupted);
  const corruptCheck = spawnSync('pg_restore', ['--list', corruptPath], { encoding: 'utf8' });
  assert.notEqual(corruptCheck.status, 0, 'corrupted backup must fail validation');

  await admin.connect();
  await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', ['gasi_restore_rehearsal']);
  await admin.query('DROP DATABASE IF EXISTS gasi_restore_rehearsal');
  await admin.query('CREATE DATABASE gasi_restore_rehearsal');

  run('pg_restore', ['--exit-on-error', '--no-owner', '--no-acl', '--dbname', restoreUrl.toString(), dumpPath]);

  restored = new Client({ connectionString: restoreUrl.toString() });
  await restored.connect();
  const restoredProbe = await restored.query('SELECT marker FROM webinfra_restore_probe WHERE id = 1');
  assert.equal(restoredProbe.rows[0]?.marker, marker, 'restored database must contain the exact source marker');

  const sourceTables = await source.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
  const restoredTables = await restored.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
  assert.equal(restoredTables.rows[0].count, sourceTables.rows[0].count, 'restore must reproduce the public schema table count');

  console.log(JSON.stringify({ backup_bytes: dump.length, sha256: digest, restored_marker: marker, public_tables: restoredTables.rows[0].count }));
} finally {
  if (restored) await restored.end().catch(() => {});
  await source.end().catch(() => {});
  if (admin._connected) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', ['gasi_restore_rehearsal']).catch(() => {});
    await admin.query('DROP DATABASE IF EXISTS gasi_restore_rehearsal').catch(() => {});
    await admin.end().catch(() => {});
  }
  await rm(workdir, { recursive: true, force: true });
}
