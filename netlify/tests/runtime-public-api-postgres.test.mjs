import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const connectionString=process.env.GASI_INTEGRATION_DB_URL||"";
const enabled=Boolean(connectionString);
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const publicMigration=path.resolve(__dirname,"../database/migrations/20260920190000_public-web-v1/migration.sql");
const {Pool}=pg;

async function payload(response){
  const text=await response.text();
  return text?JSON.parse(text):null;
}
function cookieFrom(response){
  const values=typeof response.headers.getSetCookie==="function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  return values.map(v=>v.split(";")[0]).join("; ");
}
function request(pathname,{method="GET",cookie,body,raw,headers={}}={}){
  const h={"user-agent":"Mozilla/5.0 Chrome/153","x-nf-client-connection-ip":"10.30.0.10","origin":"http://localhost","sec-fetch-site":"same-origin",...headers};
  if(cookie)h.cookie=cookie;
  let requestBody;
  if(body instanceof FormData)requestBody=body;
  else if(raw!==undefined)requestBody=raw;
  else if(body!==undefined){h["content-type"]="application/json";requestBody=JSON.stringify(body);}
  return new Request(`http://localhost${pathname}`,{method,headers:h,body:requestBody});
}
function stripeHeader(raw,secret,timestamp=Math.floor(Date.now()/1000)){
  const sig=crypto.createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
async function snapshotPublicData(pool){
  const query=async sql=>(await pool.query(sql)).rows;
  return {
    users:await query("SELECT * FROM public_users ORDER BY id"),
    courses:await query("SELECT * FROM public_courses ORDER BY id"),
    sessions:await query("SELECT * FROM public_sessions ORDER BY id"),
    enrollments:await query("SELECT * FROM public_enrollments ORDER BY id"),
    materials:await query("SELECT * FROM public_course_materials ORDER BY material_id"),
    throttle:await query("SELECT * FROM public_login_throttle ORDER BY key_hash"),
    payments:await query("SELECT * FROM public_payment_events ORDER BY event_id")
  };
}

async function restorePublicData(pool,snapshot){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query("TRUNCATE public_course_materials,public_enrollments,public_sessions,public_login_throttle,public_payment_events,public_courses,public_users CASCADE");
    for(const r of snapshot.users)await client.query("INSERT INTO public_users(id,email,name,password_hash,picture,is_admin,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",[r.id,r.email,r.name,r.password_hash,r.picture,r.is_admin,r.created_at]);
    for(const r of snapshot.courses)await client.query("INSERT INTO public_courses(id,title,description,duration,course_type,price,is_free,thumbnail,modules,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)",[r.id,r.title,r.description,r.duration,r.course_type,r.price,r.is_free,r.thumbnail,JSON.stringify(r.modules),r.created_at,r.updated_at]);
    for(const r of snapshot.sessions)await client.query("INSERT INTO public_sessions(id,user_id,token_hash,expires_at,created_at) VALUES($1,$2,$3,$4,$5)",[r.id,r.user_id,r.token_hash,r.expires_at,r.created_at]);
    for(const r of snapshot.enrollments)await client.query("INSERT INTO public_enrollments(id,user_id,course_id,progress,completed_module_ids,completed_at,certificate_id,payment_status,stripe_checkout_session_id,stripe_event_id,enrolled_at) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11)",[r.id,r.user_id,r.course_id,r.progress,JSON.stringify(r.completed_module_ids),r.completed_at,r.certificate_id,r.payment_status,r.stripe_checkout_session_id,r.stripe_event_id,r.enrolled_at]);
    for(const r of snapshot.materials)await client.query("INSERT INTO public_course_materials(material_id,course_id,module_id,filename,content_type,size_bytes,content,status,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",[r.material_id,r.course_id,r.module_id,r.filename,r.content_type,r.size_bytes,r.content,r.status,r.created_by,r.created_at]);
    for(const r of snapshot.throttle)await client.query("INSERT INTO public_login_throttle(key_hash,failures,window_started_at,blocked_until,updated_at) VALUES($1,$2,$3,$4,$5)",[r.key_hash,r.failures,r.window_started_at,r.blocked_until,r.updated_at]);
    for(const r of snapshot.payments)await client.query("INSERT INTO public_payment_events(event_id,event_type,received_at) VALUES($1,$2,$3)",[r.event_id,r.event_type,r.received_at]);
    await client.query("COMMIT");
  }catch(error){
    await client.query("ROLLBACK");
    throw error;
  }finally{client.release();}
}

test("runtime: public same-origin API works on PostgreSQL",{skip:!enabled},async()=>{
  const adminPool=new Pool({connectionString});
  await adminPool.query("DROP SCHEMA IF EXISTS public_web_runtime CASCADE");
  await adminPool.query("CREATE SCHEMA public_web_runtime");
  const scoped=new URL(connectionString);
  scoped.searchParams.set("options","-csearch_path=public_web_runtime");
  const scopedConnectionString=scoped.toString();
  const pool=new Pool({connectionString:scopedConnectionString});
  await pool.query(fs.readFileSync(publicMigration,"utf8"));

  const secrets={
    NETLIFY_DB_URL:scopedConnectionString,
    STRIPE_SECRET_KEY:"sk_test_public_runtime",
    STRIPE_WEBHOOK_SECRET:"whsec_public_runtime",
    GASI_PUBLIC_ORIGINS:"https://gasisalud.com,https://www.gasisalud.com"
  };
  globalThis.Netlify={env:{get:name=>secrets[name]||""}};
  const {default:handler}=await import("../functions/public-api.mts?public-runtime");

  const requestLogs=[];
  const originalConsoleInfo=console.info;
  console.info=(...args)=>{
    if(args[0]==="public_api_request")requestLogs.push(args);
    else originalConsoleInfo(...args);
  };
  let res=await handler(request("/api/auth/login",{method:"POST",raw:"{",headers:{"content-type":"application/json","origin":"https://gasisalud.com","sec-fetch-site":"same-origin"}}),{});
  assert.equal(res.status,400);
  assert.equal((await payload(res)).detail,"invalid_json");

  res=await handler(request("/api/auth/login",{method:"POST",raw:"{",headers:{"content-type":"application/json","origin":"https://www.gasisalud.com","sec-fetch-site":"same-origin"}}),{});
  assert.equal(res.status,400);
  assert.equal((await payload(res)).detail,"invalid_json");

  res=await handler(request("/api/auth/login",{method:"POST",raw:"{",headers:{"content-type":"application/json","origin":"https://evil.example","sec-fetch-site":"same-origin"}}),{});
  assert.equal(res.status,403);
  assert.equal((await payload(res)).detail,"cross_site_request_rejected");
  requestLogs.length=0;

  res=await handler(request("/api/health"),{});
  assert.equal(res.status,200);
  assert.deepEqual(await payload(res),{ok:true,storage:"postgresql"});
  assert.match(res.headers.get("x-request-id")||"",/^[0-9a-f-]{36}$/i);
  assert.match(res.headers.get("server-timing")||"",/^app;dur=\d+$/);
  assert.equal(requestLogs.length,1);
  assert.equal(requestLogs[0][0],"public_api_request");
  const firstLog=JSON.parse(String(requestLogs[0][1]||"{}"));
  assert.equal(firstLog.surface,"health");
  assert.equal(firstLog.method,"GET");
  assert.equal(firstLog.status,200);
  assert.equal(firstLog.outcome,"ok");

  res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Admin Runtime",email:"admin@example.com",password:"SyntheticAdminPass123!"}}),{});
  assert.equal(res.status,201);
  let data=await payload(res);
  assert.equal(data.user.email,"admin@example.com");
  assert.equal("token" in data,false);
  const adminCookie=cookieFrom(res);
  assert.match(adminCookie,/gasi_public_session=/);
  const adminToken=decodeURIComponent(adminCookie.split("=",2)[1]||"");
  assert.ok(adminToken.length>=32);
  const adminTokenHash=crypto.createHash("sha256").update(adminToken).digest("hex");
  const storedAdminSession=(await pool.query(
    "SELECT token_hash,expires_at FROM public_sessions WHERE token_hash=$1",
    [adminTokenHash]
  )).rows[0];
  assert.ok(storedAdminSession,"registered session must be persisted");
  assert.equal(storedAdminSession.token_hash,adminTokenHash);
  assert.ok(Date.parse(storedAdminSession.expires_at)>Date.now());
  const setCookie=res.headers.get("set-cookie")||"";
  assert.match(setCookie,/HttpOnly/);
  assert.match(setCookie,/Secure/);
  assert.match(setCookie,/SameSite=Lax/);
  await pool.query("UPDATE public_users SET is_admin=TRUE WHERE lower(email)='admin@example.com'");

  const authMeRequest=request("/api/auth/me",{cookie:adminCookie});
  assert.equal(authMeRequest.headers.get("cookie"),adminCookie);
  res=await handler(authMeRequest,{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).is_admin,true);

  res=await handler(request("/api/auth/logout",{method:"POST",cookie:adminCookie,body:{},headers:{"origin":"https://evil.example","sec-fetch-site":"cross-site"}}),{});
  assert.equal(res.status,403);
  assert.equal((await payload(res)).detail,"cross_site_request_rejected");
  res=await handler(request("/api/auth/me",{cookie:adminCookie}),{});
  assert.equal(res.status,200);

  res=await handler(request("/api/auth/login",{method:"POST",body:{email:"admin@example.com",password:"x".repeat(40_000)}}),{});
  assert.equal(res.status,413);
  assert.equal((await payload(res)).detail,"request_too_large");

  for(let attempt=0;attempt<2;attempt++){
    res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Admin Runtime",email:"admin@example.com",password:"SyntheticAdminPass123!"}}),{});
    assert.equal(res.status,409);
  }
  res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Admin Runtime",email:"admin@example.com",password:"SyntheticAdminPass123!"}}),{});
  assert.equal(res.status,429);
  assert.equal((await payload(res)).detail,"too_many_registration_attempts");

  const modules=[
    {module_id:"MOD-A",title:"Módulo A",order:1,description:"A"},
    {module_id:"MOD-B",title:"Módulo B",order:2,description:"B"}
  ];
  res=await handler(request("/api/admin/courses",{method:"POST",cookie:adminCookie,body:{title:"Curso Runtime Gratis",description:"Curso PostgreSQL",duration:"2 horas",type:"Online",price:0,is_free:true,modules}}),{});
  assert.equal(res.status,201);
  const freeCourse=await payload(res);
  assert.ok(freeCourse.course_id);

  res=await handler(request("/api/admin/courses",{method:"POST",cookie:adminCookie,body:{title:"Curso Runtime Pago",description:"Curso Stripe",duration:"3 horas",type:"Online",price:49,is_free:false,modules}}),{});
  assert.equal(res.status,201);
  const paidCourse=await payload(res);

  res=await handler(request("/api/courses/"),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).length,2);

  res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Alumno Runtime",email:"student@example.com",password:"SyntheticStudentPass123!"}}),{});
  assert.equal(res.status,201);
  const studentCookie=cookieFrom(res);
  const student=(await payload(res)).user;

  res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Otro Alumno",email:"other@example.com",password:"SyntheticOtherPass123!"}}),{});
  assert.equal(res.status,201);
  const otherCookie=cookieFrom(res);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/materials`,{cookie:otherCookie}),{});
  assert.equal(res.status,403);
  assert.equal((await payload(res)).detail,"course_access_required");

  res=await handler(request("/api/courses/enroll",{method:"POST",cookie:studentCookie,body:{course_id:freeCourse.course_id}}),{});
  assert.equal(res.status,201);
  assert.equal((await payload(res)).progress,0);

  res=await handler(request("/api/courses/enroll",{method:"POST",cookie:studentCookie,body:{course_id:freeCourse.course_id}}),{});
  assert.equal(res.status,409);
  assert.equal((await payload(res)).detail,"Already enrolled");

  res=await handler(request("/api/courses/enroll",{method:"POST",cookie:studentCookie,body:{course_id:paidCourse.course_id}}),{});
  assert.equal(res.status,402);
  assert.equal((await payload(res)).detail,"payment_required");

  const form=new FormData();
  form.set("module_id","MOD-A");
  form.set("file",new File([Buffer.from("%PDF-1.4\nprivate runtime material\n")],"runtime.pdf",{type:"application/pdf"}));
  res=await handler(request(`/api/admin/courses/${freeCourse.course_id}/materials`,{method:"POST",cookie:adminCookie,body:form}),{});
  assert.equal(res.status,201);
  const material=await payload(res);
  assert.ok(material.material_id);
  assert.equal("content" in material,false);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/materials`,{cookie:studentCookie}),{});
  assert.equal(res.status,200);
  const materials=await payload(res);
  const serializedLogs=JSON.stringify(requestLogs);
  assert.equal(serializedLogs.includes(freeCourse.course_id),false);
  assert.equal(serializedLogs.includes(student.email),false);
  assert.equal(serializedLogs.includes(`/api/courses/${freeCourse.course_id}/materials`),false);
  assert.equal(materials.length,1);
  assert.equal(materials[0].filename,"runtime.pdf");
  assert.equal("content" in materials[0],false);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/materials/${material.material_id}/content`,{cookie:otherCookie}),{});
  assert.equal(res.status,403);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/materials/${material.material_id}/content`,{cookie:studentCookie}),{});
  assert.equal(res.status,200);
  assert.equal(res.headers.get("cache-control"),"private, no-store");
  assert.match(res.headers.get("content-disposition")||"",/^inline;/);
  assert.ok(Buffer.from(await res.arrayBuffer()).subarray(0,5).equals(Buffer.from("%PDF-")));

  res=await handler(request(`/api/courses/${freeCourse.course_id}/progress`,{cookie:studentCookie}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).progress,0);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/modules/MOD-A/complete`,{method:"POST",cookie:studentCookie,body:{}}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).progress,50);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/modules/MOD-A/complete`,{method:"POST",cookie:studentCookie,body:{}}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).progress,50);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/certificate`,{cookie:studentCookie}),{});
  assert.equal(res.status,409);
  assert.equal((await payload(res)).detail,"course_not_completed");

  res=await handler(request(`/api/courses/${freeCourse.course_id}/modules/MOD-B/complete`,{method:"POST",cookie:studentCookie,body:{}}),{});
  assert.equal(res.status,200);
  const finished=await payload(res);
  assert.equal(finished.progress,100);
  assert.match(finished.certificate_id,/^GASI-/);

  res=await handler(request(`/api/courses/${freeCourse.course_id}/certificate`,{cookie:studentCookie}),{});
  assert.equal(res.status,200);
  assert.equal(res.headers.get("content-type"),"application/pdf");
  const certificate=Buffer.from(await res.arrayBuffer());
  assert.ok(certificate.subarray(0,8).toString().startsWith("%PDF-1.4"));
  assert.ok(certificate.includes(Buffer.from(finished.certificate_id)));

  res=await handler(request(`/api/admin/courses/${freeCourse.course_id}`,{method:"PUT",cookie:adminCookie,body:{title:"Curso cambiado",description:"Curso PostgreSQL",duration:"2 horas",type:"Online",price:0,is_free:true,modules:[...modules,{module_id:"MOD-C",title:"Módulo C",order:3,description:"C"}]}}),{});
  assert.equal(res.status,409);
  assert.equal((await payload(res)).detail,"course_structure_locked");

  res=await handler(request(`/api/admin/courses/${freeCourse.course_id}`,{method:"DELETE",cookie:adminCookie}),{});
  assert.equal(res.status,409);
  assert.equal((await payload(res)).detail,"course_has_enrollments");

  const originalFetch=global.fetch;
  let stripeCreateCalls=0;
  global.fetch=async(url,options)=>{
    if(String(url)==="https://api.stripe.com/v1/checkout/sessions"){
      stripeCreateCalls++;
      assert.match(String(options?.headers?.authorization||""),/^Bearer sk_test_public_runtime$/);
      const body=String(options?.body||"");
      assert.match(body,new RegExp(`metadata%5Bcourse_id%5D=${paidCourse.course_id}`));
      assert.match(body,new RegExp(`metadata%5Buser_id%5D=${student.user_id}`));
      return new Response(JSON.stringify({id:"cs_runtime",url:"https://checkout.stripe.invalid/runtime"}),{status:200,headers:{"content-type":"application/json"}});
    }
    throw new Error("unexpected external fetch");
  };
  try{
    res=await handler(request(`/api/payments/create-checkout?course_id=${paidCourse.course_id}`,{method:"POST",cookie:studentCookie,body:{}}),{});
    assert.equal(res.status,200);
    assert.equal((await payload(res)).checkout_url,"https://checkout.stripe.invalid/runtime");
    assert.equal(stripeCreateCalls,1);
  }finally{global.fetch=originalFetch;}

  const event={
    id:"evt_runtime_paid",
    type:"checkout.session.completed",
    data:{object:{
      id:"cs_runtime",
      payment_status:"paid",
      metadata:{course_id:paidCourse.course_id,user_id:student.user_id}
    }}
  };
  const raw=JSON.stringify(event);
  const signature=stripeHeader(raw,secrets.STRIPE_WEBHOOK_SECRET);
  res=await handler(request("/api/payments/webhook",{method:"POST",raw,headers:{"content-type":"application/json","stripe-signature":signature}}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).status,"success");

  res=await handler(request("/api/payments/webhook",{method:"POST",raw,headers:{"content-type":"application/json","stripe-signature":signature}}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).status,"success");
  const paidCount=(await pool.query("SELECT COUNT(*)::int n FROM public_enrollments WHERE user_id=$1 AND course_id=$2",[student.user_id,paidCourse.course_id])).rows[0].n;
  assert.equal(paidCount,1);
  const eventCount=(await pool.query("SELECT COUNT(*)::int n FROM public_payment_events WHERE event_id='evt_runtime_paid'")).rows[0].n;
  assert.equal(eventCount,1);

  res=await handler(request("/api/courses/enrollments/my",{cookie:studentCookie}),{});
  assert.equal(res.status,200);
  const enrollments=await payload(res);
  assert.equal(enrollments.length,2);
  assert.ok(enrollments.some(x=>x.course.course_id===paidCourse.course_id&&x.enrollment.payment_status==="completed"));

  const recoverySnapshot=await snapshotPublicData(pool);
  const snapshotCounts=Object.fromEntries(Object.entries(recoverySnapshot).map(([key,rows])=>[key,rows.length]));
  const expectedMaterial=Buffer.from(recoverySnapshot.materials[0].content);
  await pool.query("TRUNCATE public_course_materials,public_enrollments,public_sessions,public_login_throttle,public_payment_events,public_courses,public_users CASCADE");
  assert.equal((await pool.query("SELECT COUNT(*)::int n FROM public_users")).rows[0].n,0);
  assert.equal((await pool.query("SELECT COUNT(*)::int n FROM public_courses")).rows[0].n,0);

  await restorePublicData(pool,recoverySnapshot);
  const restoredSnapshot=await snapshotPublicData(pool);
  const restoredCounts=Object.fromEntries(Object.entries(restoredSnapshot).map(([key,rows])=>[key,rows.length]));
  assert.deepEqual(restoredCounts,snapshotCounts);
  assert.equal(Buffer.compare(Buffer.from(restoredSnapshot.materials[0].content),expectedMaterial),0);
  assert.ok(restoredSnapshot.enrollments.some(row=>row.user_id===student.user_id&&row.course_id===paidCourse.course_id&&row.payment_status==="completed"));
  assert.ok(restoredSnapshot.enrollments.some(row=>row.user_id===student.user_id&&row.course_id===freeCourse.course_id&&Number(row.progress)===100&&row.certificate_id===finished.certificate_id));
  assert.ok(restoredSnapshot.payments.some(row=>row.event_id==="evt_runtime_paid"));

  res=await handler(request("/api/auth/me",{cookie:adminCookie}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).is_admin,true);
  res=await handler(request("/api/auth/me",{cookie:studentCookie}),{});
  assert.equal(res.status,200);

  res=await handler(request(`/api/admin/users/${student.user_id}/make-admin`,{method:"POST",cookie:adminCookie,body:{}}),{});
  assert.equal(res.status,403);
  assert.equal((await payload(res)).detail,"admin_escalation_disabled");

  res=await handler(request("/api/auth/logout",{method:"POST",cookie:studentCookie,body:{}}),{});
  assert.equal(res.status,200);
  assert.match(res.headers.get("set-cookie")||"",/Max-Age=0/);
  res=await handler(request("/api/auth/me",{cookie:studentCookie}),{});
  assert.equal(res.status,401);

  const sessionRows=(await pool.query("SELECT COUNT(*)::int n FROM public_sessions WHERE user_id=$1",[student.user_id])).rows[0].n;
  assert.equal(sessionRows,0);

  console.info=originalConsoleInfo;
  await pool.end();
  await adminPool.query("DROP SCHEMA IF EXISTS public_web_runtime CASCADE");
  await adminPool.end();
});
