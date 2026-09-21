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
  closeRequests:0,
  episode:{
    id:"EP-E2E-OPEN",
    center:"CENTER-E2E",
    patient_ref:"SYNTH-PAT-E2E",
    discipline:"nursing",
    level:2,
    status:"RESPONDIDO",
    summary:"Synthetic browser clinical episode",
    created_by_id:"NURSE-E2E",
    created_at:"2026-09-20T15:00:00Z",
    responded_at:"2026-09-20T15:10:00Z",
    responded_by_id:"PHYS-E2E",
    responses:[{
      id:"RESP-E2E",
      author_id:"PHYS-E2E",
      created_at:"2026-09-20T15:10:00Z",
      text:"Synthetic physician response",
      status:"EMITIDA",
      status_history:[],
      corrections:[]
    }],
    addenda:[],
    delivery_history:[],
    level_history:[],
    disposition_events:[]
  }
};

const json=(res,status,body)=>{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(body));
};

const contentType=file=>{
  const ext=path.extname(file).toLowerCase();
  return ({".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webp":"image/webp"}[ext]||"application/octet-stream");
};

async function readBody(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

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
  const server=http.createServer(async(req,res)=>{
    const u=new URL(req.url||"/",origin);
    const p=u.pathname;

    if(p==="/api/internal-clinical/login"&&req.method==="POST"){
      const body=JSON.parse(await readBody(req));
      assert.equal(body.worker_id,"NURSE-E2E");
      assert.equal(typeof body.password,"string");
      json(res,200,{
        token:"synthetic-clinical-token",
        expires_at:"2026-09-20T23:00:00Z",
        profile:{
          id:"NURSE-E2E",
          tenant_id:"TENANT-E2E",
          role:"nurse",
          display_name:"Enfermería E2E",
          centers:["CENTER-E2E"],
          operational_state:"ACTIVE",
          delegated_privileges:[],
          must_change_password:false
        }
      });
      return;
    }

    if(p==="/api/internal-clinical/contingency"&&req.method==="GET"){
      json(res,200,[]);return;
    }

    if(p==="/api/internal-clinical/episodes"&&req.method==="GET"){
      json(res,200,[
        {
          id:state.episode.id,
          center:state.episode.center,
          patient_ref:"MUST-NOT-RENDER-IN-LIST",
          summary:"MUST-NOT-RENDER-IN-LIST",
          discipline:"nursing",
          level:2,
          status:state.episode.status,
          created_at:state.episode.created_at
        },
        {
          id:"EP-E2E-CLOSED",
          center:"CENTER-E2E",
          patient_ref:"CLOSED-PATIENT-MUST-NOT-RENDER",
          summary:"CLOSED-SUMMARY-MUST-NOT-RENDER",
          discipline:"nursing",
          level:3,
          status:"CERRADO",
          created_at:"2026-09-20T14:00:00Z"
        }
      ]);
      return;
    }

    if(p==="/api/internal-clinical/episodes/EP-E2E-OPEN"&&req.method==="GET"){
      json(res,200,state.episode);return;
    }

    if(p==="/api/internal-clinical/episodes/EP-E2E-OPEN/close"&&req.method==="POST"){
      const body=JSON.parse(await readBody(req));
      assert.equal(body.follow_up_pending,false);
      assert.equal(body.handoff_required,false);
      assert.equal(body.acknowledgement_required,false);
      state.closeRequests++;
      state.episode={
        ...state.episode,
        status:"CERRADO",
        closed_at:"2026-09-20T15:30:00Z",
        closed_by_id:"NURSE-E2E"
      };
      json(res,200,state.episode);return;
    }

    if(p==="/api/internal-clinical/logout"&&req.method==="POST"){
      json(res,200,{ok:true});return;
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
  return{server,origin};
}

function chromeBinary(){
  const candidates=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
  const found=candidates.find(p=>fs.existsSync(p));
  assert.ok(found,"Chrome/Chromium not found");
  return found;
}

async function waitForTarget(port){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{
      const response=await fetch(`http://127.0.0.1:${port}/json/list`);
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
    const messageId=++id;pending.set(messageId,{resolve,reject});
    ws.send(JSON.stringify({id:messageId,method,params}));
  });
  return{ws,send};
}

async function waitFor(send,expr,timeout=12000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    const result=await send("Runtime.evaluate",{expression:`Boolean(${expr})`,returnByValue:true});
    if(result.result?.value===true)return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${expr}`);
}

async function value(send,expr){
  const result=await send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error(result.exceptionDetails.text||"Runtime evaluation failed");
  return result.result?.value;
}

async function navigate(send,url,selector){
  await send("Page.navigate",{url});
  await waitFor(send,`document.readyState==="complete"`);
  if(selector)await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
}

async function setInput(send,selector,text){
  const expression=`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error("missing input");const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;setter.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event("input",{bubbles:true}));})()`;
  await send("Runtime.evaluate",{expression});
}

async function click(send,selector){
  await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
  await send("Runtime.evaluate",{expression:`document.querySelector(${JSON.stringify(selector)}).click()`});
}

async function key(send,key,code,virtualKeyCode){
  await send("Input.dispatchKeyEvent",{type:"rawKeyDown",key,code,windowsVirtualKeyCode:virtualKeyCode,nativeVirtualKeyCode:virtualKeyCode});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:virtualKeyCode,nativeVirtualKeyCode:virtualKeyCode});
  await sleep(40);
}

async function tabUntilHref(send,href,max=60){
  await send("Runtime.evaluate",{expression:"document.activeElement?.blur?.()"});
  for(let i=0;i<max;i++){
    await key(send,"Tab","Tab",9);
    const current=await value(send,"document.activeElement?.getAttribute?.('href')||''");
    if(current===href)return i+1;
  }
  throw new Error(`Keyboard focus never reached ${href}`);
}

function unnamedInteractive(nodes){
  const interactive=new Set(["button","link","textbox","combobox","checkbox","radio","switch","menuitem","tab"]);
  return nodes
    .filter(n=>!n.ignored&&interactive.has(String(n.role?.value||""))&&!String(n.name?.value||"").trim())
    .map(n=>String(n.role?.value||"unknown"));
}

const {server,origin}=await startServer();
const debugPort=await freePort();
const profileDir=fs.mkdtempSync(path.join(os.tmpdir(),"gasi-clinical-e2e-"));
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

  await navigate(send,`${origin}/interno/clinica`);
  await waitFor(send,"location.pathname==='/interno/acceso'");
  await waitFor(send,"document.body.innerText.includes('Acceso al equipo GASI')");

  await setInput(send,'input[autocomplete="username"]',"NURSE-E2E");
  await setInput(send,'input[autocomplete="current-password"]',"SyntheticNursePassword123!");
  await send("Runtime.evaluate",{expression:"document.querySelector('main form').requestSubmit()"});
  await waitFor(send,"location.pathname==='/interno/clinica'");
  await waitFor(send,"document.body.innerText.includes('Canal asistencial')");
  await waitFor(send,"document.body.innerText.includes('EP-E2E-OPEN')");

  const clinicalList=await value(send,"document.body.innerText");
  assert.match(clinicalList,/Enfermería E2E · Enfermería/);
  assert.match(clinicalList,/Nuevo episodio/);
  assert.match(clinicalList,/Mi perfil/);
  assert.match(clinicalList,/Fichaje/);
  assert.doesNotMatch(clinicalList,/Usuarios y accesos/);
  assert.doesNotMatch(clinicalList,/Puestos|Control fichajes|Auditoría|Backup/);
  assert.match(clinicalList,/Pendientes \(1\)/);
  assert.match(clinicalList,/Cerrados \(1\)/);
  assert.doesNotMatch(clinicalList,/MUST-NOT-RENDER-IN-LIST|CLOSED-PATIENT-MUST-NOT-RENDER|CLOSED-SUMMARY-MUST-NOT-RENDER/);

  const listAx=await send("Accessibility.getFullAXTree");
  assert.deepEqual(unnamedInteractive(listAx.nodes||[]),[],"Authenticated clinical list has unnamed interactive controls");

  await tabUntilHref(send,"/interno/clinica/caso/EP-E2E-OPEN");
  const focusStyle=JSON.parse(await value(send,"JSON.stringify({outline:getComputedStyle(document.activeElement).outlineStyle,shadow:getComputedStyle(document.activeElement).boxShadow})"));
  assert.ok(focusStyle.outline!=="none"||focusStyle.shadow!=="none","Episode link must have visible keyboard focus");
  await key(send,"Enter","Enter",13);
  await waitFor(send,"location.pathname==='/interno/clinica/caso/EP-E2E-OPEN'");
  await waitFor(send,"document.body.innerText.includes('SYNTH-PAT-E2E')");
  await waitFor(send,"document.body.innerText.includes('Synthetic browser clinical episode')");

  const detailAx=await send("Accessibility.getFullAXTree");
  assert.deepEqual(unnamedInteractive(detailAx.nodes||[]),[],"Focused clinical episode has unnamed interactive controls");

  const closeButtonExpr=`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Cerrar episodio'))`;
  await waitFor(send,`${closeButtonExpr}?.disabled===true`);
  const noFollowUpExpr=`[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Confirmo que no queda seguimiento pendiente'))?.querySelector('input[type="checkbox"]')`;
  await send("Runtime.evaluate",{expression:`${noFollowUpExpr}.click()`});
  await waitFor(send,`${closeButtonExpr}?.disabled===false`);

  await send("Runtime.evaluate",{expression:"window.__confirmCount=0;window.confirm=()=>{window.__confirmCount++;return false;}"});
  await send("Runtime.evaluate",{expression:`${closeButtonExpr}.click()`});
  await waitFor(send,"document.body.innerText.includes('Cierre cancelado.')");
  assert.equal(state.closeRequests,0);
  assert.equal(await value(send,"window.__confirmCount"),1);

  await send("Runtime.evaluate",{expression:"window.confirm=()=>{window.__confirmCount++;return true;}"});
  await send("Runtime.evaluate",{expression:`${closeButtonExpr}.click()`});
  const closeDeadline=Date.now()+5000;
  while(state.closeRequests<1&&Date.now()<closeDeadline)await sleep(100);
  assert.equal(state.closeRequests,1);
  await waitFor(send,"document.body.innerText.includes('CERRADO')");
  assert.equal(await value(send,"window.__confirmCount"),2);
  assert.equal(await value(send,`Boolean(${closeButtonExpr})`),false,"Clinical actions must disappear after closure");

  console.log(JSON.stringify({
    status:"PASS",
    scope:"authenticated clinical browser E2E: guard/login, nurse least privilege, metadata-only queue, keyboard/accessibility, focused narrative and confirmed close",
    observed:{
      unauthenticated_redirect:"/interno/acceso",
      authenticated_route:"/interno/clinica",
      role:"nurse",
      pending_visible:1,
      closed_visible:1,
      narrative_hidden_from_collection:true,
      unnamed_interactive_controls:0,
      close_cancel_requests:0,
      close_confirmed_requests:state.closeRequests,
      closure_confirmations:2
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
