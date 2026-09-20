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
  const h={"user-agent":"Mozilla/5.0 Chrome/153","x-nf-client-connection-ip":"10.30.0.10",...headers};
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
    STRIPE_WEBHOOK_SECRET:"whsec_public_runtime"
  };
  globalThis.Netlify={env:{get:name=>secrets[name]||""}};
  const {default:handler}=await import("../functions/public-api.mts?public-runtime");

  let res=await handler(request("/api/health"),{});
  assert.equal(res.status,200);
  assert.deepEqual(await payload(res),{ok:true,storage:"postgresql"});

  res=await handler(request("/api/auth/register",{method:"POST",body:{name:"Admin Runtime",email:"admin@example.com",password:"SyntheticAdminPass123!"}}),{});
  assert.equal(res.status,201);
  let data=await payload(res);
  assert.equal(data.user.email,"admin@example.com");
  assert.equal("token" in data,false);
  const adminCookie=cookieFrom(res);
  assert.match(adminCookie,/gasi_public_session=/);
  const setCookie=res.headers.get("set-cookie")||"";
  assert.match(setCookie,/HttpOnly/);
  assert.match(setCookie,/Secure/);
  assert.match(setCookie,/SameSite=Lax/);
  await pool.query("UPDATE public_users SET is_admin=TRUE WHERE lower(email)='admin@example.com'");

  res=await handler(request("/api/auth/me",{cookie:adminCookie}),{});
  assert.equal(res.status,200);
  assert.equal((await payload(res)).is_admin,true);

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

  await pool.end();
  await adminPool.query("DROP SCHEMA IF EXISTS public_web_runtime CASCADE");
  await adminPool.end();
});
