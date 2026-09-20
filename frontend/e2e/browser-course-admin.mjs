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
const state={isAdmin:false,courses:[],materials:[],createRequests:0,uploadRequests:0,deleteMaterialRequests:0,deleteCourseRequests:0};

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
      const a=server.address();
      const port=typeof a==="object"&&a?a.port:0;
      server.close(err=>err?reject(err):resolve(port));
    });
  });
}

async function readBody(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function startServer(){
  assert.ok(fs.existsSync(path.join(buildDir,"index.html")),"frontend/build missing");
  const port=await freePort();
  const origin=`http://127.0.0.1:${port}`;
  const server=http.createServer(async(req,res)=>{
    const u=new URL(req.url||"/",origin);
    const p=u.pathname;

    if(p.includes("/api/auth/me")){
      json(res,200,{user_id:state.isAdmin?"ADMIN-E2E":"STUDENT-E2E",email:state.isAdmin?"admin@example.com":"student@example.com",name:state.isAdmin?"Admin E2E":"Alumno E2E",is_admin:state.isAdmin,created_at:"2026-09-20T12:00:00+00:00"});
      return;
    }
    if(p.includes("/api/courses/enrollments/my")){
      json(res,200,[]);return;
    }
    if(p.endsWith("/api/courses/")&&req.method==="GET"){
      json(res,200,state.courses);return;
    }
    const materialList=p.match(/\/api\/admin\/courses\/([^/]+)\/materials$/);
    if(materialList&&req.method==="GET"){
      json(res,200,state.materials.filter(x=>x.course_id===materialList[1]));return;
    }
    if(p.endsWith("/api/admin/courses")&&req.method==="POST"){
      assert.equal(state.isAdmin,true);
      const body=JSON.parse((await readBody(req)).toString("utf8"));
      state.createRequests++;
      const course={course_id:"COURSE-ADMIN-E2E",...body,created_at:"2026-09-20T12:00:00+00:00"};
      state.courses=[course];
      json(res,200,course);return;
    }
    const upload=p.match(/\/api\/admin\/courses\/([^/]+)\/materials$/);
    if(upload&&req.method==="POST"){
      assert.equal(state.isAdmin,true);
      const body=await readBody(req);
      assert.ok(body.includes(Buffer.from("%PDF-1.4")),"uploaded multipart body must contain the synthetic PDF");
      state.uploadRequests++;
      const moduleId=state.courses[0]?.modules?.[0]?.module_id;
      const material={material_id:"MAT-ADMIN-E2E",course_id:upload[1],module_id:moduleId,filename:"admin-e2e.pdf",content_type:"application/pdf",size:32,status:"ACTIVE",created_at:"2026-09-20T12:00:00+00:00"};
      state.materials=[material];
      json(res,200,material);return;
    }
    const delMaterial=p.match(/\/api\/admin\/courses\/([^/]+)\/materials\/([^/]+)$/);
    if(delMaterial&&req.method==="DELETE"){
      assert.equal(state.isAdmin,true);
      state.deleteMaterialRequests++;
      state.materials=state.materials.filter(x=>x.material_id!==delMaterial[2]);
      json(res,200,{message:"Material deleted successfully"});return;
    }
    const delCourse=p.match(/\/api\/admin\/courses\/([^/]+)$/);
    if(delCourse&&req.method==="DELETE"){
      assert.equal(state.isAdmin,true);
      if(state.materials.some(x=>x.course_id===delCourse[1])){
        json(res,409,{detail:"course_has_materials"});return;
      }
      state.deleteCourseRequests++;
      state.courses=state.courses.filter(x=>x.course_id!==delCourse[1]);
      json(res,200,{message:"Course deleted successfully"});return;
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

async function navigate(send,url,selector){
  await send("Page.navigate",{url});
  await waitFor(send,`document.readyState==="complete"`);
  if(selector)await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
}

async function click(send,selector){
  await waitFor(send,`document.querySelector(${JSON.stringify(selector)})`);
  await send("Runtime.evaluate",{expression:`document.querySelector(${JSON.stringify(selector)}).click()`});
}

async function setValue(send,selector,value){
  const expression=`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw new Error("missing input");const proto=el.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value").set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event("input",{bubbles:true}));})()`;
  await send("Runtime.evaluate",{expression});
}

const {server,origin}=await startServer();
const debugPort=await freePort();
const profileDir=fs.mkdtempSync(path.join(os.tmpdir(),"gasi-admin-e2e-"));
const pdfPath=path.join(profileDir,"admin-e2e.pdf");
fs.writeFileSync(pdfPath,Buffer.from("%PDF-1.4\nsynthetic admin material\n"));
const chrome=spawn(chromeBinary(),[
  "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  `--remote-debugging-port=${debugPort}`,`--user-data-dir=${profileDir}/chrome`,"about:blank"
],{stdio:["ignore","ignore","pipe"]});

let stderr="";
chrome.stderr.on("data",d=>{stderr+=d.toString();});

try{
  const wsUrl=await waitForTarget(debugPort);
  const {ws,send}=await cdp(wsUrl);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");

  state.isAdmin=false;
  await navigate(send,`${origin}/dashboard/admin/cursos`);
  await waitFor(send,"location.pathname==='/dashboard'");
  assert.equal(await send("Runtime.evaluate",{expression:"Boolean(document.querySelector('[data-testid=\"admin-courses-page\"]'))",returnByValue:true}).then(r=>r.result.value),false);

  state.isAdmin=true;
  await navigate(send,`${origin}/dashboard/admin/cursos`,'[data-testid="admin-courses-page"]');
  await click(send,'[data-testid="admin-new-course"]');
  await setValue(send,'[data-testid="admin-course-title"]',"Curso Admin E2E");
  await setValue(send,'[data-testid="admin-course-duration"]',"3 horas");
  await setValue(send,'[data-testid="admin-course-description"]',"Curso creado desde navegador real");
  await click(send,'[data-testid="admin-add-module"]');
  await setValue(send,'[data-testid="admin-module-title-0"]',"Módulo E2E");
  await click(send,'[data-testid="admin-save-course"]');

  const createDeadline=Date.now()+6000;
  while(state.createRequests<1&&Date.now()<createDeadline)await sleep(100);
  assert.equal(state.createRequests,1);
  await waitFor(send,"document.body.innerText.includes('Curso Admin E2E')");
  await waitFor(send,"document.querySelector('[data-testid=\"admin-material-file-0\"]')");

  const doc=await send("DOM.getDocument");
  const fileNode=await send("DOM.querySelector",{nodeId:doc.root.nodeId,selector:'[data-testid="admin-material-file-0"]'});
  assert.ok(fileNode.nodeId,"file input missing");
  await send("DOM.setFileInputFiles",{nodeId:fileNode.nodeId,files:[pdfPath]});
  const uploadDeadline=Date.now()+6000;
  while(state.uploadRequests<1&&Date.now()<uploadDeadline)await sleep(100);
  assert.equal(state.uploadRequests,1);
  await waitFor(send,"document.querySelector('[data-testid=\"admin-delete-material-MAT-ADMIN-E2E\"]')");

  await send("Runtime.evaluate",{expression:"window.confirm=()=>true"});
  await click(send,'[data-testid="admin-delete-material-MAT-ADMIN-E2E"]');
  const deleteMaterialDeadline=Date.now()+6000;
  while(state.deleteMaterialRequests<1&&Date.now()<deleteMaterialDeadline)await sleep(100);
  assert.equal(state.deleteMaterialRequests,1);
  assert.equal(state.materials.length,0);

  await click(send,'[data-testid="admin-delete-course"]');
  const deleteCourseDeadline=Date.now()+6000;
  while(state.deleteCourseRequests<1&&Date.now()<deleteCourseDeadline)await sleep(100);
  assert.equal(state.deleteCourseRequests,1);
  assert.equal(state.courses.length,0);

  console.log(JSON.stringify({
    status:"PASS",
    scope:"public admin browser E2E: non-admin denial, course/module creation, private PDF upload, material deletion, empty course deletion",
    observed:{
      create_requests:state.createRequests,
      upload_requests:state.uploadRequests,
      delete_material_requests:state.deleteMaterialRequests,
      delete_course_requests:state.deleteCourseRequests,
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
