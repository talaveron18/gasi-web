import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {getDatabase} from "@netlify/database";
import aulaApi from "../functions/aula.mts";

const url=process.env.GASI_INTEGRATION_DB_URL;
const db=url?getDatabase({connectionString:url}):null;
const base="http://localhost";
const password=crypto.randomBytes(20).toString("base64url");
const nextPassword=crypto.randomBytes(20).toString("base64url");
const email=crypto.randomBytes(5).toString("hex");
const headers=(cookie="",write=false)=>({
  ...(cookie?{cookie}:{}),
  ...(write?{"content-type":"application/json",origin:base}:{})
});
const call=async(path,{method="GET",body=null,cookie=""}={})=>{
  const req=new Request(base+"/api/aula"+path,{method,headers:headers(cookie,method!=="GET"),body:method==="GET"?undefined:JSON.stringify(body??{})});
  const response=await aulaApi(req,{});
  const contentType=response.headers.get("content-type");
  assert.match(contentType,/application\/json/);
  return {status:response.status,data:await response.json(),cookie:response.headers.get("set-cookie")?.split(";")[0]||""};
};
const expectStatus=(result,status)=>{assert.equal(result.status,status,JSON.stringify(result.data));return result.data;};
async function query(sql,params=[]){const client=await db.pool.connect();try{return (await client.query(sql,params)).rows;}finally{client.release();}}

test("private Aula: real Postgres auth, roles, unit zero, enrolment, locking, and progress",{
 skip:!url?"requires ephemeral GASI_INTEGRATION_DB_URL":false
},async()=>{
  process.env.GASI_AULA_DB_URL=url;
  const adminEmail="admin-"+email+"@example.invalid";
  const studentEmail="student-"+email+"@example.invalid";
  const tutorEmail="tutor-"+email+"@example.invalid";
  const user=(await query("INSERT INTO aula_users(name,email,role,password_hash,must_change_password) VALUES($1,$2,'admin',$3,FALSE) RETURNING id",["Administrador de prueba",adminEmail,await bcrypt.hash(password,12)]))[0];
  const anonymous=await call("/my/courses");
  expectStatus(anonymous,401);
  expectStatus(await call("/auth/login",{method:"POST",body:{email:adminEmail,password:"incorrect"}}),401);
  let adminLogin=await call("/auth/login",{method:"POST",body:{email:adminEmail,password}});
  expectStatus(adminLogin,200);
  const adminCookie=adminLogin.cookie;
  assert.ok(adminCookie);
  const profile=expectStatus(await call("/auth/me",{cookie:adminCookie}),200);
  assert.equal(profile.user.role,"admin");
  assert.equal(profile.user.password_hash,undefined);
  const course=expectStatus(await call("/admin/courses",{method:"POST",cookie:adminCookie,body:{
    title:"RCP de demostración",objective:"Reconocer una situación de emergencia",
    target_audience:"Plantilla de empresa",requirements:"Ninguno",
    presentation:"Metodología del curso",duration_hours:20,access_days:90,max_units_per_day:1
  }}),201).course;
  const draft=expectStatus(await call("/courses/"+course.id,{cookie:adminCookie}),200);
  assert.equal(draft.units.length,1);
  assert.equal(draft.units[0].unit_no,0);
  expectStatus(await call("/admin/courses/"+course.id+"/units/"+draft.units[0].id,{method:"PATCH",cookie:adminCookie,body:{
    title:"Bienvenida y metodología",
    introduction:"Cómo utilizar el aula",
    content_blocks:[{type:"heading",level:1,text:"Bienvenida"},{type:"text",text:"Metodología y resultados"}],
    learning_outcomes:[{id:"RA0",text:"Conocer el aula"}]
  }}),200);
  const unit=expectStatus(await call("/admin/courses/"+course.id+"/units",{method:"POST",cookie:adminCookie,body:{
    unit_no:1,title:"Primera respuesta",
    content_blocks:[{type:"heading",level:1,text:"Reconocimiento"},{type:"text",text:"Activar ayuda"}],
    learning_outcomes:[{id:"RA1",text:"Activar recursos"}],
    requires_test:false,requires_practice:false
  }}),201).unit;
  expectStatus(await call("/admin/courses/"+course.id+"/publish",{method:"POST",cookie:adminCookie}),200);
  expectStatus(await call("/admin/courses/"+course.id+"/units",{method:"POST",cookie:adminCookie,body:{unit_no:2,title:"No permitida"}}),409);

  const create=async(role,mail)=>expectStatus(await call("/admin/users",{method:"POST",cookie:adminCookie,body:{
    role,name:"Persona sintética "+role,email:mail,temporary_password:password
  }}),201).user;
  const student=await create("student",studentEmail);
  const tutor=await create("tutor",tutorEmail);
  expectStatus(await call("/admin/tutors",{method:"POST",cookie:adminCookie,body:{course_id:course.id,tutor_id:tutor.id}}),201);
  expectStatus(await call("/admin/enrollments",{method:"POST",cookie:adminCookie,body:{course_id:course.id,student_id:student.id}}),201);

  let studentLogin=await call("/auth/login",{method:"POST",body:{email:studentEmail,password}});
  expectStatus(studentLogin,200);
  assert.equal(studentLogin.data.user.must_change_password,true);
  expectStatus(await call("/my/courses",{cookie:studentLogin.cookie}),403);
  expectStatus(await call("/auth/password",{method:"POST",cookie:studentLogin.cookie,body:{
    current_password:password,new_password:nextPassword
  }}),200);
  expectStatus(await call("/auth/me",{cookie:studentLogin.cookie}),401);
  studentLogin=await call("/auth/login",{method:"POST",body:{email:studentEmail,password:nextPassword}});
  expectStatus(studentLogin,200);
  const studentCookie=studentLogin.cookie;
  const listing=expectStatus(await call("/my/courses",{cookie:studentCookie}),200);
  assert.equal(listing.courses.length,1);
  let index=expectStatus(await call("/courses/"+course.id,{cookie:studentCookie}),200);
  assert.deepEqual(index.units.map(x=>x.open),[true,false]);
  const blocked=await call("/courses/"+course.id+"/units/"+unit.id,{cookie:studentCookie});
  expectStatus(blocked,423);
  assert.equal(blocked.data.detail,"unit_locked");
  expectStatus(await call("/courses/"+course.id+"/units/"+draft.units[0].id,{cookie:studentCookie}),200);
  expectStatus(await call("/courses/"+course.id+"/units/"+draft.units[0].id+"/complete",{
    method:"POST",cookie:studentCookie
  }),422);
  await query("UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1 AND enrollment_id IN (SELECT id FROM aula_enrollments WHERE student_id=$2)",[draft.units[0].id,student.id]);
  expectStatus(await call("/courses/"+course.id+"/units/"+draft.units[0].id+"/complete",{method:"POST",cookie:studentCookie}),200);
  index=expectStatus(await call("/courses/"+course.id,{cookie:studentCookie}),200);
  assert.deepEqual(index.units.map(x=>x.open),[true,true]);
  const audit=await query("SELECT action FROM aula_audit WHERE actor_id=$1",[student.id]);
  assert.ok(audit.some(row=>row.action==="UNIT_COMPLETED"));

  const tutorLogin=await call("/auth/login",{method:"POST",body:{email:tutorEmail,password}});
  expectStatus(tutorLogin,200);
  assert.equal(tutorLogin.data.user.role,"tutor");
  expectStatus(await call("/courses/"+course.id,{cookie:tutorLogin.cookie}),200);
  expectStatus(await call("/admin/users",{cookie:tutorLogin.cookie}),403);
});
