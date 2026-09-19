import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../functions/internal-clinical.mts', import.meta.url), 'utf8');

test('episode collection is tenant-scoped at the database query', () => {
  assert.doesNotMatch(
    source,
    /SELECT \* FROM internal_clinical_episodes ORDER BY created_at DESC LIMIT 250/,
    'P0 tenant isolation: collection endpoint must not load every tenant episode and filter only in application memory'
  );
});

test('direct episode access scopes narrative in SQL before loading it', () => {
  assert.match(source,/SELECT id,center,discipline,level,status,created_at FROM internal_clinical_episodes WHERE id=/);
  assert.match(source,/SELECT \* FROM internal_clinical_episodes WHERE id=\$1 AND center = ANY\(\$2::text\[\]\) AND discipline=\$3 LIMIT 1/);
  assert.match(source,/\[id,centers,disciplineFor\(w\.role\)\]/);
  assert.match(source,/episode_not_visible/);
});

test('clinical writes require assigned center and reject administrative role', () => {
  assert.match(source, /if\(w\.role==="admin"\)return json\(\{detail:"clinical_role_required"\},403\)/);
  assert.match(source, /if\(!w\.centers\?\.includes\(center\)\)return json\(\{detail:"assigned_center_required"\},403\)/);
});

test('session revocation is tied to auth_version', () => {
  assert.match(source, /Number\(w\.auth_version\)!==Number\(p\.av\)/);
  assert.match(source, /auth_version=auth_version\+1/);
});


test('professional reads are scoped by assigned center and clinical discipline in SQL',()=>{
  assert.match(source,/WHERE center = ANY\(\$1::text\[\]\) AND discipline=\$2 ORDER BY created_at DESC LIMIT 250/);
  assert.match(source,/\[centers,discipline\]/);
  assert.match(source,/WHERE id=\$1 AND center = ANY\(\$2::text\[\]\) AND discipline=\$3 LIMIT 1/);
});


test('clinical mutations load episodes only through SQL-scoped writableEpisode',()=>{
  assert.match(source,/async function writableEpisode\(db:any,w:any,id:string\)/);
  assert.match(source,/SELECT \* FROM internal_clinical_episodes WHERE id=\$1 AND center = ANY\(\$2::text\[\]\) AND discipline=\$3 LIMIT 1/);
  assert.match(source,/\[id,centers,disciplineFor\(w\.role\)\]/);
  assert.doesNotMatch(source,/const rows=await db\.sql`SELECT \* FROM internal_clinical_episodes WHERE id=\$\{id\} LIMIT 1`;const e=rows\[0\];if\(!e\)return json\(\{detail:"episode_not_found"\},404\);if\(!canWrite\(w,e\)\)/);
});

test('privileged narrative is gated before full clinical data is loaded',()=>{
  const start=source.indexOf('const privileged=path.match');
  assert.ok(start>=0,'privileged route missing');
  const route=source.slice(start,start+3400);
  const gate=route.indexOf('if(!has(w,"clinical_privileged_read"))');
  const fullLoad=route.indexOf('SELECT * FROM internal_clinical_episodes');
  assert.ok(gate>=0&&fullLoad>gate,'privilege gate must precede narrative load');
  assert.match(route,/center = ANY\(\$2::text\[\]\) LIMIT 1/);
});
