// This script is for a separately configured PRIVATE Aula site with PostgreSQL.
// Never include its generated functions in the public gasisalud.com deployment.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'netlify/private-aula-functions-build');
const shared=path.join(target,'_shared');
const original=fs.readFileSync(path.join(root,'netlify/functions/aula.mts'),'utf8');
let source=original;
for(const policy of ['access-policy.mjs','f3-policy.mjs','f5-policy.mjs']){
  const from='from "../aula/'+policy+'"';
  if(source.split(from).length!==2)throw new Error('Unexpected Aula policy import for '+policy+'; refusing to package');
  source=source.replace(from,'from "./_shared/'+policy+'"');
}
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(shared,{recursive:true});
fs.writeFileSync(path.join(target,'aula.mts'),source);
for(const policy of ['access-policy.mjs','f3-policy.mjs','f5-policy.mjs'])
  fs.copyFileSync(path.join(root,'netlify/aula',policy),path.join(shared,policy));
const contents=fs.readdirSync(target).sort();
if(JSON.stringify(contents)!==JSON.stringify(['_shared','aula.mts']))throw new Error('Unexpected function published in private Aula');
if(source.includes('aula-demo')||source.includes('internal-clinical'))throw new Error('Cross-system endpoint in private Aula function');
console.log('Dedicated private Aula API packaged; demo and clinical endpoints are excluded');
