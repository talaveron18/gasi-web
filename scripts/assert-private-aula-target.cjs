'use strict';
// Block accidental execution of the private Aula build on the public or
// clinical Netlify sites. SITE_ID is automatically injected by Netlify.
// This does not deploy, authenticate users, or load any project secret.
const PRIVATE_AULA_SITE_ID='620b3f03-68b4-4f2d-b79a-80e04eec3281';
if(process.env.NETLIFY==='true'){
  if(process.env.SITE_ID!==PRIVATE_AULA_SITE_ID){
    console.error('Refusing private Aula build: unexpected Netlify SITE_ID. Check package directory and intended project.');
    process.exit(1);
  }
  console.log('Dedicated private Aula Netlify project verified.');
} else {
  console.log('Local private Aula build; deploy target guard applies on Netlify.');
}

// This deployment branch must be independent of Netlify Database.
// These checks execute before npm install and before the private frontend build.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['package.json','netlify/package.json']){
  const content=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  if(content.dependencies?.['@netlify/database']||content.devDependencies?.['@netlify/database']){
    console.error('Refusing private Aula build: Netlify Database dependency detected in '+file);
    process.exit(1);
  }
}
if(fs.existsSync(path.join(root,'netlify/database/migrations'))){
  console.error('Refusing private Aula build: legacy Netlify Database migrations present.');
  process.exit(1);
}
const config=fs.readFileSync(path.join(root,'netlify.toml'),'utf8');
if(!config.includes('node scripts/assert-private-aula-target.cjs')||!config.includes('netlify/private-aula-functions-build')){
  console.error('Refusing private Aula build: root TOML is not the private Aula configuration.');
  process.exit(1);
}

// Keep routing single-source: default function at /.netlify/functions/aula
// receives the explicit 200 rewrite from /api/aula/*.
// A custom config.path would disable the canonical function URL.
const handler=fs.readFileSync(path.join(root,'netlify/functions/aula.mts'),'utf8');
if(/export\s+const\s+config\s*:/.test(handler)){
  console.error('Refusing private Aula build: config.path conflicts with explicit /api/aula rewrite.');
  process.exit(1);
}
for(const toml of ['netlify.toml','aula-site/netlify.toml']){
  const s=fs.readFileSync(path.join(root,toml),'utf8');
  const rule=/from = "\/api\/aula\/\*"\s+to = "\/\.netlify\/functions\/aula\?original_path=:splat"\s+status = 200\s+force = true/;
  if(!rule.test(s)||s.indexOf('from = "/api/aula/*"')>s.indexOf('from = "/api/*"')){
    console.error('Refusing private Aula build: missing or shadowed Aula function redirect in '+toml);
    process.exit(1);
  }
}
