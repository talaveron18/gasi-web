import test,{before,after} from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import aulaDemo from "./aula-demo.mts";

const host="https://deploy-preview-39--aula-gasi-synthetic.netlify.app";
const password=crypto.randomBytes(20).toString("base64url"); // generated at test time; no committed credential
const credentials=["admin","author","tutor","student"].map(role=>({email:role+"@example.invalid",name:"Prueba "+role,role,password}));
const key=crypto.randomBytes(32).toString("base64url");
before(()=>{
  process.env.GASI_AULA_DEMO_ACCOUNTS=JSON.stringify(credentials);
  process.env.GASI_AULA_DEMO_SESSION_SECRET=key;
});
after(()=>{
  delete process.env.GASI_AULA_DEMO_ACCOUNTS;
  delete process.env.GASI_AULA_DEMO_SESSION_SECRET;
});
const req=(path,method="GET",payload=null,cookie="")=>new Request(host+"/.netlify/functions/aula-demo?path="+encodeURIComponent(path),{
  method,headers:{...(payload?{"content-type":"application/json","origin":host}:{}),...(cookie?{"cookie":cookie}:{})},
  body:payload?JSON.stringify(payload):undefined
});
const login=async role=>{
  const result=await aulaDemo(req("/auth/login","POST",{email:role+"@example.invalid",password}),{});
  assert.equal(result.status,200);
  const setCookie=result.headers.get("set-cookie");
  assert.match(setCookie,/HttpOnly; Secure; SameSite=Strict/);
  return setCookie.split(";")[0];
};
test("refuses non-preview and missing secrets",async()=>{
  const response=await aulaDemo(new Request("https://gasisalud.com/.netlify/functions/aula-demo?path=%2Fhealth"),{});
  assert.equal(response.status,503);
});
test("rejects anonymous and incorrect synthetic credentials",async()=>{
  assert.equal((await aulaDemo(req("/my/courses"),{})).status,401);
  assert.equal((await aulaDemo(req("/auth/login","POST",{email:"student@example.invalid",password:"incorrect"}),{})).status,401);
});
test("allows fictitious student to progress sequentially but not to skip a locked unit",async()=>{
  let cookie=await login("student");
  const me=await aulaDemo(req("/auth/me","GET",null,cookie),{});
  assert.equal((await me.json()).user.role,"student");
  const listing=await aulaDemo(req("/my/courses","GET",null,cookie),{});
  const courseId=(await listing.json()).courses[0].id;
  let outline=await (await aulaDemo(req("/courses/"+courseId,"GET",null,cookie),{})).json();
  assert.deepEqual(outline.units.map(u=>u.open),[true,false,false]);
  assert.equal((await aulaDemo(req("/courses/"+courseId+"/units/"+outline.units[1].id,"GET",null,cookie),{})).status,423);
  const first=await aulaDemo(req("/courses/"+courseId+"/units/"+outline.units[0].id,"GET",null,cookie),{});
  assert.equal(first.status,200);
  let saved=await aulaDemo(req("/courses/"+courseId+"/units/"+outline.units[0].id+"/complete","POST",{},cookie),{});
  assert.equal(saved.status,200);
  cookie=saved.headers.get("set-cookie").split(";")[0];
  outline=await (await aulaDemo(req("/courses/"+courseId,"GET",null,cookie),{})).json();
  assert.deepEqual(outline.units.map(u=>u.open),[true,true,false]);
  saved=await aulaDemo(req("/courses/"+courseId+"/units/"+outline.units[1].id+"/complete","POST",{},cookie),{});
  assert.equal(saved.status,200);
  cookie=saved.headers.get("set-cookie").split(";")[0];
  outline=await (await aulaDemo(req("/courses/"+courseId,"GET",null,cookie),{})).json();
  assert.deepEqual(outline.units.map(u=>u.open),[true,true,true]);
  assert.equal((await aulaDemo(req("/courses/"+courseId+"/units/"+outline.units[2].id+"/complete","POST",{},cookie),{})).status,423);
});
test("admin and tutor can view fictitious courses but synthetic demo cannot write",async()=>{
  const admin=await login("admin");
  const listing=await (await aulaDemo(req("/my/courses","GET",null,admin),{})).json();
  assert.equal(listing.courses.length,1);
  assert.equal((await aulaDemo(req("/admin/users","GET",null,admin),{})).status,200);
  assert.equal((await aulaDemo(req("/admin/courses","POST",{title:"Unsafe"},admin),{})).status,409);
  const tutor=await login("tutor");
  assert.equal((await aulaDemo(req("/admin/users","GET",null,tutor),{})).status,409);
});
