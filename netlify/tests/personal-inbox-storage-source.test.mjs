import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  new URL('../database/migrations/20261028210500_internal-personal-inbox-v1/migration.sql', import.meta.url),
  'utf8',
);

test('personal inbox storage is explicitly tenant, center and recipient scoped', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS internal_personal_messages/i);
  assert.match(migration, /tenant_id TEXT NOT NULL/i);
  assert.match(migration, /center TEXT NOT NULL/i);
  assert.match(migration, /sender_worker_id TEXT NOT NULL REFERENCES internal_clinical_workers\(id\)/i);
  assert.match(migration, /recipient_worker_id TEXT NOT NULL REFERENCES internal_clinical_workers\(id\)/i);
  assert.match(migration, /idx_internal_personal_messages_inbox[\s\S]*tenant_id, center, recipient_worker_id, created_at DESC/i);
});

test('personal inbox rejects empty tenant, center and content at the storage boundary', () => {
  for (const constraint of [
    'internal_personal_messages_tenant_nonempty',
    'internal_personal_messages_center_nonempty',
    'internal_personal_messages_subject_nonempty',
    'internal_personal_messages_body_nonempty',
  ]) {
    assert.ok(migration.includes(constraint), `missing ${constraint}`);
  }
  assert.match(migration, /CHECK \(sender_worker_id <> recipient_worker_id\)/i);
});

test('unread lookup cannot lose tenant-center-recipient scope', () => {
  assert.match(
    migration,
    /idx_internal_personal_messages_unread[\s\S]*tenant_id, center, recipient_worker_id, created_at DESC\)[\s\S]*WHERE read_at IS NULL/i,
  );
});
