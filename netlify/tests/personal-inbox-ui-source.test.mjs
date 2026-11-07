import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../../frontend/src/pages/InternalInbox.jsx',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../../frontend/src/App.js',import.meta.url),'utf8');
const profile=fs.readFileSync(new URL('../../frontend/src/pages/InternalProfile.jsx',import.meta.url),'utf8');

test('personal inbox is authenticated and not exposed as a public route',()=>{
 assert.match(app,/path="\/interno\/buzon" element={<Guard><InternalInbox\/><\/Guard>}/);
 assert.doesNotMatch(app,/path="\/buzon"/);
 assert.match(profile,/!isMaster&&<Link to="\/interno\/buzon"/);
});

test('inbox UI never supplies tenant or sender identity',()=>{
 assert.doesNotMatch(page,/tenant_id/);
 assert.doesNotMatch(page,/sender_worker_id:/);
 assert.match(page,/JSON\.stringify\(\{center,recipient_worker_id:recipient,subject,body\}\)/);
});

test('inbox UI is center-scoped and bounded to runtime limits',()=>{
 assert.match(page,/session\?\.centers\|\|\[\]/);
 assert.match(page,/center=\$\{encodeURIComponent\(center\)\}/);
 assert.match(page,/maxLength=\{120\}/);
 assert.match(page,/maxLength=\{180\}/);
 assert.match(page,/maxLength=\{8000\}/);
 assert.match(page,/No es un canal de urgencias/);
});
