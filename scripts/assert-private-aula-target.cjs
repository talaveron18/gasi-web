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
