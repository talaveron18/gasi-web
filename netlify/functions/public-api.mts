import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const COOKIE="gasi_public_session";
const SESSION_SECONDS=7*24*60*60;
const MAX_PDF_BYTES=25*1024*1024;
const MAX_JSON_BYTES=32*1024;
const SECURITY_HEADERS={
  "content-type":"application/json; charset=utf-8",
  "cache-control":"no-store",
  "x-content-type-options":"nosniff",
  "x-frame-options":"DENY",
  "referrer-policy":"no-referrer",
  "permissions-policy":"camera=(), microphone=(), geolocation=()",
  "content-security-policy":"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};

class ApiError extends Error{
  status:number; detail:any;
  constructor(status:number,detail:any){super(typeof detail==="string"?detail:"api_error");this.status=status;this.detail=detail;}
}
const env=(name:string)=>String((globalThis as any).Netlify?.env?.get?.(name)||process.env[name]||"");

function coarseSurface(pathname:string){
  const segment=pathname.split("/").filter(Boolean)[1]||"root";
  return ["auth","courses","admin","payments","health"].includes(segment)?segment:"other";
}
const databaseCache=new Map<string,any>();
function database(){
  const connectionString=env("NETLIFY_DB_URL"),key=connectionString||"__netlify_default__";
  if(!databaseCache.has(key))databaseCache.set(key,connectionString?getDatabase({connectionString}):getDatabase());
  return databaseCache.get(key);
}

async function queryRows(db:any,text:string,params:any[]=[]){
  const client=await db.pool.connect();
  try{
    return (await client.query(text,params)).rows;
  }finally{
    client.release();
  }
}
const json=(body:any,status=200,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{...SECURITY_HEADERS,...extra}});
const responseWithCookie=(body:any,status:number,cookies:string[])=>{
  const headers=new Headers(SECURITY_HEADERS);
  for(const cookie of cookies)headers.append("set-cookie",cookie);
  return new Response(JSON.stringify(body),{status,headers});
};
const cookieValue=(req:Request,name:string)=>{
  const raw=req.headers.get("cookie")||"";
  for(const part of raw.split(";")){
    const [key,...rest]=part.trim().split("=");
    if(key===name)return decodeURIComponent(rest.join("="));
  }
  return "";
};
const sessionCookie=(token:string)=>`${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
const clearSessionCookie=()=>`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
const sha256=(value:string)=>crypto.createHash("sha256").update(value).digest("hex");
const id=(prefix:string)=>`${prefix}_${crypto.randomBytes(12).toString("hex")}`;
const normalizeEmail=(value:any)=>{
  const email=String(value||"").trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ApiError(422,"invalid_email");
  return email;
};
const required=(value:any,name:string,max:number)=>{
  const out=String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim();
  if(!out)throw new ApiError(422,`${name}_required`);
  if(out.length>max)throw new ApiError(422,`${name}_too_long`);
  return out;
};
async function bodyJson(req:Request){
  const declared=Number(req.headers.get("content-length")||0);
  if(Number.isFinite(declared)&&declared>MAX_JSON_BYTES)throw new ApiError(413,"request_too_large");
  const raw=await req.text();
  if(Buffer.byteLength(raw,"utf8")>MAX_JSON_BYTES)throw new ApiError(413,"request_too_large");
  try{return JSON.parse(raw) as any;}catch{throw new ApiError(400,"invalid_json");}
}
function publicUser(row:any){
  return {
    user_id:String(row.id),
    email:String(row.email),
    name:String(row.name),
    picture:row.picture==null?null:String(row.picture),
    is_admin:row.is_admin===true,
    created_at:new Date(row.created_at).toISOString()
  };
}
function publicCourse(row:any){
  return {
    course_id:String(row.id),
    title:String(row.title),
    description:String(row.description),
    duration:String(row.duration),
    type:String(row.course_type),
    price:Number(row.price),
    is_free:row.is_free===true,
    thumbnail:row.thumbnail==null?null:String(row.thumbnail),
    modules:Array.isArray(row.modules)?row.modules:[],
    created_at:new Date(row.created_at).toISOString()
  };
}
function publicEnrollment(row:any){
  return {
    enrollment_id:String(row.id),
    user_id:String(row.user_id),
    course_id:String(row.course_id),
    progress:Number(row.progress||0),
    completed_module_ids:Array.isArray(row.completed_module_ids)?row.completed_module_ids:[],
    completed_at:row.completed_at?new Date(row.completed_at).toISOString():null,
    certificate_id:row.certificate_id||null,
    payment_status:row.payment_status||null,
    enrolled_at:new Date(row.enrolled_at).toISOString()
  };
}
function validateCourse(raw:any){
  const title=required(raw?.title,"title",180);
  const description=required(raw?.description,"description",5000);
  const duration=required(raw?.duration,"duration",80);
  const type=required(raw?.type,"type",80);
  const is_free=raw?.is_free!==false;
  let price=Number(raw?.price||0);
  if(!Number.isFinite(price)||price<0)throw new ApiError(422,"invalid_price");
  if(is_free)price=0;
  if(!is_free&&price<=0)throw new ApiError(422,"paid_course_requires_positive_price");
  const thumbnail=raw?.thumbnail?required(raw.thumbnail,"thumbnail",1000):null;
  if(!Array.isArray(raw?.modules))throw new ApiError(422,"modules_required");
  if(raw.modules.length>200)throw new ApiError(422,"too_many_modules");
  const seen=new Set<string>();
  const modules=raw.modules.map((m:any,index:number)=>{
    const module_id=required(m?.module_id||id("module"),"module_id",120);
    if(seen.has(module_id))throw new ApiError(422,"duplicate_module_id");
    seen.add(module_id);
    return {
      module_id,
      title:required(m?.title,"module_title",180),
      order:index+1,
      description:m?.description?required(m.description,"module_description",2000):null
    };
  });
  return {title,description,duration,type,price,is_free,thumbnail,modules};
}
function progressState(enrollment:any,course:any){
  const moduleIds=(Array.isArray(course.modules)?course.modules:[]).map((m:any)=>String(m.module_id));
  const allowed=new Set(moduleIds);
  const completed=[...new Set((Array.isArray(enrollment.completed_module_ids)?enrollment.completed_module_ids:[]).map(String).filter((x:string)=>allowed.has(x)))].sort();
  const progress=moduleIds.length?Math.round((completed.length/moduleIds.length)*10000)/100:0;
  return {
    course_id:String(course.id),
    completed_module_ids:completed,
    completed_modules:completed.length,
    total_modules:moduleIds.length,
    progress,
    completed_at:enrollment.completed_at?new Date(enrollment.completed_at).toISOString():null,
    certificate_id:enrollment.certificate_id||null
  };
}
function safeFilename(value:any){
  let name=String(value||"material.pdf").replace(/[^A-Za-z0-9._ -]+/g,"_").replace(/^[ .]+|[ .]+$/g,"");
  if(!name.toLowerCase().endsWith(".pdf"))name=`${name||"material"}.pdf`;
  return name.slice(0,180);
}
function buildCertificate({studentName,courseTitle,certificateId,completedAt}:{studentName:string,courseTitle:string,certificateId:string,completedAt:Date}){
  const esc=(value:string)=>Buffer.from(String(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"),"latin1");
  const date=completedAt.toLocaleDateString("es-ES",{timeZone:"UTC"});
  const lines:[[number,number,number,string],...[number,number,number,string][]]=[
    [26,105,735,"Certificado de finalización"],
    [14,105,685,"GASI · Formación sanitaria"],
    [13,105,620,"Se certifica que"],
    [22,105,580,studentName],
    [13,105,535,"ha completado satisfactoriamente el curso"],
    [18,105,495,courseTitle],
    [12,105,430,`Fecha de finalización: ${date}`],
    [10,105,395,`Código de certificado: ${certificateId}`]
  ];
  const commands=[Buffer.from("BT")];
  for(const [size,x,y,text] of lines){
    commands.push(Buffer.from(`/F1 ${size} Tf`),Buffer.from(`1 0 0 1 ${x} ${y} Tm`),Buffer.concat([Buffer.from("("),esc(text),Buffer.from(") Tj")]));
  }
  commands.push(Buffer.from("ET"));
  const stream=Buffer.concat(commands.flatMap(x=>[x,Buffer.from("\n")]));
  const objects=[
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from("endstream")]),
    Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
  ];
  let pdf=Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n","latin1");
  const offsets=[0];
  objects.forEach((obj,index)=>{offsets.push(pdf.length);pdf=Buffer.concat([pdf,Buffer.from(`${index+1} 0 obj\n`),obj,Buffer.from("\nendobj\n")]);});
  const xref=pdf.length;
  let tail=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(const offset of offsets.slice(1))tail+=`${String(offset).padStart(10,"0")} 00000 n \n`;
  tail+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.concat([pdf,Buffer.from(tail)]);
}
function clientSource(req:Request){
  return (req.headers.get("x-nf-client-connection-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
}

function enforceBrowserMutationOrigin(req:Request,path:string){
  if(path==="/api/payments/webhook")return;
  if(!["POST","PUT","PATCH","DELETE"].includes(req.method))return;
  const expected=new URL(req.url).origin;
  const origin=(req.headers.get("origin")||"").trim();
  if(origin){
    let observed="";
    try{observed=new URL(origin).origin;}catch{throw new ApiError(403,"cross_site_request_rejected");}
    if(observed!==expected)throw new ApiError(403,"cross_site_request_rejected");
  }
  const fetchSite=(req.headers.get("sec-fetch-site")||"").trim().toLowerCase();
  if(fetchSite==="cross-site")throw new ApiError(403,"cross_site_request_rejected");
  if(!origin){
    const referer=(req.headers.get("referer")||"").trim();
    if(referer){
      let observed="";
      try{observed=new URL(referer).origin;}catch{throw new ApiError(403,"cross_site_request_rejected");}
      if(observed!==expected)throw new ApiError(403,"cross_site_request_rejected");
    }
  }
}
function registrationBuckets(req:Request,email:string){
  const source=clientSource(req);
  return [
    {key:sha256(`register-ip:${source}`),limit:10},
    {key:sha256(`register-email:${email}`),limit:3}
  ];
}
async function consumeRegistrationAttempt(db:any,req:Request,email:string){
  const buckets=registrationBuckets(req,email),client=await db.pool.connect();
  try{
    await client.query("BEGIN");
    for(const b of [...buckets].sort((a,b)=>a.key.localeCompare(b.key)))await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[b.key]);
    for(const b of buckets){
      const q=await client.query("SELECT failures,window_started_at,blocked_until FROM public_login_throttle WHERE key_hash=$1",[b.key]);
      const row=q.rows[0],started=row?Date.parse(row.window_started_at):NaN,blocked=row?.blocked_until?Date.parse(row.blocked_until):NaN;
      if(Number.isFinite(blocked)&&blocked>Date.now())throw new ApiError(429,"too_many_registration_attempts");
      if(row&&Number.isFinite(started)&&Date.now()-started<60*60_000&&Number(row.failures)>=b.limit)throw new ApiError(429,"too_many_registration_attempts");
    }
    for(const b of buckets){
      const q=await client.query("SELECT failures,window_started_at FROM public_login_throttle WHERE key_hash=$1",[b.key]);
      const row=q.rows[0],started=row?Date.parse(row.window_started_at):NaN;
      if(!row||!Number.isFinite(started)||Date.now()-started>=60*60_000){
        await client.query("INSERT INTO public_login_throttle(key_hash,failures,window_started_at,blocked_until,updated_at) VALUES($1,1,NOW(),NULL,NOW()) ON CONFLICT(key_hash) DO UPDATE SET failures=1,window_started_at=NOW(),blocked_until=NULL,updated_at=NOW()",[b.key]);
      }else{
        const attempts=Number(row.failures)+1,blocked=attempts>=b.limit?new Date(Date.now()+60*60_000):null;
        await client.query("UPDATE public_login_throttle SET failures=$2,blocked_until=$3,updated_at=NOW() WHERE key_hash=$1",[b.key,attempts,blocked]);
      }
    }
    await client.query("COMMIT");
  }catch(e){
    try{await client.query("ROLLBACK");}catch{}
    throw e;
  }finally{client.release();}
}
function loginBuckets(req:Request,email:string){
  const source=clientSource(req);
  return [
    {key:sha256(`pair:${source}:${email}`),limit:8},
    {key:sha256(`ip:${source}`),limit:40}
  ];
}
async function loginLimited(client:any,buckets:any[]){
  await client.query("DELETE FROM public_login_throttle WHERE updated_at < NOW() - INTERVAL '1 day'");
  for(const b of buckets){
    const q=await client.query("SELECT failures,window_started_at,blocked_until FROM public_login_throttle WHERE key_hash=$1",[b.key]);
    const row=q.rows[0];if(!row)continue;
    const blocked=row.blocked_until?Date.parse(row.blocked_until):NaN;
    const started=Date.parse(row.window_started_at);
    if(Number.isFinite(blocked)&&blocked>Date.now())return true;
    if(!Number.isFinite(started)||Date.now()-started>=15*60_000){await client.query("DELETE FROM public_login_throttle WHERE key_hash=$1",[b.key]);continue;}
    if(Number(row.failures)>=b.limit)return true;
  }
  return false;
}
async function loginFailed(client:any,buckets:any[]){
  for(const b of [...buckets].sort((a,b)=>a.key.localeCompare(b.key)))await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[b.key]);
  for(const b of buckets){
    const q=await client.query("SELECT failures,window_started_at FROM public_login_throttle WHERE key_hash=$1",[b.key]);
    const row=q.rows[0],started=row?Date.parse(row.window_started_at):NaN;
    if(!row||!Number.isFinite(started)||Date.now()-started>=15*60_000){
      await client.query("INSERT INTO public_login_throttle(key_hash,failures,window_started_at,blocked_until,updated_at) VALUES($1,1,NOW(),NULL,NOW()) ON CONFLICT(key_hash) DO UPDATE SET failures=1,window_started_at=NOW(),blocked_until=NULL,updated_at=NOW()",[b.key]);
    }else{
      const failures=Number(row.failures)+1,blocked=failures>=b.limit?new Date(Date.now()+15*60_000):null;
      await client.query("UPDATE public_login_throttle SET failures=$2,blocked_until=$3,updated_at=NOW() WHERE key_hash=$1",[b.key,failures,blocked]);
    }
  }
}
async function loginSucceeded(client:any,buckets:any[]){if(buckets[0])await client.query("DELETE FROM public_login_throttle WHERE key_hash=$1",[buckets[0].key]);}
async function createSession(client:any,userId:string){
  const token=crypto.randomBytes(32).toString("base64url"),tokenHash=sha256(token),sessionId=id("session");
  await client.query("DELETE FROM public_sessions WHERE expires_at<=NOW()");
  await client.query("INSERT INTO public_sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '7 days')",[sessionId,userId,tokenHash]);
  return token;
}
async function actor(req:Request,db:any,requiredAuth=true){
  const token=cookieValue(req,COOKIE);
  if(!token){if(requiredAuth)throw new ApiError(401,"missing_session");return null;}
  const rows=await queryRows(
    db,
    "SELECT u.* FROM public_sessions s JOIN public_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",
    [sha256(token)]
  );
  if(!rows[0]){if(requiredAuth)throw new ApiError(401,"session_expired_or_revoked");return null;}
  return rows[0];
}
async function courseAccess(client:any,user:any,courseId:string){
  if(user.is_admin===true)return true;
  const q=await client.query("SELECT id FROM public_enrollments WHERE user_id=$1 AND course_id=$2 LIMIT 1",[user.id,courseId]);
  if(!q.rows[0])throw new ApiError(403,"course_access_required");
  return true;
}
function stripeSignature(raw:string,header:string,secret:string){
  const parts=Object.fromEntries(header.split(",").map(part=>part.split("=",2) as [string,string]));
  const timestamp=Number(parts.t),supplied=parts.v1||"";
  if(!Number.isFinite(timestamp)||Math.abs(Date.now()/1000-timestamp)>300||!/^[a-f0-9]{64}$/i.test(supplied))return false;
  const expected=crypto.createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");
  return expected.length===supplied.length&&crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied));
}

async function handlePublicApi(req:Request,_context:Context){
  const url=new URL(req.url),path=url.pathname,db=database();
  try{
    enforceBrowserMutationOrigin(req,path);
    if(req.method==="GET"&&path==="/api/health"){await queryRows(db,"SELECT 1");return json({ok:true,storage:"postgresql"});}

    if(req.method==="POST"&&path==="/api/auth/register"){
      const b=await bodyJson(req),name=required(b.name,"name",80),email=normalizeEmail(b.email),password=String(b.password||"");
      if(password.length<12||password.length>128)throw new ApiError(422,"invalid_password");
      await consumeRegistrationAttempt(db,req,email);
      const client=await db.pool.connect();
      try{
        await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`public-email:${email}`]);
        if((await client.query("SELECT id FROM public_users WHERE lower(email)=lower($1) LIMIT 1",[email])).rows[0])throw new ApiError(409,"Email already registered");
        const userId=id("user"),hash=await bcrypt.hash(password,12);
        const q=await client.query("INSERT INTO public_users(id,email,name,password_hash) VALUES($1,$2,$3,$4) RETURNING *",[userId,email,name,hash]);
        const token=await createSession(client,userId);await client.query("COMMIT");
        return responseWithCookie({user:publicUser(q.rows[0])},201,[sessionCookie(token)]);
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    if(req.method==="POST"&&path==="/api/auth/login"){
      const b=await bodyJson(req),email=normalizeEmail(b.email),password=String(b.password||""),buckets=loginBuckets(req,email),client=await db.pool.connect();
      try{
        await client.query("BEGIN");
        if(await loginLimited(client,buckets)){await client.query("COMMIT");throw new ApiError(429,"too_many_login_attempts");}
        const q=await client.query("SELECT * FROM public_users WHERE lower(email)=lower($1) LIMIT 1",[email]);const user=q.rows[0];
        if(!user||!user.password_hash||!(await bcrypt.compare(password,user.password_hash))){
          await loginFailed(client,buckets);await client.query("COMMIT");throw new ApiError(401,"Invalid credentials");
        }
        await loginSucceeded(client,buckets);const token=await createSession(client,user.id);await client.query("COMMIT");
        return responseWithCookie({user:publicUser(user)},200,[sessionCookie(token)]);
      }catch(e){if((e as any)?.status&&client)try{await client.query("ROLLBACK");}catch{};throw e;}finally{client.release();}
    }

    if(req.method==="GET"&&path==="/api/auth/session"){
      const sessionId=required(url.searchParams.get("session_id"),"session_id",500),base=env("OAUTH_BACKEND_URL").trim();
      if(!base.startsWith("https://"))throw new ApiError(503,"oauth_not_configured");
      let upstream:Response;try{upstream=await fetch(`${base.replace(/\/$/,"")}/auth/v1/env/oauth/session-data`,{headers:{"X-Session-ID":sessionId}});}catch{throw new ApiError(502,"oauth_unavailable");}
      if(!upstream.ok)throw new ApiError(401,"Invalid session");
      const data=await upstream.json() as any,email=normalizeEmail(data.email),name=required(data.name,"name",80),picture=data.picture?required(data.picture,"picture",1000):null;
      const client=await db.pool.connect();
      try{
        await client.query("BEGIN");await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`public-email:${email}`]);
        let q=await client.query("SELECT * FROM public_users WHERE lower(email)=lower($1) LIMIT 1",[email]);
        if(q.rows[0])q=await client.query("UPDATE public_users SET name=$2,picture=$3 WHERE id=$1 RETURNING *",[q.rows[0].id,name,picture]);
        else q=await client.query("INSERT INTO public_users(id,email,name,picture) VALUES($1,$2,$3,$4) RETURNING *",[id("user"),email,name,picture]);
        const token=await createSession(client,q.rows[0].id);await client.query("COMMIT");
        return responseWithCookie({user:publicUser(q.rows[0])},200,[sessionCookie(token)]);
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    if(req.method==="GET"&&path==="/api/auth/me"){return json(publicUser(await actor(req,db,true)));}
    if(req.method==="POST"&&path==="/api/auth/logout"){
      const user=await actor(req,db,true),client=await db.pool.connect();
      try{await client.query("DELETE FROM public_sessions WHERE user_id=$1",[user.id]);}finally{client.release();}
      return responseWithCookie({message:"Logged out successfully"},200,[clearSessionCookie()]);
    }

    if(req.method==="GET"&&path==="/api/courses/"){
      const rows=await queryRows(db,"SELECT * FROM public_courses ORDER BY created_at DESC");return json(rows.map(publicCourse));
    }
    const courseMatch=path.match(/^\/api\/courses\/([^/]+)$/);
    if(req.method==="GET"&&courseMatch){
      const rows=await queryRows(db,"SELECT * FROM public_courses WHERE id=$1 LIMIT 1",[decodeURIComponent(courseMatch[1])]);
      if(!rows[0])throw new ApiError(404,"Course not found");return json(publicCourse(rows[0]));
    }

    if(req.method==="POST"&&path==="/api/courses/enroll"){
      const user=await actor(req,db,true),b=await bodyJson(req),courseId=required(b.course_id,"course_id",120),client=await db.pool.connect();
      try{
        await client.query("BEGIN");const course=(await client.query("SELECT * FROM public_courses WHERE id=$1 FOR SHARE",[courseId])).rows[0];
        if(!course)throw new ApiError(404,"Course not found");if(!course.is_free)throw new ApiError(402,"payment_required");
        if((await client.query("SELECT id FROM public_enrollments WHERE user_id=$1 AND course_id=$2 LIMIT 1",[user.id,courseId])).rows[0])throw new ApiError(409,"Already enrolled");
        const row=(await client.query("INSERT INTO public_enrollments(id,user_id,course_id) VALUES($1,$2,$3) RETURNING *",[id("enrollment"),user.id,courseId])).rows[0];
        await client.query("COMMIT");return json(publicEnrollment(row),201);
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    if(req.method==="GET"&&path==="/api/courses/enrollments/my"){
      const user=await actor(req,db,true),client=await db.pool.connect();
      try{
        const q=await client.query("SELECT e.*,c.id c_id,c.title,c.description,c.duration,c.course_type,c.price,c.is_free,c.thumbnail,c.modules,c.created_at c_created_at FROM public_enrollments e JOIN public_courses c ON c.id=e.course_id WHERE e.user_id=$1 ORDER BY e.enrolled_at DESC",[user.id]);
        return json(q.rows.map((r:any)=>({enrollment:publicEnrollment(r),course:publicCourse({id:r.c_id,title:r.title,description:r.description,duration:r.duration,course_type:r.course_type,price:r.price,is_free:r.is_free,thumbnail:r.thumbnail,modules:r.modules,created_at:r.c_created_at})})));
      }finally{client.release();}
    }

    const materialList=path.match(/^\/api\/courses\/([^/]+)\/materials$/);
    if(req.method==="GET"&&materialList){
      const user=await actor(req,db,true),courseId=decodeURIComponent(materialList[1]),client=await db.pool.connect();
      try{
        if(!(await client.query("SELECT id FROM public_courses WHERE id=$1",[courseId])).rows[0])throw new ApiError(404,"Course not found");
        await courseAccess(client,user,courseId);
        const q=await client.query("SELECT material_id,course_id,module_id,filename,content_type,size_bytes AS size,created_at,status FROM public_course_materials WHERE course_id=$1 AND status='ACTIVE' ORDER BY created_at",[courseId]);
        return json(q.rows);
      }finally{client.release();}
    }

    const materialContent=path.match(/^\/api\/courses\/([^/]+)\/materials\/([^/]+)\/content$/);
    if(req.method==="GET"&&materialContent){
      const user=await actor(req,db,true),courseId=decodeURIComponent(materialContent[1]),materialId=decodeURIComponent(materialContent[2]),client=await db.pool.connect();
      try{
        await courseAccess(client,user,courseId);
        const q=await client.query("SELECT filename,content_type,size_bytes,content FROM public_course_materials WHERE material_id=$1 AND course_id=$2 AND status='ACTIVE' LIMIT 1",[materialId,courseId]);
        const row=q.rows[0];if(!row)throw new ApiError(404,"material_not_found");
        return new Response(row.content,{status:200,headers:{"content-type":"application/pdf","content-length":String(row.size_bytes),"cache-control":"private, no-store","content-disposition":`inline; filename="${safeFilename(row.filename)}"`,"x-content-type-options":"nosniff","x-frame-options":"DENY","referrer-policy":"no-referrer"}});
      }finally{client.release();}
    }

    const progressMatch=path.match(/^\/api\/courses\/([^/]+)\/progress$/);
    if(req.method==="GET"&&progressMatch){
      const user=await actor(req,db,true),courseId=decodeURIComponent(progressMatch[1]),client=await db.pool.connect();
      try{
        const course=(await client.query("SELECT * FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course)throw new ApiError(404,"Course not found");
        const enrollment=(await client.query("SELECT * FROM public_enrollments WHERE user_id=$1 AND course_id=$2",[user.id,courseId])).rows[0];if(!enrollment)throw new ApiError(403,"course_access_required");
        return json(progressState(enrollment,course));
      }finally{client.release();}
    }

    const completeMatch=path.match(/^\/api\/courses\/([^/]+)\/modules\/([^/]+)\/complete$/);
    if(req.method==="POST"&&completeMatch){
      const user=await actor(req,db,true),courseId=decodeURIComponent(completeMatch[1]),moduleId=decodeURIComponent(completeMatch[2]),client=await db.pool.connect();
      try{
        await client.query("BEGIN");
        const course=(await client.query("SELECT * FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course)throw new ApiError(404,"Course not found");
        const moduleIds=(course.modules||[]).map((m:any)=>String(m.module_id));if(!moduleIds.includes(moduleId))throw new ApiError(404,"module_not_found");
        const enrollment=(await client.query("SELECT * FROM public_enrollments WHERE user_id=$1 AND course_id=$2 FOR UPDATE",[user.id,courseId])).rows[0];if(!enrollment)throw new ApiError(403,"course_access_required");
        const completed=new Set((Array.isArray(enrollment.completed_module_ids)?enrollment.completed_module_ids:[]).map(String));completed.add(moduleId);
        const filtered=[...completed].filter(x=>moduleIds.includes(x)).sort(),progress=Math.round((filtered.length/moduleIds.length)*10000)/100;
        let completedAt=enrollment.completed_at,certificateId=enrollment.certificate_id;
        if(progress===100){
          completedAt=completedAt||new Date();
          certificateId=certificateId||("GASI-"+sha256(String(enrollment.id)).slice(0,16).toUpperCase());
        }
        const updated=(await client.query("UPDATE public_enrollments SET completed_module_ids=$3::jsonb,progress=$4,completed_at=$5,certificate_id=$6 WHERE user_id=$1 AND course_id=$2 RETURNING *",[user.id,courseId,JSON.stringify(filtered),progress,completedAt,certificateId])).rows[0];
        await client.query("COMMIT");return json(progressState(updated,course));
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    const certificateMatch=path.match(/^\/api\/courses\/([^/]+)\/certificate$/);
    if(req.method==="GET"&&certificateMatch){
      const user=await actor(req,db,true),courseId=decodeURIComponent(certificateMatch[1]),client=await db.pool.connect();
      try{
        const course=(await client.query("SELECT * FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course)throw new ApiError(404,"Course not found");
        const enrollment=(await client.query("SELECT * FROM public_enrollments WHERE user_id=$1 AND course_id=$2",[user.id,courseId])).rows[0];if(!enrollment)throw new ApiError(403,"course_access_required");
        const state=progressState(enrollment,course);if(state.progress<100||!enrollment.completed_at||!enrollment.certificate_id)throw new ApiError(409,"course_not_completed");
        const pdf=buildCertificate({studentName:user.name,courseTitle:course.title,certificateId:enrollment.certificate_id,completedAt:new Date(enrollment.completed_at)});
        return new Response(pdf,{status:200,headers:{"content-type":"application/pdf","cache-control":"private, no-store","content-disposition":`attachment; filename="certificado-${enrollment.certificate_id}.pdf"`,"x-content-type-options":"nosniff"}});
      }finally{client.release();}
    }

    if(req.method==="POST"&&path==="/api/admin/courses"){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const course=validateCourse(await bodyJson(req)),client=await db.pool.connect();
      try{
        const row=(await client.query("INSERT INTO public_courses(id,title,description,duration,course_type,price,is_free,thumbnail,modules) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *",[id("course"),course.title,course.description,course.duration,course.type,course.price,course.is_free,course.thumbnail,JSON.stringify(course.modules)])).rows[0];
        return json(publicCourse(row),201);
      }finally{client.release();}
    }

    const adminCourse=path.match(/^\/api\/admin\/courses\/([^/]+)$/);
    if(req.method==="PUT"&&adminCourse){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const courseId=decodeURIComponent(adminCourse[1]),next=validateCourse(await bodyJson(req)),client=await db.pool.connect();
      try{
        await client.query("BEGIN");const current=(await client.query("SELECT * FROM public_courses WHERE id=$1 FOR UPDATE",[courseId])).rows[0];if(!current)throw new ApiError(404,"Course not found");
        const currentIds=new Set((current.modules||[]).map((m:any)=>String(m.module_id))),nextIds=new Set(next.modules.map((m:any)=>String(m.module_id)));
        const structureChanged=currentIds.size!==nextIds.size||[...currentIds].some(x=>!nextIds.has(x));
        if(structureChanged&&(await client.query("SELECT id FROM public_enrollments WHERE course_id=$1 LIMIT 1",[courseId])).rows[0])throw new ApiError(409,"course_structure_locked");
        const materials=(await client.query("SELECT DISTINCT module_id FROM public_course_materials WHERE course_id=$1",[courseId])).rows.map((r:any)=>String(r.module_id));
        const removed=materials.filter((m:string)=>!nextIds.has(m));if(removed.length)throw new ApiError(409,{code:"module_has_materials",module_ids:removed.sort()});
        const row=(await client.query("UPDATE public_courses SET title=$2,description=$3,duration=$4,course_type=$5,price=$6,is_free=$7,thumbnail=$8,modules=$9::jsonb,updated_at=NOW() WHERE id=$1 RETURNING *",[courseId,next.title,next.description,next.duration,next.type,next.price,next.is_free,next.thumbnail,JSON.stringify(next.modules)])).rows[0];
        await client.query("COMMIT");return json(publicCourse(row));
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }
    if(req.method==="DELETE"&&adminCourse){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const courseId=decodeURIComponent(adminCourse[1]),client=await db.pool.connect();
      try{
        await client.query("BEGIN");if(!(await client.query("SELECT id FROM public_courses WHERE id=$1 FOR UPDATE",[courseId])).rows[0])throw new ApiError(404,"Course not found");
        if((await client.query("SELECT id FROM public_enrollments WHERE course_id=$1 LIMIT 1",[courseId])).rows[0])throw new ApiError(409,"course_has_enrollments");
        if((await client.query("SELECT material_id FROM public_course_materials WHERE course_id=$1 LIMIT 1",[courseId])).rows[0])throw new ApiError(409,"course_has_materials");
        await client.query("DELETE FROM public_courses WHERE id=$1",[courseId]);await client.query("COMMIT");return json({message:"Course deleted successfully"});
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    const adminMaterials=path.match(/^\/api\/admin\/courses\/([^/]+)\/materials$/);
    if(req.method==="GET"&&adminMaterials){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const courseId=decodeURIComponent(adminMaterials[1]),client=await db.pool.connect();
      try{
        if(!(await client.query("SELECT id FROM public_courses WHERE id=$1",[courseId])).rows[0])throw new ApiError(404,"Course not found");
        const q=await client.query("SELECT material_id,course_id,module_id,filename,content_type,size_bytes AS size,created_at,status FROM public_course_materials WHERE course_id=$1 AND status<>'DELETING' ORDER BY created_at",[courseId]);return json(q.rows);
      }finally{client.release();}
    }
    if(req.method==="POST"&&adminMaterials){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const courseId=decodeURIComponent(adminMaterials[1]),client=await db.pool.connect(),form=await req.formData(),moduleId=required(form.get("module_id"),"module_id",120),file=form.get("file");
      if(!(file instanceof File))throw new ApiError(422,"invalid_material_type");
      if(!String(file.name||"").toLowerCase().endsWith(".pdf"))throw new ApiError(422,"invalid_material_type");
      const filename=safeFilename(file.name);
      const bytes=Buffer.from(await file.arrayBuffer());if(!bytes.length||bytes.length>MAX_PDF_BYTES)throw new ApiError(413,"invalid_material_size");if(!bytes.subarray(0,5).equals(Buffer.from("%PDF-")))throw new ApiError(422,"invalid_pdf_content");
      try{
        const course=(await client.query("SELECT modules FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course)throw new ApiError(404,"Course not found");
        if(!(course.modules||[]).some((m:any)=>String(m.module_id)===moduleId))throw new ApiError(404,"material_module_not_found");
        const materialId=id("mat");
        const row=(await client.query("INSERT INTO public_course_materials(material_id,course_id,module_id,filename,content_type,size_bytes,content,created_by) VALUES($1,$2,$3,$4,'application/pdf',$5,$6,$7) RETURNING material_id,course_id,module_id,filename,content_type,size_bytes AS size,created_at,status",[materialId,courseId,moduleId,filename,bytes.length,bytes,user.id])).rows[0];
        return json(row,201);
      }finally{client.release();}
    }
    const adminMaterialDelete=path.match(/^\/api\/admin\/courses\/([^/]+)\/materials\/([^/]+)$/);
    if(req.method==="DELETE"&&adminMaterialDelete){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const client=await db.pool.connect();try{
        const q=await client.query("DELETE FROM public_course_materials WHERE course_id=$1 AND material_id=$2 RETURNING material_id",[decodeURIComponent(adminMaterialDelete[1]),decodeURIComponent(adminMaterialDelete[2])]);
        if(!q.rows[0])throw new ApiError(404,"material_not_found");return json({message:"Material deleted successfully"});
      }finally{client.release();}
    }

    if(req.method==="GET"&&path==="/api/admin/users"){
      const user=await actor(req,db,true);if(!user.is_admin)throw new ApiError(403,"Admin access required");
      const rows=await queryRows(db,"SELECT id,email,name,picture,is_admin,created_at FROM public_users ORDER BY created_at DESC LIMIT 1000");return json(rows.map(publicUser));
    }
    if(req.method==="POST"&&/^\/api\/admin\/users\/[^/]+\/make-admin$/.test(path))throw new ApiError(403,"admin_escalation_disabled");

    if(req.method==="POST"&&path==="/api/payments/create-checkout"){
      const user=await actor(req,db,true),courseId=required(url.searchParams.get("course_id"),"course_id",120),secret=env("STRIPE_SECRET_KEY");if(!secret)throw new ApiError(503,"payment_service_unavailable");
      const client=await db.pool.connect();try{
        const course=(await client.query("SELECT * FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course)throw new ApiError(404,"Course not found");if(course.is_free)throw new ApiError(409,"free_course_checkout_not_allowed");
        if((await client.query("SELECT id FROM public_enrollments WHERE user_id=$1 AND course_id=$2",[user.id,courseId])).rows[0])throw new ApiError(409,"Already enrolled");
        const params=new URLSearchParams({
          mode:"payment",
          success_url:`${url.origin}/dashboard?payment=success`,
          cancel_url:`${url.origin}/curso/${encodeURIComponent(courseId)}?payment=cancelled`,
          customer_email:user.email,
          client_reference_id:user.id,
          "metadata[course_id]":courseId,
          "metadata[user_id]":user.id,
          "line_items[0][quantity]":"1",
          "line_items[0][price_data][currency]":"eur",
          "line_items[0][price_data][unit_amount]":String(Math.round(Number(course.price)*100)),
          "line_items[0][price_data][product_data][name]":String(course.title).slice(0,120)
        });
        let upstream:Response;try{upstream=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{authorization:`Bearer ${secret}`,"content-type":"application/x-www-form-urlencoded"},body:params});}catch{throw new ApiError(502,"payment_service_unavailable");}
        if(!upstream.ok)throw new ApiError(502,"payment_service_unavailable");const payload=await upstream.json() as any;if(!payload?.url)throw new ApiError(502,"payment_service_unavailable");return json({checkout_url:payload.url});
      }finally{client.release();}
    }

    if(req.method==="POST"&&path==="/api/payments/webhook"){
      const secret=env("STRIPE_WEBHOOK_SECRET");if(!secret)throw new ApiError(503,"payment_service_unavailable");
      const raw=await req.text(),signature=req.headers.get("stripe-signature")||"";if(!stripeSignature(raw,signature,secret))throw new ApiError(400,"invalid_signature");
      let event:any;try{event=JSON.parse(raw);}catch{throw new ApiError(400,"invalid_json");}
      if(event?.type!=="checkout.session.completed")return json({status:"ignored"});
      const session=event?.data?.object;if(session?.payment_status!=="paid")return json({status:"ignored"});
      const courseId=required(session?.metadata?.course_id,"course_id",120),userId=required(session?.metadata?.user_id,"user_id",120),eventId=required(event?.id,"event_id",160),client=await db.pool.connect();
      try{
        await client.query("BEGIN");
        const inserted=await client.query("INSERT INTO public_payment_events(event_id,event_type) VALUES($1,$2) ON CONFLICT(event_id) DO NOTHING RETURNING event_id",[eventId,String(event.type)]);
        if(!inserted.rows[0]){await client.query("COMMIT");return json({status:"success"});}
        const course=(await client.query("SELECT * FROM public_courses WHERE id=$1",[courseId])).rows[0];if(!course||course.is_free)throw new ApiError(422,"invalid_payment_course");
        if(!(await client.query("SELECT id FROM public_users WHERE id=$1",[userId])).rows[0])throw new ApiError(422,"invalid_payment_user");
        await client.query("INSERT INTO public_enrollments(id,user_id,course_id,payment_status,stripe_checkout_session_id,stripe_event_id) VALUES($1,$2,$3,'completed',$4,$5) ON CONFLICT(user_id,course_id) DO UPDATE SET payment_status='completed',stripe_checkout_session_id=EXCLUDED.stripe_checkout_session_id,stripe_event_id=EXCLUDED.stripe_event_id",[id("enrollment"),userId,courseId,String(session.id||""),eventId]);
        await client.query("COMMIT");return json({status:"success"});
      }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
    }

    return json({detail:"public_route_not_found"},404);
  }catch(e:any){
    if(e instanceof ApiError)return json({detail:e.detail},e.status);
    console.error("public_api_error",{surface:coarseSurface(path),method:req.method,name:e?.name||"Error"});
    return json({detail:"internal_error"},500);
  }
}

const publicApi=async (req:Request,context:Context)=>{
  const requestId=crypto.randomUUID();
  const started=Date.now();
  let response:Response;
  try{
    response=await handlePublicApi(req,context);
  }catch(error:any){
    console.error("public_api_unhandled",{surface:coarseSurface(new URL(req.url).pathname),method:req.method,name:error?.name||"Error"});
    response=json({detail:"internal_error"},500);
  }
  const durationMs=Math.max(0,Date.now()-started);
  response.headers.set("x-request-id",requestId);
  response.headers.set("server-timing",`app;dur=${durationMs}`);
  const surface=coarseSurface(new URL(req.url).pathname);
  const status=response.status;
  const outcome=status>=500?"server_error":status===429?"rate_limited":status===403?"forbidden":status>=400?"client_error":"ok";
  console.info("public_api_request",JSON.stringify({
    request_id:requestId,
    surface,
    method:req.method,
    status,
    outcome,
    duration_ms:durationMs
  }));
  return response;
};

export default publicApi;

export const config:Config={path:[
  "/api/health",
  "/api/auth/*",
  "/api/courses/*",
  "/api/admin/*",
  "/api/payments/*"
]};
