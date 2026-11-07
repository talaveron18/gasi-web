// This script is for a separately configured PRIVATE Aula site with PostgreSQL.
// Never include its generated functions in the public gasisalud.com deployment.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'netlify/private-aula-functions-build');
const shared=path.join(target,'_shared');
const original=fs.readFileSync(path.join(root,'netlify/functions/aula.mts'),'utf8');
const importFrom='from "../aula/access-policy.mjs"';
if(original.split(importFrom).length!==2)throw new Error('Unexpected Aula policy import; refusing to package');
const source=original.replace(importFrom,'from "./_shared/access-policy.mjs"');
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(shared,{recursive:true});
fs.writeFileSync(path.join(target,'aula.mts'),source);
fs.copyFileSync(path.join(root,'netlify/aula/access-policy.mjs'),path.join(shared,'access-policy.mjs'));
const contents=fs.readdirSync(target).sort();
if(JSON.stringify(contents)!==JSON.stringify(['_shared','aula.mts']))throw new Error('Unexpected function published in private Aula');
if(source.includes('aula-demo')||source.includes('internal-clinical'))throw new Error('Cross-system endpoint in private Aula function');
console.log('Dedicated private Aula API packaged; demo and clinical endpoints are excluded');
