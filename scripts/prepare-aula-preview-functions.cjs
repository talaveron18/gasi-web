// Only an approved GitHub PR preview for the exact Aula F1/F2 branch may
// include synthetic review endpoints. This script is never used in production.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
if(process.env.CONTEXT!=='deploy-preview' || (process.env.BRANCH!=='automation/public-reconcile-aula-f1f2-20261107' && process.env.HEAD!=='automation/public-reconcile-aula-f1f2-20261107')){
  throw new Error('Refusing to package the synthetic Aula API outside the dedicated pull-request preview');
}
require('./prepare-commercial-functions.cjs');
const output=path.resolve(__dirname,'../netlify/commercial-functions-build');
const source=path.resolve(__dirname,'../netlify/aula/aula-demo.mts');
const target=path.join(output,'aula-demo.mts');
if(!fs.existsSync(source)||!fs.existsSync(output))throw new Error('Missing Aula preview source or isolated output directory');
fs.copyFileSync(source,target);
const entries=fs.readdirSync(output,{withFileTypes:true}).filter(f=>f.isFile()).map(f=>f.name);
if(!entries.includes('aula-demo.mts')||entries.some(name=>name.startsWith('internal-clinical')||name==='aula.mts')){
  throw new Error('A private clinical or database-backed Aula function was included in the public preview');
}
console.log('Synthetic Aula preview prepared; no database, real students or clinical endpoints included');
