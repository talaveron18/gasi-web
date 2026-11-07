import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {gateUnit, canAuthor, canManageAccounts, canFinishUnit, ROLES} from "../aula/access-policy.mjs";
import {validateBank,selectTen,makeOptionOrders,gradeWithOptionOrders,validateRubric,gradePractice} from "../aula/f3-policy.mjs";
import {validOutcomes,validCompetencies,validResources,authorAudit} from "../aula/f5-policy.mjs";
import {validSurvey,validateSurveyResponses,eligibleCertificate} from "../aula/f6-policy.mjs";

const COOKIE="gasi_aula_session";
const TTL_HOURS=8;
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"};
const json=(v:any,status=200,extra:any={})=>new Response(JSON.stringify(v),{status,headers:{...HEADERS,...extra}});
class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
const fail=(status:number,message:string):never=>{throw new HttpError(status,message);};
const env=(name:string)=>String((globalThis as any).Netlify?.env?.get?.(name)||process.env[name]||"");
const dbCache=new Map<string,any>();
const conn=()=>{
  const url=env("GASI_AULA_DB_URL");
  if(!/^postgres(?:ql)?:\/\//.test(url))fail(503,"private_aula_database_not_configured");
  if(!dbCache.has(url))dbCache.set(url,getDatabase({connectionString:url}));
  return dbCache.get(url);
};
async function q(text:string,values:any[]=[]){const db=conn(),client=await db.pool.connect();try{return (await client.query(text,values)).rows;}finally{client.release();}}
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const normEmail=(v:unknown)=>{const e=String(v||"").trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)||e.length>254)fail(422,"invalid_email");return e;};
const string=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
const plainUser=(u:any)=>({user_id:String(u.id),name:u.name,email:u.email,role:u.role,must_change_password:u.must_change_password===true});
const cookie=(token:string,maxAge:number)=>COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+maxAge;
function getCookie(req:Request){const cookieHeader=req.headers.get("cookie")||"";const v=cookieHeader.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));return v?decodeURIComponent(v.slice(COOKIE.length+1)):"";}
const strongPassword=(p:string)=>p.length>=12&&p.length<=128;
function originGuard(req:Request){
  const u=new URL(req.url),origin=req.headers.get("origin");
  if(req.method==="GET"||req.method==="HEAD")return;
  // Browser writes require same-origin Origin and JSON; no cross-site form POST.
  if(origin!==u.origin||req.headers.get("sec-fetch-site")==="cross-site")fail(403,"origin_denied");
  if(!String(req.headers.get("content-type")||"").includes("application/json"))fail(415,"json_required");
}
async function body(req:Request){
  const size=Number(req.headers.get("content-length")||0);
  if(size>32768)fail(413,"request_too_large");
  const text=await req.text();if(Buffer.byteLength(text)>32768)fail(413,"request_too_large");
  try{const v=JSON.parse(text);if(!v||typeof v!=="object"||Array.isArray(v))fail(400,"invalid_json");return v;}catch(e){if(e instanceof HttpError)throw e;return fail(400,"invalid_json");}
}
async function auth(req:Request){
  const token=getCookie(req);if(!token)fail(401,"not_authenticated");
  const rows=await q("SELECT u.id,u.email,u.name,u.role,u.active,u.must_change_password FROM aula_sessions s JOIN aula_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() LIMIT 1",[hash(token)]);
  if(!rows.length||!rows[0].active)fail(401,"session_expired_or_revoked");
  return rows[0];
}
function requireRole(user:any,roles:string[]){if(!roles.includes(user.role))fail(403,"forbidden");}
async function log(user:any,action:string,type:string,resource?:string){
  await q("INSERT INTO aula_audit(actor_id,action,resource_type,resource_id) VALUES($1,$2,$3,$4)",[user?.id||null,action,type,resource||null]);
}
async function courseById(id:string){
  const rows=await q("SELECT * FROM aula_courses WHERE id=$1",[id]);
  if(!rows.length)fail(404,"course_not_found");return rows[0];
}
async function enrolment(user:any,course:any){
  if(user.role==="student"){
    if(course.status!=="active")fail(404,"course_not_found");
    const rows=await q("SELECT * FROM aula_enrollments WHERE course_id=$1 AND student_id=$2",[course.id,user.id]);
    if(!rows.length)fail(403,"not_enrolled");
    if(rows[0].status!=="active"||new Date(rows[0].deadline).getTime()<Date.now())fail(403,"enrollment_inactive_or_expired");
    return rows[0];
  }
  if(user.role==="tutor"){
    const allowed=await q("SELECT 1 FROM aula_course_tutors WHERE course_id=$1 AND tutor_id=$2",[course.id,user.id]);
    if(!allowed.length)fail(403,"not_assigned");
  }else if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
  return null;
}
async function outline(user:any,course:any,e:any,now=new Date()){
  const units=await q("SELECT id,unit_no,title,requires_test,requires_practice,allows_voluntary_practice,learning_outcomes FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
  if(user.role!=="student")return units.map(x=>({...x,open:true,completed:false}));
  const rows=await q("SELECT p.* FROM aula_unit_progress p WHERE enrollment_id=$1",[e.id]);
  const byId=new Map(rows.map((r:any)=>[String(r.unit_id),r]));
  const count=await q("SELECT count(*)::int AS amount FROM aula_unit_progress WHERE enrollment_id=$1 AND (first_viewed_at AT TIME ZONE 'Europe/Madrid')::date=(now() AT TIME ZONE 'Europe/Madrid')::date",[e.id]);
  return units.map(x=>{
    const gate=gateUnit({unit:x,units,progressByUnit:byId,enrollment:e,maxPerDay:course.max_units_per_day,newUnitsToday:Number(count[0].amount),now});
    const progress=byId.get(String(x.id));
    return {...x,open:gate.open,completed:gate.completed===true,reason:gate.reason,
      test_passed:!!progress?.test_passed_at,practice_approved:!!progress?.practice_approved_at,
      viewed_seconds:progress?.viewed_seconds||0,new_units_today:Number(count[0].amount)};
  });
}
function blocksOf(raw:any){
  if(!Array.isArray(raw)||raw.length>150)fail(422,"invalid_content_blocks");
  const allowed=new Set(["heading","text","callout","image","video","accordion","flashcard","faq","glossary","link","bibliography"]);
  return raw.map((b:any)=>{
    if(!b||!allowed.has(b.type))fail(422,"invalid_content_block");
    const value:any={type:b.type,text:string(b.text,5000)};
    if(b.type==="heading"){value.level=Number(b.level);if(![1,2,3,4].includes(value.level))fail(422,"invalid_heading_level");}
    if(b.type==="callout"){value.style=String(b.style);if(!["recuerda","importante","ejemplo","resumen"].includes(value.style))fail(422,"invalid_callout_style");}
    if(b.type==="image"||b.type==="video"){
      value.src=string(b.src,1000);
      if(!/^https:\/\//.test(value.src))fail(422,"https_media_required");
      if(b.type==="image"){value.alt=string(b.alt,200);if(!value.alt)fail(422,"image_alt_required");}
    }
    if(["accordion","flashcard","faq","glossary"].includes(b.type))value.body=string(b.body,5000);
    if(["link","bibliography"].includes(b.type)&&b.src){
      value.src=string(b.src,1000);
      if(!/^https:\/\//.test(value.src))fail(422,"https_media_required");
    }
    if(Array.isArray(b.outcome_ids))value.outcome_ids=b.outcome_ids.slice(0,40).map((x:any)=>string(x,80));
    return value;
  });
}
async function login(req:Request){
  const data=await body(req),email=normEmail(data.email),password=String(data.password||"");
  const ip=req.headers.get("x-nf-client-connection-ip")||"unknown";
  const key=hash(ip+":"+email),attempts=await q("SELECT failures,updated_at FROM aula_login_attempts WHERE key_hash=$1",[key]);
  if(attempts[0]&&Number(attempts[0].failures)>=5&&(Date.now()-new Date(attempts[0].updated_at).getTime())<900000)fail(429,"too_many_attempts");
  const found=await q("SELECT * FROM aula_users WHERE email=$1 AND active=TRUE",[email]);
  const valid=found.length&&await bcrypt.compare(password,found[0].password_hash);
  if(!valid){
    await q("INSERT INTO aula_login_attempts(key_hash,failures,updated_at) VALUES($1,1,now()) ON CONFLICT(key_hash) DO UPDATE SET failures=CASE WHEN aula_login_attempts.updated_at<now()-INTERVAL '15 minutes' THEN 1 ELSE aula_login_attempts.failures+1 END,updated_at=now()",[key]);
    fail(401,"invalid_credentials");
  }
  await q("DELETE FROM aula_login_attempts WHERE key_hash=$1",[key]);
  const token=crypto.randomBytes(32).toString("base64url");
  await q("INSERT INTO aula_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+INTERVAL '8 hours')",[found[0].id,hash(token)]);
  await log(found[0],"LOGIN","session");
  return json({user:plainUser(found[0])},200,{"set-cookie":cookie(token,TTL_HOURS*3600)});
}
async function handle(req:Request){
  const url=new URL(req.url);
  const rewritten=url.searchParams.get("original_path");
  const path=rewritten?"/"+rewritten.replace(/^\/+/, ""):url.pathname.replace(/^\/api\/aula/,"")||"/";
  originGuard(req);
  if(req.method==="GET"&&path==="/health"){await q("SELECT 1");return json({ok:true});}
  if(req.method==="POST"&&path==="/auth/reset-request"){
    const data=await body(req),email=normEmail(data.email);
    const apiKey=env("GASI_AULA_RESEND_API_KEY"),sender=env("GASI_AULA_SENDER_EMAIL");
    if(!apiKey||!sender)fail(503,"password_recovery_not_configured");
    const ip=req.headers.get("x-nf-client-connection-ip")||"unknown";
    const limiter=hash("recovery:"+ip+":"+email);
    const count=await q("SELECT failures,updated_at FROM aula_login_attempts WHERE key_hash=$1",[limiter]);
    if(count[0]&&Number(count[0].failures)>=5&&(Date.now()-new Date(count[0].updated_at).getTime())<900000)fail(429,"too_many_requests");
    await q("INSERT INTO aula_login_attempts(key_hash,failures,updated_at) VALUES($1,1,now()) ON CONFLICT(key_hash) DO UPDATE SET failures=CASE WHEN aula_login_attempts.updated_at<now()-INTERVAL '15 minutes' THEN 1 ELSE aula_login_attempts.failures+1 END,updated_at=now()",[limiter]);
    const rows=await q("SELECT id FROM aula_users WHERE email=$1 AND active=TRUE",[email]);
    if(rows.length){
      const token=crypto.randomBytes(32).toString("base64url");
      const inserted=await q("INSERT INTO aula_password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+INTERVAL '30 minutes') RETURNING id",[rows[0].id,hash(token)]);
      const link=new URL("/aula/recuperar",url.origin);link.searchParams.set("token",token);
      const message={
        from:sender,to:[email],subject:"Restablecer acceso al Aula Virtual GASI",
        text:"Si has solicitado recuperar tu acceso al Aula Virtual GASI, abre este enlace (válido durante 30 minutos):\n"+link.toString()+"\nSi no has solicitado el cambio, ignora este mensaje."
      };
      try{
        const result=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"content-type":"application/json"},body:JSON.stringify(message),signal:AbortSignal.timeout(10000)});
        if(!result.ok)throw new Error("email_provider_unavailable");
      }catch{
        await q("UPDATE aula_password_resets SET used_at=now() WHERE id=$1",[inserted[0].id]);
        console.error("aula_recovery_delivery_failed",{provider:"resend"});
      }
    }
    // Do not reveal whether a particular student email exists.
    return json({ok:true,message:"Si existe una cuenta activa y el servicio de correo funciona, recibirá instrucciones."},202);
  }
  if(req.method==="POST"&&path==="/auth/reset-confirm"){
    const data=await body(req),token=String(data.token||""),password=String(data.new_password||"");
    if(!/^[A-Za-z0-9_-]{35,100}$/.test(token)||!strongPassword(password))fail(422,"invalid_reset_or_password");
    const db=conn(),client=await db.pool.connect();
    try{
      await client.query("BEGIN");
      const used=await client.query("UPDATE aula_password_resets SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() RETURNING user_id",[hash(token)]);
      if(!used.rows.length){await client.query("ROLLBACK");fail(410,"reset_link_expired_or_used");}
      await client.query("UPDATE aula_users SET password_hash=$2,must_change_password=FALSE WHERE id=$1 AND active=TRUE",[used.rows[0].user_id,await bcrypt.hash(password,12)]);
      await client.query("UPDATE aula_sessions SET revoked_at=now() WHERE user_id=$1",[used.rows[0].user_id]);
      await client.query("INSERT INTO aula_audit(actor_id,action,resource_type,resource_id) VALUES($1,'PASSWORD_RESET','account',$1)",[used.rows[0].user_id]);
      await client.query("COMMIT");
      return json({ok:true});
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
  if(req.method==="POST"&&path==="/auth/login")return login(req);
  if(req.method==="GET"&&path==="/auth/me"){const user=await auth(req);return json({user:plainUser(user)});}
  if(req.method==="POST"&&path==="/auth/logout"){
    const token=getCookie(req),user=await auth(req);
    await q("UPDATE aula_sessions SET revoked_at=now() WHERE token_hash=$1",[hash(token)]);
    await log(user,"LOGOUT","session");
    return json({ok:true},200,{"set-cookie":cookie("",0)});
  }
  const user=await auth(req);
  if(req.method==="POST"&&path==="/auth/password"){
    const data=await body(req),oldPassword=String(data.current_password||""),newPassword=String(data.new_password||"");
    if(!strongPassword(newPassword)||oldPassword===newPassword)fail(422,"weak_or_reused_password");
    const stored=await q("SELECT password_hash FROM aula_users WHERE id=$1",[user.id]);
    if(!await bcrypt.compare(oldPassword,stored[0].password_hash))fail(401,"invalid_password");
    await q("UPDATE aula_users SET password_hash=$2,must_change_password=FALSE WHERE id=$1",[user.id,await bcrypt.hash(newPassword,12)]);
    await q("UPDATE aula_sessions SET revoked_at=now() WHERE user_id=$1",[user.id]);
    await log(user,"PASSWORD_CHANGED","account",user.id);
    return json({ok:true,relogin_required:true},200,{"set-cookie":cookie("",0)});
  }
  if(user.must_change_password)fail(403,"password_change_required");
  if(req.method==="GET"&&path==="/my/courses"){
    const rows=user.role==="student"
      ?await q("SELECT c.id,c.title,c.objective,c.duration_hours,c.access_days,c.max_units_per_day,e.status AS enrollment_status,e.deadline FROM aula_enrollments e JOIN aula_courses c ON c.id=e.course_id WHERE e.student_id=$1 AND c.status='active' ORDER BY e.enrolled_at DESC",[user.id])
      :user.role==="tutor"
      ?await q("SELECT c.id,c.title,c.objective,c.status FROM aula_courses c JOIN aula_course_tutors t ON t.course_id=c.id WHERE t.tutor_id=$1 ORDER BY c.created_at DESC",[user.id])
      :await q("SELECT id,title,objective,status,duration_hours FROM aula_courses WHERE $1='admin' OR created_by=$2 ORDER BY created_at DESC",[user.role,user.id]);
    return json({courses:rows});
  }
  if(req.method==="GET"&&path==="/admin/users"){
    requireRole(user,["admin"]);
    const rows=await q("SELECT id,email,name,role,active,created_at FROM aula_users ORDER BY name LIMIT 500");
    return json({users:rows});
  }
  if(req.method==="GET"&&path==="/admin/tutors"){
    requireRole(user,["admin","author"]);
    const rows=await q("SELECT id,name,email FROM aula_users WHERE active=TRUE AND role='tutor' ORDER BY name");
    return json({tutors:rows});
  }
  if(req.method==="POST"&&path==="/admin/users"){
    requireRole(user,["admin"]);const b=await body(req),email=normEmail(b.email),role=String(b.role||"");
    if(!ROLES.includes(role))fail(422,"invalid_role");
    const password=String(b.temporary_password||"");if(!strongPassword(password))fail(422,"weak_temporary_password");
    const rows=await q("INSERT INTO aula_users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,email,name,role",[email,string(b.name,160),role,await bcrypt.hash(password,12)]);
    await log(user,"USER_PROVISIONED","user",rows[0].id);
    return json({user:rows[0]},201);
  }
  if(req.method==="POST"&&path==="/admin/courses"){
    requireRole(user,["admin","author"]);
    const b=await body(req),title=string(b.title,180);
    if(title.length<3)fail(422,"title_required");
    const duration=Number(b.duration_hours||1),accessDays=Number(b.access_days||90),cap=b.max_units_per_day==null?null:Number(b.max_units_per_day);
    if(!Number.isInteger(duration)||duration<1||duration>2000||!Number.isInteger(accessDays)||accessDays<1||accessDays>730||cap!==null&&(!Number.isInteger(cap)||cap<1||cap>100))fail(422,"invalid_course_parameters");
    const competencies=b.competencies||[];if(!validCompetencies(competencies))fail(422,"invalid_course_competencies");
    const rows=await q("INSERT INTO aula_courses(title,objective,target_audience,requirements,presentation,duration_hours,access_days,max_units_per_day,created_by,competencies) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *",[title,string(b.objective,2000),string(b.target_audience,2000),string(b.requirements,2000),string(b.presentation,3000),duration,accessDays,cap,user.id,JSON.stringify(competencies)]);
    const course=rows[0];
    await q("INSERT INTO aula_units(course_id,unit_no,title,introduction) VALUES($1,0,'Unidad 0 · Bienvenida y metodología','Presentación, metodología y orientación inicial')",[course.id]);
    await log(user,"COURSE_CREATED","course",course.id);
    return json({course},201);
  }
  const auditMatch=path.match(/^\/admin\/courses\/([0-9a-f-]+)\/audit$/);
  if(auditMatch){
    requireRole(user,["admin","author"]);
    if(req.method!=="GET")fail(405,"method_not_allowed");
    const course=await courseById(auditMatch[1]);
    if(user.role==="author"&&String(course.created_by)!==String(user.id))fail(403,"not_course_author");
    const units=await q("SELECT u.id,u.unit_no,u.title,u.content_blocks,u.learning_outcomes,u.resources,u.requires_test,u.requires_practice,u.allows_voluntary_practice, "+
      "(SELECT count(*)::int FROM aula_test_questions tq WHERE tq.unit_id=u.id) AS question_count, "+
      "EXISTS(SELECT 1 FROM aula_practice_assignments p WHERE p.unit_id=u.id) AS has_practice "+
      "FROM aula_units u WHERE u.course_id=$1 ORDER BY u.unit_no",[course.id]);
    const stats=await q("SELECT p.unit_id,count(*)::int AS studied_by,round(avg(p.viewed_seconds)::numeric,1) AS avg_seconds, "+
      "sum(p.viewed_seconds)::bigint AS total_seconds, "+
      "count(*) FILTER(WHERE p.completed_at IS NOT NULL)::int AS completed_by "+
      "FROM aula_unit_progress p JOIN aula_enrollments e ON e.id=p.enrollment_id WHERE e.course_id=$1 GROUP BY p.unit_id",[course.id]);
    return json({course:{id:course.id,title:course.title,status:course.status,competencies:course.competencies},
      ...authorAudit(course,units,stats)});
  }

  const courseEdit=path.match(/^\/admin\/courses\/([0-9a-f-]+)$/);
  if(req.method==="PATCH"&&courseEdit){
    requireRole(user,["admin","author"]);
    const course=await courseById(courseEdit[1]);if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    const b=await body(req);
    const competencies=b.competencies??course.competencies;if(!validCompetencies(competencies))fail(422,"invalid_course_competencies");
    const rows=await q("UPDATE aula_courses SET title=$2,objective=$3,target_audience=$4,requirements=$5,presentation=$6,competencies=$7::jsonb,updated_at=now() WHERE id=$1 RETURNING id,title",[course.id,string(b.title??course.title,180),string(b.objective??course.objective,2000),string(b.target_audience??course.target_audience,2000),string(b.requirements??course.requirements,2000),string(b.presentation??course.presentation,3000),JSON.stringify(competencies)]);
    await log(user,"COURSE_UPDATED","course",course.id);return json({course:rows[0]});
  }
  const unitEdit=path.match(/^\/admin\/courses\/([0-9a-f-]+)\/units\/([0-9a-f-]+)$/);
  if(req.method==="PATCH"&&unitEdit){
    requireRole(user,["admin","author"]);
    const course=await courseById(unitEdit[1]);
    if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    const previous=await q("SELECT * FROM aula_units WHERE course_id=$1 AND id=$2",[course.id,unitEdit[2]]);
    if(!previous.length)fail(404,"unit_not_found");
    const b=await body(req),p=previous[0];
    const blocks=blocksOf(b.content_blocks??p.content_blocks);
    const outcomes=Array.isArray(b.learning_outcomes)?b.learning_outcomes.slice(0,100).map((x:any)=>({id:string(x.id,80),text:string(x.text,500)})):p.learning_outcomes;
    const resources=b.resources??p.resources;if(!validOutcomes(outcomes)||!validResources(resources))fail(422,"invalid_unit_outcomes_or_resources");
    await q("UPDATE aula_units SET title=$3,introduction=$4,content_blocks=$5::jsonb,learning_outcomes=$6::jsonb,requires_test=$7,requires_practice=$8,resources=$9::jsonb,allows_voluntary_practice=$10 WHERE course_id=$1 AND id=$2",[course.id,p.id,string(b.title??p.title,180),string(b.introduction??p.introduction,3000),JSON.stringify(blocks),JSON.stringify(outcomes),b.requires_test===undefined?p.requires_test:b.requires_test===true,b.requires_practice===undefined?p.requires_practice:b.requires_practice===true,JSON.stringify(resources),b.allows_voluntary_practice===undefined?p.allows_voluntary_practice:b.allows_voluntary_practice===true]);
    await log(user,"UNIT_UPDATED","unit",p.id);return json({ok:true});
  }
  if(req.method==="POST"&&path==="/admin/tutors"){
    requireRole(user,["admin","author"]);const b=await body(req),course=await courseById(String(b.course_id||""));
    if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    const tutor=await q("SELECT id FROM aula_users WHERE id=$1 AND role='tutor' AND active=TRUE",[String(b.tutor_id||"")]);
    if(!tutor.length)fail(422,"tutor_required");
    await q("INSERT INTO aula_course_tutors(course_id,tutor_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[course.id,tutor[0].id]);
    await log(user,"TUTOR_ASSIGNED","course",course.id);return json({ok:true},201);
  }
  const coursePost=path.match(/^\/admin\/courses\/([0-9a-f-]+)\/(units|publish)$/);
  if(coursePost&&req.method==="POST"){
    requireRole(user,["admin","author"]);
    const course=await courseById(coursePost[1]);if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    if(coursePost[2]==="units"){
      const b=await body(req),unitNo=Number(b.unit_no),title=string(b.title,180);
      if(!Number.isInteger(unitNo)||unitNo<1||title.length<3)fail(422,"invalid_unit");
      const outcomes=Array.isArray(b.learning_outcomes)?b.learning_outcomes.slice(0,100).map((x:any)=>({id:string(x.id,80),text:string(x.text,500)})):[];
      const blocks=blocksOf(b.content_blocks||[]),resources=b.resources||[];
      if(!validOutcomes(outcomes)||!validResources(resources))fail(422,"invalid_unit_outcomes_or_resources");
      const r=await q("INSERT INTO aula_units(course_id,unit_no,title,introduction,content_blocks,learning_outcomes,requires_test,requires_practice,resources,allows_voluntary_practice) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9::jsonb,$10) RETURNING id,unit_no,title",[course.id,unitNo,title,string(b.introduction,3000),JSON.stringify(blocks),JSON.stringify(outcomes),b.requires_test===true,b.requires_practice===true,JSON.stringify(resources),b.allows_voluntary_practice===true]);
      await log(user,"UNIT_CREATED","unit",r[0].id);
      return json({unit:r[0]},201);
    }
    const units=await q("SELECT * FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
    if(units.length<2||units[0].unit_no!==0||!units[0].content_blocks?.length||units.some((u:any,i:number)=>u.unit_no!==i||!u.content_blocks?.length||(i>0&&!u.learning_outcomes?.length)))fail(422,"course_requires_welcome_content_and_outcomes");
    for(const u of units){
      if(u.requires_test){
        const count=await q("SELECT count(*)::int AS count FROM aula_test_questions WHERE unit_id=$1",[u.id]);
        if(Number(count[0].count)!==15)fail(422,"test_bank_requires_15_questions");
      }
      if(u.requires_practice||u.allows_voluntary_practice){
        const found=await q("SELECT 1 FROM aula_practice_assignments WHERE unit_id=$1",[u.id]);
        if(!found.length)fail(422,"practice_rubric_required");
      }
    }
    await q("UPDATE aula_courses SET status='active',updated_at=now() WHERE id=$1",[course.id]);
    await log(user,"COURSE_PUBLISHED","course",course.id);
    return json({ok:true});
  }
  if(req.method==="GET"&&path==="/admin/enrollments"){
    requireRole(user,["admin","author"]);const courseId=String(url.searchParams.get("course_id")||"");
    const course=await courseById(courseId);
    if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    const rows=await q("SELECT e.id,e.status,e.deadline,u.id AS student_id,u.name,u.email FROM aula_enrollments e JOIN aula_users u ON u.id=e.student_id WHERE e.course_id=$1 ORDER BY u.name",[course.id]);
    return json({enrollments:rows});
  }
  if(req.method==="POST"&&path==="/admin/enrollments"){
    requireRole(user,["admin","author"]);const b=await body(req),course=await courseById(String(b.course_id||""));
    if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    if(course.status!=="active")fail(409,"course_not_active");
    const student=await q("SELECT id,role FROM aula_users WHERE id=$1 AND active=TRUE",[String(b.student_id||"")]);
    if(!student.length||student[0].role!=="student")fail(422,"student_required");
    const r=await q("INSERT INTO aula_enrollments(course_id,student_id,deadline) VALUES($1,$2,now()+($3::int*INTERVAL '1 day')) ON CONFLICT(course_id,student_id) DO NOTHING RETURNING id",[course.id,student[0].id,course.access_days]);
    if(!r.length)fail(409,"already_enrolled");
    await log(user,"STUDENT_ENROLLED","course",course.id);return json({enrollment_id:r[0].id},201);
  }



  // F6 private surveys, student-submitted responses and verified certificate
  // issue: no score, certificate or survey completion flags are accepted from
  // client data. Access stays tied to PostgreSQL enrolment and server progress.
  if(req.method==="GET"&&path==="/my/certificates"){
    requireRole(user,["student"]);
    const certificates=await q("SELECT cert.id,cert.certificate_code,cert.issued_at,c.id AS course_id,c.title,c.duration_hours "+
      "FROM aula_certificates cert JOIN aula_enrollments e ON e.id=cert.enrollment_id JOIN aula_courses c ON c.id=e.course_id "+
      "WHERE e.student_id=$1 ORDER BY cert.issued_at DESC",[user.id]);
    return json({certificates});
  }
  const certificateDetail=path.match(/^\/my\/certificates\/([0-9a-f-]+)$/);
  if(certificateDetail&&req.method==="GET"){
    requireRole(user,["student"]);
    const rows=await q("SELECT cert.id,cert.certificate_code,cert.issued_at,c.title AS course_title,c.duration_hours, "+
      "u.name AS student_name FROM aula_certificates cert JOIN aula_enrollments e ON e.id=cert.enrollment_id "+
      "JOIN aula_courses c ON c.id=e.course_id JOIN aula_users u ON u.id=e.student_id "+
      "WHERE cert.id=$1 AND e.student_id=$2",[certificateDetail[1],user.id]);
    if(!rows.length)fail(404,"certificate_not_found");
    return json({certificate:rows[0]});
  }
  const adminSurvey=path.match(/^\/admin\/courses\/([0-9a-f-]+)\/surveys(?:\/([0-9a-f-]+))?$/);
  if(adminSurvey){
    requireRole(user,["admin","author"]);
    const course=await courseById(adminSurvey[1]);
    if(user.role==="author"&&String(course.created_by)!==String(user.id))fail(403,"not_course_author");
    if(req.method==="GET"&&!adminSurvey[2]){
      const surveys=await q("SELECT s.id,s.kind,s.title,s.unit_id,s.questions,s.created_at,count(a.survey_id)::int AS responses "+
        "FROM aula_surveys s LEFT JOIN aula_survey_answers a ON a.survey_id=s.id WHERE s.course_id=$1 "+
        "GROUP BY s.id ORDER BY s.created_at",[course.id]);
      return json({surveys});
    }
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    if(req.method==="POST"&&!adminSurvey[2]){
      const b=await body(req),title=string(b.title,180),kind=String(b.kind||""),questions=b.questions;
      if(!validSurvey(title,kind,questions))fail(422,"invalid_survey");
      const unitId=kind==="followup"&&b.unit_id?String(b.unit_id):null;
      if(unitId){
        const owned=await q("SELECT 1 FROM aula_units WHERE course_id=$1 AND id=$2",[course.id,unitId]);
        if(!owned.length)fail(422,"survey_unit_not_in_course");
      }
      const rows=await q("INSERT INTO aula_surveys(course_id,kind,title,unit_id,questions) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING id",
        [course.id,kind,title,unitId,JSON.stringify(questions)]);
      await log(user,"SURVEY_CREATED","course",course.id);
      return json({survey_id:rows[0].id},201);
    }
    if(req.method==="DELETE"&&adminSurvey[2]){
      await body(req);
      const deleted=await q("DELETE FROM aula_surveys WHERE id=$1 AND course_id=$2 RETURNING id",[adminSurvey[2],course.id]);
      if(!deleted.length)fail(404,"survey_not_found");
      await log(user,"SURVEY_REMOVED","course",course.id);
      return json({ok:true});
    }
    fail(405,"method_not_allowed");
  }
  const studentSurvey=path.match(/^\/courses\/([0-9a-f-]+)\/surveys(?:\/([0-9a-f-]+))?$/);
  if(studentSurvey){
    requireRole(user,["student"]);
    const course=await courseById(studentSurvey[1]),e=await enrolment(user,course);
    if(req.method==="GET"&&!studentSurvey[2]){
      const surveys=await q("SELECT s.id,s.title,s.kind,s.unit_id,s.questions, (a.survey_id IS NOT NULL) AS submitted,a.submitted_at "+
        "FROM aula_surveys s LEFT JOIN aula_survey_answers a ON a.survey_id=s.id AND a.enrollment_id=$2 "+
        "WHERE s.course_id=$1 ORDER BY s.kind,s.created_at",[course.id,e.id]);
      return json({surveys});
    }
    if(req.method==="POST"&&studentSurvey[2]){
      const b=await body(req);
      const rows=await q("SELECT * FROM aula_surveys WHERE id=$1 AND course_id=$2",[studentSurvey[2],course.id]);
      if(!rows.length)fail(404,"survey_not_found");
      const survey=rows[0];
      if(!validateSurveyResponses(survey.questions,b.responses))fail(422,"invalid_survey_responses");
      if(survey.unit_id){
        const viewed=await q("SELECT 1 FROM aula_unit_progress WHERE enrollment_id=$1 AND unit_id=$2",[e.id,survey.unit_id]);
        if(!viewed.length)fail(423,"survey_unit_not_visited");
      }
      if(survey.kind==="final"){
        const units=await q("SELECT id,requires_test,requires_practice FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
        const progress=await q("SELECT * FROM aula_unit_progress WHERE enrollment_id=$1",[e.id]);
        if(!eligibleCertificate(units,new Map(progress.map((p:any)=>[String(p.unit_id),p])),true))fail(423,"complete_units_before_final_survey");
      }
      const saved=await q("INSERT INTO aula_survey_answers(survey_id,enrollment_id,responses) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING survey_id",
        [survey.id,e.id,JSON.stringify(b.responses)]);
      if(!saved.length)fail(409,"survey_already_submitted");
      await log(user,"SURVEY_SUBMITTED","course",course.id);
      return json({ok:true},201);
    }
    fail(405,"method_not_allowed");
  }
  const certIssue=path.match(/^\/courses\/([0-9a-f-]+)\/certificate$/);
  if(certIssue){
    requireRole(user,["student"]);
    const course=await courseById(certIssue[1]),e=await enrolment(user,course);
    if(req.method==="GET"){
      const existing=await q("SELECT id,certificate_code,issued_at FROM aula_certificates WHERE enrollment_id=$1",[e.id]);
      return json({certificate:existing[0]||null});
    }
    if(req.method==="POST"){
      await body(req);
      const units=await q("SELECT id,requires_test,requires_practice FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
      const progress=await q("SELECT * FROM aula_unit_progress WHERE enrollment_id=$1",[e.id]);
      const final=await q("SELECT s.id FROM aula_surveys s JOIN aula_survey_answers a ON a.survey_id=s.id "+
        "WHERE s.course_id=$1 AND a.enrollment_id=$2 AND s.kind='final' LIMIT 1",[course.id,e.id]);
      if(!eligibleCertificate(units,new Map(progress.map((p:any)=>[String(p.unit_id),p])),final.length>0))
        fail(423,"all_units_and_final_survey_required");
      const rows=await q("INSERT INTO aula_certificates(enrollment_id,certificate_code) VALUES($1,$2) "+
        "ON CONFLICT(enrollment_id) DO UPDATE SET certificate_code=aula_certificates.certificate_code "+
        "RETURNING id,certificate_code,issued_at",[e.id,crypto.randomBytes(20).toString("hex")]);
      await log(user,"CERTIFICATE_ISSUED","course",course.id);
      return json({certificate:rows[0]},201);
    }
    fail(405,"method_not_allowed");
  }

  // F4: all community, tutor and transcript operations use the same
  // server-side course ownership, tutor assignment and student enrolment gate.
  const community=path.match(/^\/courses\/([0-9a-f-]+)\/(forum|tutorials|record|ratings|learners)(?:\/([0-9a-f-]+))?$/);
  if(community){
    const course=await courseById(community[1]),e=await enrolment(user,course);
    const section=community[2],itemId=community[3];
    if(section==="forum"){
      if(req.method==="GET"&&!itemId){
        const rows=await q("SELECT t.id,t.title,t.locked,t.created_at,u.name AS author_name,count(p.id)::int AS posts "+
          "FROM aula_forum_threads t JOIN aula_users u ON u.id=t.created_by "+
          "LEFT JOIN aula_forum_posts p ON p.thread_id=t.id WHERE t.course_id=$1 "+
          "GROUP BY t.id,u.name ORDER BY t.created_at DESC LIMIT 100",[course.id]);
        return json({threads:rows});
      }
      if(req.method==="POST"&&!itemId){
        const b=await body(req),title=string(b.title,180),post=string(b.body,4000);
        if(title.length<8||post.length<2)fail(422,"thread_title_and_message_required");
        const db=conn(),client=await db.pool.connect();
        try{await client.query("BEGIN");
          const t=(await client.query("INSERT INTO aula_forum_threads(course_id,created_by,title) VALUES($1,$2,$3) RETURNING id",[course.id,user.id,title])).rows[0];
          await client.query("INSERT INTO aula_forum_posts(thread_id,author_id,body) VALUES($1,$2,$3)",[t.id,user.id,post]);
          await client.query("COMMIT");await log(user,"FORUM_THREAD_CREATED","course",course.id);
          return json({thread_id:t.id},201);
        }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
      }
      if(!itemId)fail(405,"method_not_allowed");
      const matches=await q("SELECT * FROM aula_forum_threads WHERE id=$1 AND course_id=$2",[itemId,course.id]);
      if(!matches.length)fail(404,"thread_not_found");
      const thread=matches[0];
      if(req.method==="GET"){
        const posts=await q("SELECT p.id,p.body,p.created_at,u.name AS author_name,u.role AS author_role "+
          "FROM aula_forum_posts p JOIN aula_users u ON u.id=p.author_id WHERE p.thread_id=$1 ORDER BY p.created_at ASC LIMIT 300",[thread.id]);
        return json({thread:{id:thread.id,title:thread.title,locked:thread.locked},posts});
      }
      if(req.method==="POST"){
        if(thread.locked)fail(423,"thread_locked");
        const b=await body(req),message=string(b.body,4000);
        if(message.length<2)fail(422,"message_required");
        const added=await q("INSERT INTO aula_forum_posts(thread_id,author_id,body) VALUES($1,$2,$3) RETURNING id",[thread.id,user.id,message]);
        await log(user,"FORUM_POST_CREATED","course",course.id);
        return json({post_id:added[0].id},201);
      }
      if(req.method==="PATCH"){
        requireRole(user,["admin","author","tutor"]);
        const b=await body(req);if(typeof b.locked!=="boolean")fail(422,"locked_boolean_required");
        await q("UPDATE aula_forum_threads SET locked=$2 WHERE id=$1",[thread.id,b.locked]);
        await log(user,"FORUM_THREAD_MODERATED","course",course.id);
        return json({ok:true});
      }
      fail(405,"method_not_allowed");
    }
    if(section==="tutorials"){
      if(req.method==="GET"&&!itemId){
        const rows=await q("SELECT t.id,t.question,t.answer,t.status,t.created_at,t.answered_at,u.name AS student_name "+
          "FROM aula_tutorial_requests t JOIN aula_users u ON u.id=t.student_id WHERE t.course_id=$1 AND ($2!='student' OR t.student_id=$3) ORDER BY t.created_at DESC LIMIT 100",
          [course.id,user.role,user.id]);
        return json({tutorials:rows});
      }
      if(req.method==="POST"&&!itemId){
        requireRole(user,["student"]);
        const b=await body(req),question=string(b.question,4000);
        if(question.length<10)fail(422,"question_too_short");
        const created=await q("INSERT INTO aula_tutorial_requests(course_id,student_id,question) VALUES($1,$2,$3) RETURNING id",[course.id,user.id,question]);
        await log(user,"TUTORIAL_REQUEST_CREATED","course",course.id);
        return json({tutorial_id:created[0].id},201);
      }
      if(req.method==="POST"&&itemId){
        requireRole(user,["admin","tutor"]);
        const b=await body(req),answer=string(b.answer,4000);
        if(answer.length<10)fail(422,"answer_too_short");
        const updated=await q("UPDATE aula_tutorial_requests SET answer=$3,status='answered',answered_by=$4,answered_at=now() "+
          "WHERE id=$1 AND course_id=$2 AND status='open' RETURNING id",[itemId,course.id,answer,user.id]);
        if(!updated.length)fail(409,"tutorial_not_open_or_missing");
        await log(user,"TUTORIAL_ANSWERED","course",course.id);return json({ok:true});
      }
      if(req.method==="PATCH"&&itemId){
        requireRole(user,["student"]);
        const updated=await q("UPDATE aula_tutorial_requests SET status='closed' WHERE id=$1 AND course_id=$2 AND student_id=$3 AND status='answered' RETURNING id",
          [itemId,course.id,user.id]);
        if(!updated.length)fail(409,"tutorial_not_answered_or_owned");
        return json({ok:true});
      }
      fail(405,"method_not_allowed");
    }
    if(section==="learners"){
      requireRole(user,["admin","author","tutor"]);
      if(req.method!=="GET"||itemId)fail(405,"method_not_allowed");
      const learners=await q("SELECT e.student_id,u.name,e.status,e.deadline FROM aula_enrollments e JOIN aula_users u ON u.id=e.student_id WHERE e.course_id=$1 ORDER BY u.name",[course.id]);
      return json({learners});
    }
    if(section==="record"){
      if(req.method!=="GET"||itemId)fail(405,"method_not_allowed");
      const studentId=user.role==="student"?user.id:String(url.searchParams.get("student_id")||"");
      if(!studentId)fail(422,"student_id_required");
      const rows=await q("SELECT id,deadline,status FROM aula_enrollments WHERE course_id=$1 AND student_id=$2",[course.id,studentId]);
      if(!rows.length)fail(404,"student_not_enrolled");
      const enrollment=rows[0];
      const records=await q("SELECT u.id,u.unit_no,u.title,u.requires_test,u.requires_practice,p.first_viewed_at,p.viewed_seconds,p.completed_at,p.test_passed_at,p.practice_approved_at, "+
        "(SELECT max(a.score) FROM aula_test_attempts a WHERE a.enrollment_id=$2 AND a.unit_id=u.id AND a.submitted_at IS NOT NULL) AS best_score, "+
        "(SELECT s.status FROM aula_practice_submissions s WHERE s.enrollment_id=$2 AND s.unit_id=u.id ORDER BY s.submitted_at DESC LIMIT 1) AS practice_status "+
        "FROM aula_units u LEFT JOIN aula_unit_progress p ON p.unit_id=u.id AND p.enrollment_id=$2 "+
        "WHERE u.course_id=$1 ORDER BY u.unit_no",[course.id,enrollment.id]);
      const completed=records.filter((r:any)=>r.completed_at).length;
      return json({course_id:course.id,student_id:studentId,deadline:enrollment.deadline,enrollment_status:enrollment.status,
        completion_percent:records.length?Math.round(100*completed/records.length):0,
        viewed_seconds:records.reduce((sum:number,r:any)=>sum+Number(r.viewed_seconds||0),0),
        units:records});
    }
    if(section==="ratings"){
      if(req.method==="GET"){
        if(user.role==="student"){
          const records=await q("SELECT r.unit_id,r.rating,r.comment,r.updated_at FROM aula_unit_ratings r WHERE r.enrollment_id=$1",[e.id]);
          return json({ratings:records});
        }
        const aggregate=await q("SELECT r.unit_id,count(*)::int AS ratings,round(avg(r.rating)::numeric,2) AS average_rating "+
          "FROM aula_unit_ratings r JOIN aula_enrollments e ON e.id=r.enrollment_id WHERE e.course_id=$1 GROUP BY r.unit_id",[course.id]);
        return json({ratings:aggregate});
      }
      if(req.method==="POST"){
        requireRole(user,["student"]);
        const b=await body(req),unitId=String(b.unit_id||""),rating=Number(b.rating),comment=string(b.comment,2000);
        if(!Number.isInteger(rating)||rating<1||rating>5)fail(422,"invalid_unit_rating");
        const verified=await q("SELECT 1 FROM aula_unit_progress p JOIN aula_units u ON u.id=p.unit_id WHERE p.enrollment_id=$1 AND u.course_id=$2 AND u.id=$3",
          [e.id,course.id,unitId]);
        if(!verified.length)fail(403,"unit_not_viewed");
        await q("INSERT INTO aula_unit_ratings(enrollment_id,unit_id,rating,comment) VALUES($1,$2,$3,$4) "+
          "ON CONFLICT(enrollment_id,unit_id) DO UPDATE SET rating=excluded.rating,comment=excluded.comment,updated_at=now()",
          [e.id,unitId,rating,comment]);
        return json({ok:true});
      }
      fail(405,"method_not_allowed");
    }
  }
  if(req.method==="GET"&&path==="/tutor/tutorials"){
    requireRole(user,["admin","tutor"]);
    const items=await q("SELECT t.id,t.course_id,t.question,t.status,t.created_at,u.name AS student_name,c.title AS course_title "+
      "FROM aula_tutorial_requests t JOIN aula_users u ON u.id=t.student_id JOIN aula_courses c ON c.id=t.course_id "+
      "WHERE t.status='open' AND ($1='admin' OR EXISTS(SELECT 1 FROM aula_course_tutors a WHERE a.course_id=t.course_id AND a.tutor_id=$2)) "+
      "ORDER BY t.created_at ASC LIMIT 100",[user.role,user.id]);
    return json({tutorials:items});
  }

  // F3 authoring: draft-only bank of exactly 15 questions and a practice
  // with four or more rubric criteria. Correct answers are staff-only.
  const editAssessment=path.match(/^\/admin\/courses\/([0-9a-f-]+)\/units\/([0-9a-f-]+)\/assessment$/);
  if(editAssessment){
    requireRole(user,["admin","author"]);
    const course=await courseById(editAssessment[1]);
    if(user.role==="author"&&String(course.created_by)!==String(user.id))fail(403,"not_course_author");
    const unitRows=await q("SELECT * FROM aula_units WHERE id=$1 AND course_id=$2",[editAssessment[2],course.id]);
    if(!unitRows.length)fail(404,"unit_not_found");
    const unit=unitRows[0];
    if(req.method==="GET"){
      const questions=await q("SELECT position,prompt,options,correct_index,explanation FROM aula_test_questions WHERE unit_id=$1 ORDER BY position",[unit.id]);
      const practices=await q("SELECT title,prompt,reference_solution,rubric,min_per_criterion FROM aula_practice_assignments WHERE unit_id=$1",[unit.id]);
      return json({questions,practice:practices[0]||null});
    }
    if(req.method!=="PUT")fail(405,"method_not_allowed");
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    const b=await body(req);
    const questions=Array.isArray(b.questions)?b.questions:[];
    if((unit.requires_test||questions.length>0)&&!validateBank(questions))fail(422,"fifteen_questions_with_three_distinct_options_required");
    const practice=b.practice;
    if((unit.requires_practice||unit.allows_voluntary_practice)&&!practice)fail(422,"practice_required");
    if(practice&&(!validateRubric(practice.rubric)||string(practice.title,180).length<3||string(practice.prompt,6000).length<10||
      string(practice.reference_solution,8000).length<10||!Number.isInteger(Number(practice.min_per_criterion??2))||
      Number(practice.min_per_criterion??2)<1||Number(practice.min_per_criterion??2)>4))fail(422,"invalid_practice_rubric");
    const db=conn(),client=await db.pool.connect();
    try{
      await client.query("BEGIN");
      await client.query("DELETE FROM aula_test_questions WHERE unit_id=$1",[unit.id]);
      for(let i=0;i<questions.length;i++){
        const x=questions[i];
        await client.query("INSERT INTO aula_test_questions(unit_id,position,prompt,options,correct_index,explanation) VALUES($1,$2,$3,$4::jsonb,$5,$6)",
          [unit.id,i+1,x.prompt.trim(),JSON.stringify(x.options.map((v:string)=>v.trim())),x.correct_index,string(x.explanation,3000)]);
      }
      if(practice){
        await client.query("INSERT INTO aula_practice_assignments(unit_id,title,prompt,reference_solution,rubric,min_per_criterion) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(unit_id) DO UPDATE SET title=excluded.title,prompt=excluded.prompt,reference_solution=excluded.reference_solution,rubric=excluded.rubric,min_per_criterion=excluded.min_per_criterion",
         [unit.id,string(practice.title,180),string(practice.prompt,6000),string(practice.reference_solution,8000),JSON.stringify(practice.rubric.map((s:string)=>s.trim())),Number(practice.min_per_criterion??2)]);
      }else await client.query("DELETE FROM aula_practice_assignments WHERE unit_id=$1",[unit.id]);
      await client.query("COMMIT");
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    await log(user,"UNIT_ASSESSMENT_SAVED","unit",unit.id);
    return json({ok:true});
  }

  // Tutor queue is scoped by assignment in the database, not by a course ID
  // provided by the client.
  if(req.method==="GET"&&path==="/tutor/reviews"){
    requireRole(user,["admin","tutor"]);
    const rows=await q(
      "SELECT s.id,s.unit_id,s.answer,s.status,s.submitted_at,e.course_id,u.name AS student_name,c.title AS course_title,un.title AS unit_title,p.rubric,p.min_per_criterion "+
      "FROM aula_practice_submissions s JOIN aula_enrollments e ON e.id=s.enrollment_id JOIN aula_users u ON u.id=e.student_id "+
      "JOIN aula_courses c ON c.id=e.course_id JOIN aula_units un ON un.id=s.unit_id JOIN aula_practice_assignments p ON p.unit_id=s.unit_id "+
      "WHERE s.status='pending' AND ($1='admin' OR EXISTS(SELECT 1 FROM aula_course_tutors t WHERE t.course_id=e.course_id AND t.tutor_id=$2)) "+
      "ORDER BY s.submitted_at ASC LIMIT 100",[user.role,user.id]);
    return json({reviews:rows});
  }
  const reviewPath=path.match(/^\/tutor\/reviews\/([0-9a-f-]+)$/);
  if(reviewPath&&req.method==="POST"){
    requireRole(user,["admin","tutor"]);
    const b=await body(req),decision=String(b.decision||"");
    if(!["approved","rejected"].includes(decision))fail(422,"invalid_review_decision");
    const rows=await q("SELECT s.id,s.enrollment_id,s.unit_id,s.status,e.course_id,p.rubric,p.min_per_criterion "+
      "FROM aula_practice_submissions s JOIN aula_enrollments e ON e.id=s.enrollment_id "+
      "JOIN aula_practice_assignments p ON p.unit_id=s.unit_id WHERE s.id=$1",[reviewPath[1]]);
    if(!rows.length)fail(404,"submission_not_found");
    const item=rows[0];
    if(user.role==="tutor"){
      const assigned=await q("SELECT 1 FROM aula_course_tutors WHERE course_id=$1 AND tutor_id=$2",[item.course_id,user.id]);
      if(!assigned.length)fail(403,"not_assigned");
    }
    if(item.status!=="pending")fail(409,"review_already_recorded");
    let grade;
    try{grade=gradePractice(item.rubric,b.grades,Number(item.min_per_criterion));}
    catch{fail(422,"invalid_rubric_grades");}
    if(decision==="approved"&&!grade.approved)fail(422,"rubric_below_approval_threshold");
    const feedback=string(b.feedback,5000);
    if(decision==="rejected"&&feedback.length<5)fail(422,"feedback_required_for_rejection");
    const updated=await q("UPDATE aula_practice_submissions SET status=$2,grades=$3::jsonb,tutor_feedback=$4,reviewed_by=$5,reviewed_at=now() WHERE id=$1 AND status='pending' RETURNING id",
      [item.id,decision,JSON.stringify(b.grades),feedback,user.id]);
    if(!updated.length)fail(409,"review_already_recorded");
    if(decision==="approved")await q("UPDATE aula_unit_progress SET practice_approved_at=COALESCE(practice_approved_at,now()) WHERE enrollment_id=$1 AND unit_id=$2",[item.enrollment_id,item.unit_id]);
    await log(user,"PRACTICE_"+decision.toUpperCase(),"unit",item.unit_id);
    return json({ok:true,decision,score:grade.total,max:grade.max});
  }

  // Learners cannot supply scores, correct answers, or a tutor decision.
  const assessmentPath=path.match(/^\/courses\/([0-9a-f-]+)\/units\/([0-9a-f-]+)\/assessment(?:\/(test|practice))?$/);
  if(assessmentPath){
    requireRole(user,["student"]);
    const course=await courseById(assessmentPath[1]),e=await enrolment(user,course);
    const units=await outline(user,course,e);
    const row=units.find((x:any)=>String(x.id)===assessmentPath[2]);
    if(!row)fail(404,"unit_not_found");
    if(!row.open)fail(423,row.reason||"unit_locked");
    const progress=await q("SELECT * FROM aula_unit_progress WHERE enrollment_id=$1 AND unit_id=$2",[e.id,row.id]);
    if(!progress.length)fail(423,"unit_must_be_opened_first");
    const storedProgress=progress[0];
    const practiceRows=await q("SELECT title,prompt,rubric,min_per_criterion,reference_solution FROM aula_practice_assignments WHERE unit_id=$1",[row.id]);
    const assignment=practiceRows[0]||null;
    const submitted=await q("SELECT id,status,answer,grades,tutor_feedback,submitted_at FROM aula_practice_submissions WHERE enrollment_id=$1 AND unit_id=$2 ORDER BY submitted_at DESC LIMIT 1",[e.id,row.id]);
    const latest=submitted[0]||null;
    const exposePractice=assignment?{title:assignment.title,prompt:assignment.prompt,rubric:assignment.rubric,min_per_criterion:assignment.min_per_criterion,
      ...(latest?{reference_solution:assignment.reference_solution}:{}),submission:latest}:null;
    if(req.method==="GET"&&!assessmentPath[3]){
      let attempt=null,questionViews=[];
      if(row.requires_test){
        const pending=await q("SELECT * FROM aula_test_attempts WHERE enrollment_id=$1 AND unit_id=$2 AND submitted_at IS NULL ORDER BY created_at DESC LIMIT 1",[e.id,row.id]);
        attempt=pending[0]||null;
        if(!attempt&&!storedProgress.test_passed_at){
          const bank=await q("SELECT id,prompt,options FROM aula_test_questions WHERE unit_id=$1 ORDER BY position",[row.id]);
          if(bank.length!==15)fail(503,"test_bank_not_configured");
          const sampled=selectTen(bank,()=>crypto.randomInt(4294967296)/4294967296);
          const ids=sampled.map((x:any)=>x.id);
          const optionOrders=makeOptionOrders(sampled,(max:number)=>crypto.randomInt(max));
          const inserted=await q("INSERT INTO aula_test_attempts(enrollment_id,unit_id,question_ids,option_orders) VALUES($1,$2,$3::uuid[],$4::jsonb) ON CONFLICT DO NOTHING RETURNING *",[e.id,row.id,ids,JSON.stringify(optionOrders)]);
          attempt=inserted[0]||(await q("SELECT * FROM aula_test_attempts WHERE enrollment_id=$1 AND unit_id=$2 AND submitted_at IS NULL ORDER BY created_at DESC LIMIT 1",[e.id,row.id]))[0];
        }
        if(attempt){
          const raw=await q("SELECT id,prompt,options FROM aula_test_questions WHERE unit_id=$1 AND id=ANY($2::uuid[])",[row.id,attempt.question_ids]);
          questionViews=attempt.question_ids.map((id:string)=>{
            const q=raw.find((x:any)=>String(x.id)===String(id));
            if(!q)fail(503,"question_bank_changed");
            const permutation=attempt.option_orders?.[String(id)]||[0,1,2];
            return {id:q.id,prompt:q.prompt,options:permutation.map((j:number)=>q.options[j])};
          });
        }
      }
      const past=await q("SELECT score,passed,submitted_at FROM aula_test_attempts WHERE enrollment_id=$1 AND unit_id=$2 AND submitted_at IS NOT NULL ORDER BY submitted_at DESC LIMIT 1",[e.id,row.id]);
      return json({questions:questionViews,attempt_id:attempt?.id||null,latest_test:past[0]||null,
        test_passed:!!storedProgress.test_passed_at,practice_approved:!!storedProgress.practice_approved_at,practice:exposePractice});
    }
    if(req.method==="POST"&&assessmentPath[3]==="test"){
      if(!row.requires_test)fail(404,"test_not_required");
      const b=await body(req);
      const attempt=await q("SELECT * FROM aula_test_attempts WHERE id=$1 AND enrollment_id=$2 AND unit_id=$3 AND submitted_at IS NULL",[String(b.attempt_id||""),e.id,row.id]);
      if(!attempt.length)fail(409,"attempt_not_active");
      const raw=await q("SELECT id,correct_index,explanation FROM aula_test_questions WHERE unit_id=$1 AND id=ANY($2::uuid[])",[row.id,attempt[0].question_ids]);
      let grade;
      try{grade=gradeWithOptionOrders(attempt[0].question_ids.map((id:string)=>raw.find((x:any)=>String(x.id)===String(id))),b.answers,attempt[0].option_orders);}
      catch{fail(422,"invalid_answers");}
      const saved=await q("UPDATE aula_test_attempts SET answers=$2::jsonb,score=$3,passed=$4,submitted_at=now() WHERE id=$1 AND submitted_at IS NULL RETURNING id",
       [attempt[0].id,JSON.stringify(b.answers),grade.score,grade.passed]);
      if(!saved.length)fail(409,"attempt_already_submitted");
      if(grade.passed)await q("UPDATE aula_unit_progress SET test_passed_at=COALESCE(test_passed_at,now()) WHERE enrollment_id=$1 AND unit_id=$2",[e.id,row.id]);
      await log(user,"TEST_SUBMITTED","unit",row.id);
      return json({score:grade.score,passed:grade.passed,review:grade.review});
    }
    if(req.method==="POST"&&assessmentPath[3]==="practice"){
      if((!row.requires_practice&&!row.allows_voluntary_practice)||!assignment)fail(404,"practice_not_configured");
      const b=await body(req),answer=string(b.answer,10000);
      if(answer.length<30)fail(422,"practice_answer_too_short");
      if(storedProgress.practice_approved_at)fail(409,"practice_already_approved");
      if(latest?.status==="pending")fail(409,"practice_pending_review");
      const created=await q("INSERT INTO aula_practice_submissions(enrollment_id,unit_id,answer) VALUES($1,$2,$3) RETURNING id,status,submitted_at",[e.id,row.id,answer]);
      await log(user,"PRACTICE_SUBMITTED","unit",row.id);
      return json({submission:created[0],reference_solution:assignment.reference_solution},201);
    }
    fail(405,"method_not_allowed");
  }

  const match=path.match(/^\/courses\/([0-9a-f-]+)(?:\/units\/([0-9a-f-]+)(?:\/(complete|heartbeat))?)?$/);
  if(match){
    const course=await courseById(match[1]),e=await enrolment(user,course),unitId=match[2],action=match[3];
    if(!unitId&&req.method==="GET")return json({course:{id:course.id,title:course.title,objective:course.objective,target_audience:course.target_audience,requirements:course.requirements,presentation:course.presentation,competencies:course.competencies,duration_hours:course.duration_hours,access_days:course.access_days,max_units_per_day:course.max_units_per_day,deadline:e?.deadline||null},units:await outline(user,course,e)});
    if(!unitId)fail(405,"method_not_allowed");
    const unitRows=await q("SELECT * FROM aula_units WHERE id=$1 AND course_id=$2",[unitId,course.id]);if(!unitRows.length)fail(404,"unit_not_found");const unit=unitRows[0];
    if(user.role!=="student"){
      if(action)fail(403,"student_only");
      if(req.method==="GET")return json({unit});
      fail(405,"method_not_allowed");
    }
    if(req.method==="GET"&&!action){
      // Serialize first-time unit views to enforce the per-day limit even with concurrent tabs.
      const db=conn(),client=await db.pool.connect();
      try{
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[String(e.id)]);
        const all=(await client.query("SELECT id,unit_no,requires_test,requires_practice FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id])).rows;
        const rows=(await client.query("SELECT * FROM aula_unit_progress WHERE enrollment_id=$1",[e.id])).rows;
        const byId=new Map(rows.map((r:any)=>[String(r.unit_id),r]));
        const today=(await client.query("SELECT count(*)::int AS amount FROM aula_unit_progress WHERE enrollment_id=$1 AND (first_viewed_at AT TIME ZONE 'Europe/Madrid')::date=(now() AT TIME ZONE 'Europe/Madrid')::date",[e.id])).rows[0].amount;
        const gate=gateUnit({unit,units:all,progressByUnit:byId,enrollment:e,newUnitsToday:Number(today),maxPerDay:course.max_units_per_day});
        if(!gate.open){await client.query("ROLLBACK");return json({detail:"unit_locked",reason:gate.reason},423);}
        await client.query("INSERT INTO aula_unit_progress(enrollment_id,unit_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[e.id,unit.id]);
        await client.query("COMMIT");
        return json({unit:{id:unit.id,unit_no:unit.unit_no,title:unit.title,introduction:unit.introduction,content_blocks:unit.content_blocks,learning_outcomes:unit.learning_outcomes,resources:unit.resources,requires_test:unit.requires_test,requires_practice:unit.requires_practice,allows_voluntary_practice:unit.allows_voluntary_practice}});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }
    if(req.method==="POST"&&action==="heartbeat"){
      await body(req);
      const present=await q("SELECT 1 FROM aula_unit_progress WHERE enrollment_id=$1 AND unit_id=$2",[e.id,unit.id]);
      if(!present.length||e.status!=="active"||new Date(e.deadline).getTime()<Date.now())fail(423,"unit_not_open");
      const rows=await q("UPDATE aula_unit_progress SET viewed_seconds=viewed_seconds+LEAST(GREATEST(FLOOR(EXTRACT(EPOCH FROM (now()-last_viewed_at)))::int,0),120),last_viewed_at=now() WHERE enrollment_id=$1 AND unit_id=$2 RETURNING viewed_seconds",[e.id,unit.id]);
      return json({viewed_seconds:rows[0].viewed_seconds});
    }
    if(req.method==="POST"&&action==="complete"){
      await body(req);
      const row=await q("SELECT * FROM aula_unit_progress WHERE enrollment_id=$1 AND unit_id=$2",[e.id,unit.id]);
      if(!row.length||e.status!=="active"||new Date(e.deadline).getTime()<Date.now())fail(423,"unit_not_open");
      if(row[0].viewed_seconds<10)fail(422,"minimum_viewing_time_required");
      const gate=canFinishUnit(unit,row[0]);if(!gate.ok)return json({detail:"assessment_required",reason:gate.reason},423);
      await q("UPDATE aula_unit_progress SET completed_at=COALESCE(completed_at,now()) WHERE enrollment_id=$1 AND unit_id=$2",[e.id,unit.id]);
      await log(user,"UNIT_COMPLETED","unit",unit.id);return json({ok:true});
    }
  }
  return json({detail:"not_found"},404);
}
const aula=async(req:Request,_context:Context)=>{
  try{return await handle(req);}catch(error:any){
    if(error instanceof HttpError)return json({detail:error.message},error.status);
    if(error?.code==="23505")return json({detail:"duplicate_record"},409);
    if(error?.code==="22P02")return json({detail:"invalid_id"},422);
    console.error("aula_internal_failure",{name:error?.name||"Error",code:error?.code||"unknown"});
    return json({detail:"service_unavailable"},503);
  }
};
export default aula;
export const config:Config={path:"/api/aula/*"};
