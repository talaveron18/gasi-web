import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import {gateUnit, canAuthor, canManageAccounts, canFinishUnit, ROLES} from "../aula/access-policy.mjs";

const COOKIE="gasi_aula_session";
const TTL_HOURS=8;
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer","content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'"};
const json=(v:any,status=200,extra:any={})=>new Response(JSON.stringify(v),{status,headers:{...HEADERS,...extra}});
class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
const fail=(status:number,message:string):never=>{throw new HttpError(status,message);};
const env=(name:string)=>String((globalThis as any).Netlify?.env?.get?.(name)||process.env[name]||"");
const conn=()=>{const url=env("GASI_AULA_DB_URL");return url?getDatabase({connectionString:url}):getDatabase();};
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
    return rows[0];
  }
  if(user.role==="tutor"){
    const allowed=await q("SELECT 1 FROM aula_course_tutors WHERE course_id=$1 AND tutor_id=$2",[course.id,user.id]);
    if(!allowed.length)fail(403,"not_assigned");
  }else if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
  return null;
}
async function outline(user:any,course:any,e:any,now=new Date()){
  const units=await q("SELECT id,unit_no,title,requires_test,requires_practice,learning_outcomes FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
  if(user.role!=="student")return units.map(x=>({...x,open:true,completed:false}));
  const rows=await q("SELECT p.* FROM aula_unit_progress p WHERE enrollment_id=$1",[e.id]);
  const byId=new Map(rows.map((r:any)=>[String(r.unit_id),r]));
  const count=await q("SELECT count(*)::int AS amount FROM aula_unit_progress WHERE enrollment_id=$1 AND first_viewed_at>=CURRENT_DATE AND first_viewed_at<CURRENT_DATE+INTERVAL '1 day'",[e.id]);
  return units.map(x=>{
    const gate=gateUnit({unit:x,units,progressByUnit:byId,enrollment:e,maxPerDay:course.max_units_per_day,newUnitsToday:Number(count[0].amount),now});
    return {...x,open:gate.open,completed:gate.completed===true,reason:gate.reason,viewed_seconds:byId.get(String(x.id))?.viewed_seconds||0};
  });
}
function blocksOf(raw:any){
  if(!Array.isArray(raw)||raw.length>150)fail(422,"invalid_content_blocks");
  const allowed=new Set(["heading","text","callout","image","video"]);
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
  const url=new URL(req.url),path=url.pathname.replace(/^\/api\/aula/,"")||"/";
  originGuard(req);
  if(req.method==="GET"&&path==="/health"){await q("SELECT 1");return json({ok:true});}
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
    const rows=await q("INSERT INTO aula_courses(title,objective,target_audience,requirements,presentation,duration_hours,access_days,max_units_per_day,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",[title,string(b.objective,2000),string(b.target_audience,2000),string(b.requirements,2000),string(b.presentation,3000),duration,accessDays,cap,user.id]);
    const course=rows[0];
    await q("INSERT INTO aula_units(course_id,unit_no,title,introduction) VALUES($1,0,'Unidad 0 · Bienvenida y metodología','Presentación, metodología y orientación inicial')",[course.id]);
    await log(user,"COURSE_CREATED","course",course.id);
    return json({course},201);
  }
  const courseEdit=path.match(/^\/admin\/courses\/([0-9a-f-]+)$/);
  if(req.method==="PATCH"&&courseEdit){
    requireRole(user,["admin","author"]);
    const course=await courseById(courseEdit[1]);if(user.role==="author"&&course.created_by!==user.id)fail(403,"not_course_author");
    if(course.status!=="draft")fail(409,"course_structure_frozen");
    const b=await body(req);
    const rows=await q("UPDATE aula_courses SET title=$2,objective=$3,target_audience=$4,requirements=$5,presentation=$6,updated_at=now() WHERE id=$1 RETURNING id,title",[course.id,string(b.title??course.title,180),string(b.objective??course.objective,2000),string(b.target_audience??course.target_audience,2000),string(b.requirements??course.requirements,2000),string(b.presentation??course.presentation,3000)]);
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
    await q("UPDATE aula_units SET title=$3,introduction=$4,content_blocks=$5::jsonb,learning_outcomes=$6::jsonb,requires_test=$7,requires_practice=$8 WHERE course_id=$1 AND id=$2",[course.id,p.id,string(b.title??p.title,180),string(b.introduction??p.introduction,3000),JSON.stringify(blocks),JSON.stringify(outcomes),b.requires_test===undefined?p.requires_test:b.requires_test===true,b.requires_practice===undefined?p.requires_practice:b.requires_practice===true]);
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
      const blocks=blocksOf(b.content_blocks||[]);
      const r=await q("INSERT INTO aula_units(course_id,unit_no,title,introduction,content_blocks,learning_outcomes,requires_test,requires_practice) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8) RETURNING id,unit_no,title",[course.id,unitNo,title,string(b.introduction,3000),JSON.stringify(blocks),JSON.stringify(outcomes),b.requires_test===true,b.requires_practice===true]);
      await log(user,"UNIT_CREATED","unit",r[0].id);
      return json({unit:r[0]},201);
    }
    const units=await q("SELECT * FROM aula_units WHERE course_id=$1 ORDER BY unit_no",[course.id]);
    if(units.length<2||units[0].unit_no!==0||!units[0].content_blocks?.length||units.some((u:any,i:number)=>u.unit_no!==i||!u.content_blocks?.length||(i>0&&!u.learning_outcomes?.length)))fail(422,"course_requires_welcome_content_and_outcomes");
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
  const match=path.match(/^\/courses\/([0-9a-f-]+)(?:\/units\/([0-9a-f-]+)(?:\/(complete|heartbeat))?)?$/);
  if(match){
    const course=await courseById(match[1]),e=await enrolment(user,course),unitId=match[2],action=match[3];
    if(!unitId&&req.method==="GET")return json({course:{id:course.id,title:course.title,objective:course.objective,target_audience:course.target_audience,requirements:course.requirements,presentation:course.presentation,duration_hours:course.duration_hours,access_days:course.access_days,max_units_per_day:course.max_units_per_day,deadline:e?.deadline||null},units:await outline(user,course,e)});
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
        const today=(await client.query("SELECT count(*)::int AS amount FROM aula_unit_progress WHERE enrollment_id=$1 AND first_viewed_at>=CURRENT_DATE AND first_viewed_at<CURRENT_DATE+INTERVAL '1 day'",[e.id])).rows[0].amount;
        const gate=gateUnit({unit,units:all,progressByUnit:byId,enrollment:e,newUnitsToday:Number(today),maxPerDay:course.max_units_per_day});
        if(!gate.open){await client.query("ROLLBACK");return json({detail:"unit_locked",reason:gate.reason},423);}
        await client.query("INSERT INTO aula_unit_progress(enrollment_id,unit_id) VALUES($1,$2) ON CONFLICT DO NOTHING",[e.id,unit.id]);
        await client.query("COMMIT");
        return json({unit:{id:unit.id,unit_no:unit.unit_no,title:unit.title,introduction:unit.introduction,content_blocks:unit.content_blocks,learning_outcomes:unit.learning_outcomes,requires_test:unit.requires_test,requires_practice:unit.requires_practice}});
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
