import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const {handler}=require("./contact.js");

const event=(body,method="POST")=>({httpMethod:method,body:JSON.stringify(body)});

test("contact rejects methods other than POST",async()=>{
 const r=await handler({httpMethod:"GET",body:""});
 assert.equal(r.statusCode,405);
});

test("contact requires privacy before collecting a lead",async()=>{
 const r=await handler(event({name:"Ana",company:"ACME",email:"ana@example.com",service_type:"Enfermería presencial",message:"Info"}));
 assert.equal(r.statusCode,422);
 assert.equal(JSON.parse(r.body).message,"privacy_required");
});

test("contact honeypot exits without external delivery",async()=>{
 let called=false;const original=globalThis.fetch;globalThis.fetch=async()=>{called=true;throw new Error("should not call");};
 try{
  const r=await handler(event({website:"spam",accepts_privacy:true}));
  assert.equal(r.statusCode,200);
  assert.equal(called,false);
 }finally{globalThis.fetch=original;}
});

test("contact validates email and optional phone",async()=>{
 let r=await handler(event({name:"Ana",company:"ACME",email:"bad",phone:"",service_type:"Enfermería presencial",message:"Info",accepts_privacy:true}));
 assert.equal(JSON.parse(r.body).message,"invalid_email");
 r=await handler(event({name:"Ana",company:"ACME",email:"ana@example.com",phone:"12",service_type:"Enfermería presencial",message:"Info",accepts_privacy:true}));
 assert.equal(JSON.parse(r.body).message,"invalid_phone");
});

test("contact delivers a validated lead and escapes HTML",async()=>{
 const originalFetch=globalThis.fetch,originalKey=process.env.MAILERSEND_API_KEY;
 process.env.MAILERSEND_API_KEY="test-key";
 let outbound=null;
 globalThis.fetch=async(_url,options)=>{outbound=JSON.parse(options.body);return {ok:true,status:202,text:async()=>""};};
 try{
  const r=await handler(event({name:"Ana <script>",company:"ACME & Co",email:"ana@example.com",phone:"",employee_count:"100",service_type:"Formación sanitaria",message:"Necesito <b>info</b>",accepts_privacy:true,website:""}));
  assert.equal(r.statusCode,200);
  assert.ok(outbound);
  assert.match(outbound.html,/Ana &lt;script&gt;/);
  assert.match(outbound.html,/ACME &amp; Co/);
  assert.doesNotMatch(outbound.html,/<script>/);
 }finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.MAILERSEND_API_KEY;else process.env.MAILERSEND_API_KEY=originalKey;}
});
