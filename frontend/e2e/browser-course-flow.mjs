import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const buildDir=path.resolve(__dirname,"../build");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const state={
  completed:new Set(),
  materialRequests:0,
  certificateRequests:0,
  checkoutRequests:0,
  directEnrollRequests:0,
};

const freeCourse={
  course_id:"COURSE-E2E",
  title:"Curso E2E alumno",
  description:"Curso sintético para navegador",
  duration:"2 horas",
  type:"Online",
  price:0,
  is_free:true,
  modules:[
    {module_id:"MOD-A",title:"Módulo A",order:1,description:"Primero"},
    {module_id:"MOD-B",title:"Módulo B",order:2,description:"Segundo"},
  ],
};

const paidCourse={
  ...freeCourse,
  course_id:"COURSE-PAID",
  title:"Curso E2E de pago",
  price:49,
  is_free:false,
};

const progressPayload=()=>{
  const completed=[...state.completed].sort();
  const progress=completed.length===0?0:completed.length===1?50:100;
  return {
    course_id:"COURSE-E2E",
    completed_module_ids:completed,
    completed_modules:completed.length,
    total_modules:2,
    progress,
    completed_at:progress===100?"2026-09-20T15:00:00+00:00":null,
    certificate_id:progress===100?"GASI-E2E-CERT-001":null,
  };
};

const json=(res,status,body)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(body));
};

const contentType=file=>{
  const ext=path.extname(file).toLowerCase();
  return ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webp":"image/webp"}[ext]||"application/octet-stream");
};

async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>{
      const address=server.address();
      const port=typeof address==="object"&&address?address.port:0;
      server.close(err=>err?reject(err):resolve(port));
    });
  });
}

async function startServer(){
  assert.ok(fs.existsSync(path.join(buildDir,"index.html")),"frontend/build missing");
  const port=await freePort();
  const origin=`http://127.0.0.1:${port}`;
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url||"/",origin);
    const p=u.pathname;

    if(p.includes("/api/auth/me")){
      json(res,200,{user_id:"STUDENT-E2E",email:"student@example.com",name:"Alumno E2E",is_admin:false,created_at:"2026-09-20T12:00:00+00:00"});
      return;
    }

    if(p.includes("/api/courses/COURSE-E2E/materials/MAT-1/content")){
      state.materialRequests++;
      const pdf=Buffer.from("%PDF-1.4\n% synthetic material\n");
      res.writeHead(200,{"content-type":"application/pdf","cache-control":"private, no-store","content-length":String(pdf.length)});
      res.end(pdf);return;
    }
    if(p.includes("/api/courses/COURSE-E2E/materials")&&req.method==="GET"){
      json(res,200,[{material_id:"MAT-1",course_id:"COURSE-E2E",module_id:"MOD-A",filename:"tema.pdf",content_type:"application/pdf",size:32,status:"ACTIVE"}]);
      return;
    }
    if(p.includes("/api/courses/COURSE-E2E/progress")&&req.method==="GET"){
      json(res,200,progressPayload());return;
    }
    const completeMatch=p.match(/\/api\/courses\/COURSE-E2E\/modules\/(MOD-A|MOD-B)\/complete$/);
    if(completeMatch&&req.method==="POST"){
      state.completed.add(completeMatch[1]);
      json(res,200,progressPayload());return;
    }
    if(p.includes("/api/courses/COURSE-E2E/certificate")&&req.method==="GET"){
      state.certificateRequests++;
      const pdf=Buffer.from("%PDF-1.4\nGASI-E2E-CERT-001\n");
      res.writeHead(200,{"content-type":"application/pdf","cache-control":"private, no-store","content-disposition":"attachment; filename=\"certificado-GASI-E2E-CERT-001.pdf\"","content-length":String(pdf.length)});
      res.end(pdf);return;
    }
    if(p.endsWith("/api/courses/COURSE-E2E")&&req.method==="GET"){
      json(res,200,freeCourse);return;
    }

    if(p.includes("/api/courses/COURSE-PAID/materials")&&req.method==="GET"){
      json(res,403,{detail:"course_access_required"});return;
    }
    if(p.includes("/api/courses/COURSE-PAID/progress")&&req.method==="GET"){
      json(res,403,{detail:"course_access_required"});return;
    }
    if(p.endsWith("/api/courses/COURSE-PAID")&&req.method==="GET"){
      json(res,200,paidCourse);return;
    }
    if(p.includes("/api/payments/create-checkout")&&req.method==="POST"){
      state.checkoutRequests++;
      json(res,200,{checkout_url:`${origin}/checkout-synthetic`});return;
    }
    if(p.includes("/api/courses/enroll")&&req.method==="POST"){
      state.directEnrollRequests++;
      json(res,500,{detail:"direct_enroll_should_not_be_called_for_paid"});return;
    }

    let target=path.join(buildDir,decodeURIComponent(p));
    try{
      const stat=fs.statSync(target);
      if(stat.isDirectory())target=path.join(target,"index.html");
    }catch{
      target=path.join(buildDir,"index.html");
    }
    if(!path.resolve(target).startsWith(buildDir)){res.writeHead(403);res.end();return;}
    fs.createReadStream(target).on("error",()=>{res.writeHead(500);res.end();}).once("open",()=>{
      res.writeHead(200,{"content-type":contentType(target),"cache-control":"no-store"});
    }).pipe(res);
  });
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
  return {server,origin};
}

function chromeBinary(){
  const candidates=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
  const found=candidates.find(p=>fs.existsSync(p));
  assert.ok(found,"Chrome/Chromium not found");
  return found;
}

async function waitForTarget(debugPort){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{
      const response=await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if(response.ok){
        const targets=await response.json();
        const page=targets.find(t=>t.type==="page"&&t.webSocketDebuggerUrl);
        if(page)return page.webSocketDebuggerUrl;
      }
    }catch{}
    await sleep(100);
  }
  throw new Error("Chrome DevTools endpoint did not become ready");
}

async function cdp(wsUrl){
  const ws=new WebSocket(wsUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
  let id=0;
  const pending=new Map();
  ws.addEventListener("message",event=>{
    const msg=JSON.parse(typeof event.data==="string"?event.data:Buffer.from(event.data).toString("utf8"));
    if(msg.id&&pending.has(msg.id)){
      const pair=pending.get(msg.id);pending.delete(msg.id);
      if(msg.error)pair.reject(new Error(msg.error.message));else pair.resolve(msg.result||{});
    }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const messageId=++id;
    pending.set(messageId,{resolve,reject});
    ws.send(JSON.stringify({id:messageId,method,params}));
  });
  return {ws,send};
}

async function waitFor(send,expression,timeout=12000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    const result=await send("Runtime.evaluate",{expression:`Boolean(${expression})`,returnByValue:true});
    if(result.result?.value===true)return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function value(send,expression){
  const result=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||"Runtime evaluation failed");
  return result.result?.value;
}

async function navigate(send,url,selector){
  await send("Page.navigate",{url});
  await waitFor(send,`document.readyState==="complete"`);
  if(selector)await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
}

async function click(send,selector){
  await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
  await send("Runtime.evaluate",{expression:`document.querySelector(${JSON.stringify(selector)}).click()`});
}

function unnamedInteractive(nodes){
  const interactive=new Set(["button","link","textbox","combobox","checkbox","radio","switch","menuitem","tab"]);
  return nodes
    .filter(n=>!n.ignored&&interactive.has(String(n.role?.value||""))&&!String(n.name?.value||"").trim())
    .map(n=>String(n.role?.value||"unknown"));
}

const {server,origin}=await startServer();
const debugPort=await freePort();
const profileDir=fs.mkdtempSync(path.join(os.tmpdir(),"gasi-course-e2e-"));
const chrome=spawn(chromeBinary(),[
  "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  `--remote-debugging-port=${debugPort}`,`--user-data-dir=${profileDir}`,"about:blank"
],{stdio:["ignore","ignore","pipe"]});

let stderr="";
chrome.stderr.on("data",chunk=>{stderr+=chunk.toString();});

try{
  const wsUrl=await waitForTarget(debugPort);
  const {ws,send}=await cdp(wsUrl);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Accessibility.enable");

  await navigate(send,`${origin}/curso/COURSE-E2E`,'[data-testid="curso-detalle-page"]');
  await waitFor(send,"document.body.innerText.includes('Curso E2E alumno')");
  await waitFor(send,"document.querySelector('[data-testid=\"course-materials\"]')");
  assert.equal(await value(send,"document.querySelector('[data-testid=\"course-progress\"]')?.innerText.includes('0%')"),true);
  const courseAx=await send("Accessibility.getFullAXTree");
  assert.deepEqual(unnamedInteractive(courseAx.nodes||[]),[],"Student course page has unnamed interactive controls");

  await click(send,'[data-testid="open-material-MAT-1"]');
  await waitFor(send,"document.querySelector('iframe[title=\"tema.pdf\"]')");
  assert.equal(state.materialRequests,1);
  await send("Runtime.evaluate",{expression:"document.querySelector('[role=dialog] button')?.click()"});

  await click(send,'[data-testid="complete-module-MOD-A"]');
  await waitFor(send,"document.querySelector('[data-testid=\"module-complete-MOD-A\"]')");
  await waitFor(send,"document.querySelector('[data-testid=\"course-progress\"]')?.innerText.includes('50%')");

  await click(send,'[data-testid="complete-module-MOD-B"]');
  await waitFor(send,"document.querySelector('[data-testid=\"course-completed\"]')");
  await waitFor(send,"document.querySelector('[data-testid=\"course-progress\"]')?.innerText.includes('100%')");
  assert.deepEqual([...state.completed].sort(),["MOD-A","MOD-B"]);

  await click(send,'[data-testid="download-certificate"]');
  const certificateDeadline=Date.now()+5000;
  while(state.certificateRequests<1&&Date.now()<certificateDeadline)await sleep(100);
  assert.equal(state.certificateRequests,1);

  await navigate(send,`${origin}/curso/COURSE-PAID`,'[data-testid="curso-detalle-page"]');
  await waitFor(send,"document.body.innerText.includes('Curso E2E de pago')");
  await waitFor(send,"document.querySelector('[data-testid=\"enroll-button\"]')?.innerText.includes('Comprar por 49€')");
  await click(send,'[data-testid="enroll-button"]');
  await waitFor(send,"location.pathname==='/checkout-synthetic'");
  assert.equal(state.checkoutRequests,1);
  assert.equal(state.directEnrollRequests,0);

  console.log(JSON.stringify({
    status:"PASS",
    scope:"student browser E2E: authenticated materials, progress 0→50→100, certificate request, paid checkout without direct enrollment",
    observed:{
      material_requests:state.materialRequests,
      completed_modules:[...state.completed].sort(),
      certificate_requests:state.certificateRequests,
      checkout_requests:state.checkoutRequests,
      paid_direct_enroll_requests:state.directEnrollRequests,
    }
  }));
  ws.close();
}catch(error){
  console.error(stderr);
  throw error;
}finally{
  chrome.kill("SIGTERM");
  server.close();
  try{fs.rmSync(profileDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{}
}
