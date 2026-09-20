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

const contentType=file=>{
  const ext=path.extname(file).toLowerCase();
  return ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webp":"image/webp"}[ext]||"application/octet-stream");
};

async function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>{const address=server.address();const port=typeof address==="object"&&address?address.port:0;server.close(err=>err?reject(err):resolve(port));});
  });
}

async function startStaticServer(){
  assert.ok(fs.existsSync(path.join(buildDir,"index.html")),"frontend/build missing; run yarn build before browser E2E");
  const server=http.createServer((req,res)=>{
    const u=new URL(req.url||"/","http://127.0.0.1");
    if(u.pathname.includes("/api/courses/")){
      res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
      res.end("[]");return;
    }
    if(u.pathname.startsWith("/api/internal-clinical/")){
      res.writeHead(401,{"content-type":"application/json","cache-control":"no-store"});
      res.end(JSON.stringify({detail:"missing_session"}));return;
    }
    let target=path.join(buildDir,decodeURIComponent(u.pathname));
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
  const port=await freePort();
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(port,"127.0.0.1",resolve);});
  return {server,origin:`http://127.0.0.1:${port}`};
}

function chromeBinary(){
  const candidates=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
  const found=candidates.find(p=>fs.existsSync(p));
  assert.ok(found,`Chrome/Chromium not found. Checked: ${candidates.join(", ")}`);
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
      const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
      if(msg.error)reject(new Error(`${msg.error.code}: ${msg.error.message}`));else resolve(msg.result||{});
    }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const messageId=++id;pending.set(messageId,{resolve,reject});ws.send(JSON.stringify({id:messageId,method,params}));});
  return {ws,send};
}

async function waitFor(send,expression,timeout=10000){
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

async function key(send,key,code,virtualKeyCode){
  await send("Input.dispatchKeyEvent",{type:"rawKeyDown",key,code,windowsVirtualKeyCode:virtualKeyCode,nativeVirtualKeyCode:virtualKeyCode});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:virtualKeyCode,nativeVirtualKeyCode:virtualKeyCode});
  await sleep(50);
}

async function tabUntil(send,testId,max=30){
  await send("Runtime.evaluate",{expression:"document.activeElement?.blur?.()"});
  for(let i=0;i<max;i++){
    await key(send,"Tab","Tab",9);
    const current=await value(send,"document.activeElement?.getAttribute?.('data-testid')||''");
    if(current===testId)return i+1;
  }
  throw new Error(`Keyboard focus never reached ${testId}`);
}

function axHas(nodes,role,name){
  return nodes.some(n=>n.role?.value===role&&n.name?.value===name&&!n.ignored);
}

const {server,origin}=await startStaticServer();
const debugPort=await freePort();
const profileDir=fs.mkdtempSync(path.join(os.tmpdir(),"gasi-browser-e2e-"));
const chrome=spawn(chromeBinary(),[
  "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  `--remote-debugging-port=${debugPort}`,`--user-data-dir=${profileDir}`,"about:blank"
],{stdio:["ignore","ignore","pipe"]});
let chromeStderr="";
chrome.stderr.on("data",chunk=>{chromeStderr+=chunk.toString();});

try{
  const wsUrl=await waitForTarget(debugPort);
  const {ws,send}=await cdp(wsUrl);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Accessibility.enable");

  await navigate(send,`${origin}/acceso`,'[data-testid="access-portal"]');
  const landing=await value(send,"document.body.innerText");
  assert.match(landing,/\bAcceder\b/);
  assert.match(landing,/Alumnado/);
  assert.match(landing,/Equipo GASI/);
  assert.doesNotMatch(landing,/Acceso profesional/);

  const hrefs=await value(send,"JSON.stringify({student:document.querySelector('[data-testid=\"access-student\"]')?.getAttribute('href'),team:document.querySelector('[data-testid=\"access-team\"]')?.getAttribute('href')})");
  assert.deepEqual(JSON.parse(hrefs),{student:"/formacion-sanitaria",team:"/interno/acceso"});

  const ax=await send("Accessibility.getFullAXTree");
  assert.ok(axHas(ax.nodes||[],"link","Entrar al aula"),"Student destination missing from browser accessibility tree");
  assert.ok(axHas(ax.nodes||[],"link","Entrar al área de equipo"),"Team destination missing from browser accessibility tree");

  await tabUntil(send,"access-student");
  const studentFocus=await value(send,"JSON.stringify({id:document.activeElement?.getAttribute('data-testid'),shadow:getComputedStyle(document.activeElement).boxShadow})");
  const focused=JSON.parse(studentFocus);
  assert.equal(focused.id,"access-student");
  assert.notEqual(focused.shadow,"none","Keyboard focus must be visibly rendered on student access");

  await key(send,"Tab","Tab",9);
  assert.equal(await value(send,"document.activeElement?.getAttribute('data-testid')"),"access-team","Team access must follow student access in keyboard order");
  await key(send,"Enter","Enter",13);
  await waitFor(send,"location.pathname==='/interno/acceso'");
  await waitFor(send,"document.body.innerText.includes('Acceso al equipo GASI')");
  const teamLogin=await value(send,"document.body.innerText");
  assert.match(teamLogin,/Acceso al equipo GASI/);
  assert.match(teamLogin,/Identificador de acceso/);
  assert.doesNotMatch(teamLogin,/Acceso profesional/);

  await navigate(send,`${origin}/acceso`,'[data-testid="access-portal"]');
  await tabUntil(send,"access-student");
  await key(send,"Enter","Enter",13);
  await waitFor(send,"location.pathname==='/formacion-sanitaria'");
  await waitFor(send,"document.querySelector('[data-testid=\"auth-modal\"]')");
  const modal=await value(send,"document.querySelector('[data-testid=\"auth-modal\"]')?.innerText||''");
  assert.match(modal,/Iniciar Sesión/);
  assert.match(modal,/Email/);
  assert.match(modal,/Contraseña/);

  console.log(JSON.stringify({
    status:"PASS",
    scope:"production-build browser E2E: generic access gateway, keyboard order/focus, accessibility tree, student/team routing",
    origin,
    chrome:chromeBinary(),
    observed:{
      public_entry:"Acceder",
      student_destination:"/formacion-sanitaria + login modal",
      team_destination:"/interno/acceso + team-specific login",
      accessibility_links:["Entrar al aula","Entrar al área de equipo"]
    }
  }));
  ws.close();
}catch(error){
  console.error(chromeStderr);
  throw error;
}finally{
  chrome.kill("SIGTERM");
  server.close();
  try{fs.rmSync(profileDir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{}
}
