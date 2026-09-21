import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/internal-clinical.mts', import.meta.url), 'utf8');

test('closed episode mutation guards use the persisted CERRADO state', () => {
  const staleEnglishGuard = /status\s*={2,3}\s*["']CLOSED["']/g;
  const matches = source.match(staleEnglishGuard) || [];
  assert.equal(matches.length, 0, `found ${matches.length} stale CLOSED guard(s); persisted close state is CERRADO`);

  const persistedClose = /SET\s+status=['"]CERRADO['"]/;
  assert.match(source, persistedClose, 'close transition must persist CERRADO');

  const immutableGuard = /status\s*={2,3}\s*["']CERRADO["'][^\n]*closed_episode_immutable/;
  assert.match(source, immutableGuard, 'mutating clinical routes must guard the persisted CERRADO state');
});
