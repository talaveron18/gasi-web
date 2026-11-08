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
  assert.match(source,/from "\.\/_shared\/f5-policy\.mjs"/);
  assert.match(source,/from "\.\/_shared\/f6-policy\.mjs"/);
  assert.deepEqual(fs.readdirSync(path.join(dir,'_shared')).sort(),['access-policy.mjs','f3-policy.mjs','f5-policy.mjs','f6-policy.mjs']);
  assert.match(source,/auth\/login/);
  assert.doesNotMatch(source,/aula-demo|internal-clinical/);
  const config=fs.readFileSync(path.join(root,'aula-site/netlify.toml'),'utf8');
  assert.match(config,/directory = "netlify\/private-aula-functions-build"/);
  assert.match(config,/REACT_APP_AULA_ENABLED=true/);
});
test('commercial build remains independent and excludes real Aula authentication',()=>{
  execFileSync(process.execPath,['scripts/prepare-commercial-functions.cjs'],{cwd:root});
  const dir=path.join(root,'netlify/commercial-functions-build');
  const files=fs.readdirSync(dir);
  assert.equal(files.includes('aula.mts'),false);
  assert.equal(files.includes('aula-demo.mts'),false);
});

test('private Aula site guard rejects public and wrong Netlify targets',()=>{
  const guard=path.join(root,'scripts/assert-private-aula-target.cjs');
  const {spawnSync}=require('node:child_process');
  const run=(siteId)=>spawnSync(process.execPath,[guard],{
    cwd:root,encoding:'utf8',
    env:{...process.env,NETLIFY:'true',SITE_ID:siteId,CONTEXT:'deploy-preview'}
  });
  assert.equal(run('620b3f03-68b4-4f2d-b79a-80e04eec3281').status,0);
  for(const id of ['1bcad18d-bdaf-4d23-a119-ff8cdeb3e03b','40c0b918-16c2-4d5f-bc70-c2e3932875d5','']){
    const x=run(id);
    assert.equal(x.status,1);
    assert.match(x.stderr,/Refusing private Aula build/i);
  }
  const config=fs.readFileSync(path.join(root,'aula-site/netlify.toml'),'utf8');
  assert.match(config,/node scripts\/assert-private-aula-target\.cjs &&/);
});

test('private build routes cannot show commercial or internal clinical areas',()=>{
  const app=fs.readFileSync(path.join(root,'frontend/src/App.js'),'utf8');
  const privateApp=fs.readFileSync(path.join(root,'frontend/src/aula/AulaPrivateApp.jsx'),'utf8');
  assert.match(app,/if\(AULA_ENABLED\)return <AulaPrivateApp\/>/);
  assert.match(privateApp,/path="\*" element=\{<Navigate to="\/aula\/acceso" replace\/>\}/);
  assert.match(privateApp,/path="\/politica-privacidad"/);
  for(const pathName of ['/interno','/dashboard','/contacto','/cobertura-sanitaria'])
    assert.ok(!privateApp.includes('path="'+pathName+'"'),'non-Aula route rendered: '+pathName);
});
