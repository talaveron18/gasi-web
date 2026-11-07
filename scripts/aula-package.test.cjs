'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('private PostgreSQL Aula deploy publishes only authenticated API',()=>{
  execFileSync(process.execPath,['scripts/prepare-private-aula-functions.cjs'],{cwd:root});
  const dir=path.join(root,'netlify/private-aula-functions-build');
  assert.deepEqual(fs.readdirSync(dir).sort(),['_shared','aula.mts']);
  const source=fs.readFileSync(path.join(dir,'aula.mts'),'utf8');
  assert.match(source,/from "\.\/_shared\/access-policy\.mjs"/);
  assert.match(source,/from "\.\/_shared\/f3-policy\.mjs"/);
  assert.deepEqual(fs.readdirSync(path.join(dir,'_shared')).sort(),['access-policy.mjs','f3-policy.mjs']);
  assert.match(source,/auth\/login/);
  assert.doesNotMatch(source,/aula-demo|internal-clinical/);
  const config=fs.readFileSync(path.join(root,'aula-site/netlify.toml'),'utf8');
  assert.match(config,/directory = "netlify\/private-aula-functions-build"/);
  assert.match(config,/REACT_APP_AULA_PREVIEW_DEMO=false/);
});
test('preview function packaging fails outside the exact PR deploy context',()=>{
  assert.throws(()=>execFileSync(process.execPath,['scripts/prepare-aula-preview-functions.cjs'],{
    cwd:root,env:{...process.env,CONTEXT:'production',BRANCH:'main'},stdio:'pipe'
  }),/Command failed/);
});
test('commercial build remains independent and excludes real Aula authentication',()=>{
  execFileSync(process.execPath,['scripts/prepare-commercial-functions.cjs'],{cwd:root});
  const dir=path.join(root,'netlify/commercial-functions-build');
  const files=fs.readdirSync(dir);
  assert.equal(files.includes('aula.mts'),false);
  assert.equal(files.includes('aula-demo.mts'),false);
});
