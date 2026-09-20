import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const contact=require("../functions/contact.js");
const chatbot=require("../functions/chatbot.js");

const originalFetch=global.fetch;
const originalApiKey=process.env.MAILERSEND_API_KEY;
const originalSender=process.env.GASI_LEAD_SENDER_EMAIL;
const originalRecipient=process.env.GASI_LEAD_RECIPIENT_EMAIL;

function resetEnv(){
  process.env.MAILERSEND_API_KEY="synthetic-mailersend-key";
  process.env.GASI_LEAD_SENDER_EMAIL="sender@gasisalud.com";
  process.env.GASI_LEAD_RECIPIENT_EMAIL="recipient@gasisalud.com";
}

test.afterEach(()=>{
  global.fetch=originalFetch;
  if(originalApiKey===undefined)delete process.env.MAILERSEND_API_KEY;else process.env.MAILERSEND_API_KEY=originalApiKey;
  if(originalSender===undefined)delete process.env.GASI_LEAD_SENDER_EMAIL;else process.env.GASI_LEAD_SENDER_EMAIL=originalSender;
  if(originalRecipient===undefined)delete process.env.GASI_LEAD_RECIPIENT_EMAIL;else process.env.GASI_LEAD_RECIPIENT_EMAIL=originalRecipient;
});

test("contact validates, escapes HTML and sends only normalized fields",async()=>{
  resetEnv();
  let upstream;
  global.fetch=async(url,options)=>{
    upstream={url,options,body:JSON.parse(options.body)};
    return {ok:true,status:202};
  };
  const event={
    httpMethod:"POST",
    body:JSON.stringify({
      name:" <script>alert(1)</script> Ana ",
      company:"Empresa <b>X</b>",
      email:"ANA@EXAMPLE.COM",
      phone:"+34 600 000 001",
      employee_count:"50",
      service_type:"Formación sanitaria",
      message:"Necesito <img src=x onerror=alert(1)> información",
      website:"",
      accepts_privacy:true
    })
  };
  const response=await contact.handler(event);
  assert.equal(response.statusCode,200);
  assert.equal(JSON.parse(response.body).message,"sent");
  assert.equal(upstream.url,"https://api.mailersend.com/v1/email");
  assert.match(upstream.body.html,/&lt;script&gt;alert\(1\)&lt;\/script&gt; Ana/);
  assert.match(upstream.body.html,/Empresa &lt;b&gt;X&lt;\/b&gt;/);
  assert.match(upstream.body.html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(upstream.body.html,/<script>|<img/i);
  assert.match(upstream.body.html,/ana@example\.com/);
});

test("contact honeypot is accepted without delivery",async()=>{
  resetEnv();
  let calls=0;
  global.fetch=async()=>{calls++;return {ok:true,status:202};};
  const response=await contact.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      name:"Bot",
      company:"BotCo",
      email:"bot@example.com",
      phone:"+34 600 000 002",
      service_type:"Otro",
      message:"spam",
      website:"https://spam.invalid",
      accepts_privacy:true
    })
  });
  assert.equal(response.statusCode,200);
  assert.equal(JSON.parse(response.body).message,"accepted");
  assert.equal(calls,0);
});

test("contact rejects missing privacy and invalid service",async()=>{
  resetEnv();
  global.fetch=async()=>{throw new Error("must not deliver");};
  let response=await contact.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      name:"Ana",company:"Empresa",email:"ana@example.com",phone:"+34 600 000 003",
      service_type:"Formación sanitaria",message:"Info",website:"",accepts_privacy:false
    })
  });
  assert.equal(response.statusCode,422);
  assert.equal(JSON.parse(response.body).message,"privacy_required");

  response=await contact.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      name:"Ana",company:"Empresa",email:"ana@example.com",phone:"+34 600 000 003",
      service_type:"SERVICIO-INVENTADO",message:"Info",website:"",accepts_privacy:true
    })
  });
  assert.equal(response.statusCode,422);
  assert.equal(JSON.parse(response.body).message,"invalid_service");
});

test("contact rejects oversized body before parsing",async()=>{
  const response=await contact.handler({httpMethod:"POST",body:"x".repeat(9000)});
  assert.equal(response.statusCode,413);
  assert.equal(JSON.parse(response.body).message,"payload_too_large");
});

test("chatbot endpoint enforces privacy and allowed service",async()=>{
  resetEnv();
  let calls=0;
  global.fetch=async(url,options)=>{calls++;return {ok:true,status:202};};

  let response=await chatbot.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      service:"Psicología",name:"Ana",email:"ana@example.com",phone:"+34 600 000 004",
      website:"",accepts_privacy:false
    })
  });
  assert.equal(response.statusCode,422);
  assert.equal(JSON.parse(response.body).message,"privacy_required");
  assert.equal(calls,0);

  response=await chatbot.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      service:"Psicología",name:"Ana",email:"ana@example.com",phone:"+34 600 000 004",
      website:"",accepts_privacy:true
    })
  });
  assert.equal(response.statusCode,200);
  assert.equal(JSON.parse(response.body).message,"sent");
  assert.equal(calls,1);
});

test("lead endpoints fail closed when mail provider secret is absent",async()=>{
  delete process.env.MAILERSEND_API_KEY;
  global.fetch=async()=>{throw new Error("must not call upstream");};
  const response=await chatbot.handler({
    httpMethod:"POST",
    body:JSON.stringify({
      service:"Otro",name:"Ana",email:"ana@example.com",phone:"+34 600 000 005",
      website:"",accepts_privacy:true
    })
  });
  assert.equal(response.statusCode,503);
  assert.equal(JSON.parse(response.body).message,"service_unavailable");
});
