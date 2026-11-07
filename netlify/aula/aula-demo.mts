// PREVIEW ONLY — entirely synthetic accounts and course content.
// All demo credentials and signing secrets come from Netlify's deploy-preview
// scoped environment, never source control or client assets.
// This function never connects to clinical or student production databases.
import type {Context} from "@netlify/functions";
import crypto from "node:crypto";

const COOKIE="gasi_aula_demo_session";
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex, nofollow"};
const json=(data:any,status=200,extra:any={})=>new Response(JSON.stringify(data),{status,headers:{...HEADERS,...extra}});
const env=(key:string)=>String((globalThis as any).Netlify?.env?.get?.(key)||process.env[key]||"");
const signed=(value:string,key:string)=>crypto.createHmac("sha256",key).update(value).digest("base64url");
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);};
const cookie=(token:string)=>COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400";
const clearCookie=()=>COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
const courseId="10000000-0000-4000-8000-000000000001";
const ids=[
 "20000000-0000-4000-8000-000000000000",
 "20000000-0000-4000-8000-000000000001",
 "20000000-0000-4000-8000-000000000002"
];
const course={
 id:courseId,title:"Primeros auxilios y RCP para equipos — demostración",
 objective:"Reconocer situaciones de riesgo, comprender la secuencia de activación de ayuda y practicar los principios básicos de actuación en primeros auxilios y RCP.",
 target_audience:"Personal de empresas y organizaciones",
 requirements:"Sin requisitos previos. Contenido formativo ficticio para comprobar el diseño.",
 presentation:"Ejemplo de curso estructurado en unidades secuenciales, inspirado en los requisitos funcionales facilitados por GASI.",
 duration_hours:20,access_days:90,max_units_per_day:2,status:"active"
};
const units=[
 {id:ids[0],unit_no:0,title:"Bienvenida y metodología",introduction:"Cómo utilizar el aula, consultar el índice y avanzar.",requires_test:false,requires_practice:false,
 learning_outcomes:[{id:"RA0",text:"Conocer la metodología del curso y cómo se registrará el progreso."}],
 content_blocks:[{type:"heading",level:1,text:"Bienvenida al curso"},{type:"text",text:"En esta vista previa se emplean exclusivamente datos ficticios. Lee cada unidad y consulta las instrucciones antes de continuar."},{type:"callout",style:"recuerda",text:"El progreso se desbloquea de forma secuencial. En el entorno real, los requisitos se validan en el servidor."},{type:"heading",level:2,text:"Metodología de aprendizaje"},{type:"text",text:"Cada apartado contiene información, resultados de aprendizaje y, cuando corresponda, actividades o pruebas evaluables."}]},
 {id:ids[1],unit_no:1,title:"Reconocimiento y primera respuesta",introduction:"Principios de seguridad y activación de ayuda.",requires_test:false,requires_practice:false,
 learning_outcomes:[{id:"RA1",text:"Identificar riesgos del entorno y activar los recursos correspondientes."}],
 content_blocks:[{type:"heading",level:1,text:"Reconocimiento de una situación"},{type:"text",text:"Antes de intervenir, valora la seguridad del entorno y comunica la situación al servicio de emergencias correspondiente."},{type:"heading",level:2,text:"Secuencia de actuación"},{type:"text",text:"Contenido didáctico sintético para la demostración del lector. No sustituye formación práctica ni protocolos actualizados."},{type:"callout",style:"importante",text:"En España, ante una emergencia real, contacta con el 112."}]},
 {id:ids[2],unit_no:2,title:"RCP y DEA — actividades evaluables",introduction:"Evaluación de conocimientos y una práctica supervisada.",requires_test:true,requires_practice:true,
 learning_outcomes:[{id:"RA2",text:"Describir las fases de la reanimación y la utilización del DEA según el programa formativo."}],
 content_blocks:[{type:"heading",level:1,text:"Aprendizaje y evaluación"},{type:"text",text:"Este apartado muestra el bloqueo preparado para la fase 3: no se puede completar sin un test superado y una práctica evaluada por el tutor."},{type:"callout",style:"ejemplo",text:"Una práctica obligatoria figurará como pendiente de evaluar hasta que el tutor la corrija."}]}
];
function settings(req:Request){
 const host=new URL(req.url).hostname;
 const key=env("GASI_AULA_DEMO_SESSION_SECRET");
 const accountsRaw=env("GASI_AULA_DEMO_ACCOUNTS");
 if(!/^deploy-preview-\d+--[a-z0-9-]+\.netlify\.app$/.test(host)||key.length<32||!accountsRaw)
   return null;
 try{
   const accounts=JSON.parse(accountsRaw);
   if(!Array.isArray(accounts)||!accounts.every(a=>a.email&&a.name&&["admin","author","tutor","student"].includes(a.role)&&a.password))
     return null;
   return {key,accounts};
 }catch{return null;}
}
function issue(session:any,key:string){
 const token=Buffer.from(JSON.stringify(session)).toString("base64url");
 return token+"."+signed(token,key);
}
function getSession(req:Request,key:string){
 const item=(req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 if(!item)return null;
 try{
   const token=decodeURIComponent(item.slice(COOKIE.length+1));
   const [body,sig]=token.split(".");
   if(!body||!sig||!equal(sig,signed(body,key)))return null;
   const user=JSON.parse(Buffer.from(body,"base64url").toString("utf8"));
   if(!user||!Number.isFinite(user.expires)||user.expires<Date.now())return null;
   if(!Array.isArray(user.completed)||user.completed.length>3||!["admin","author","tutor","student"].includes(user.role))return null;
   return user;
 }catch{return null;}
}
function profile(session:any){
 return {user_id:session.user_id,name:session.name,email:session.email,role:session.role,must_change_password:false};
}
function safeOrigin(req:Request){
 if(req.method==="GET")return true;
 const origin=req.headers.get("origin");
 return Boolean(origin&&origin===new URL(req.url).origin&&String(req.headers.get("content-type")||"").includes("application/json"));
}
async function parseBody(req:Request){
 const raw=await req.text();
 if(Buffer.byteLength(raw)>10000)throw new Error("too_large");
 return JSON.parse(raw);
}
function unitOutline(session:any){
 return units.map((u,i)=>({
 id:u.id,unit_no:u.unit_no,title:u.title,requires_test:u.requires_test,requires_practice:u.requires_practice,
 learning_outcomes:u.learning_outcomes,
 open:session.role!=="student"||i===0||session.completed.includes(units[i-1].id),
 completed:session.completed.includes(u.id),viewed_seconds:session.completed.includes(u.id)?30:0,
 reason:session.role==="student"&&i>0&&!session.completed.includes(units[i-1].id)?"Debes completar las unidades anteriores, incluidos sus requisitos de evaluación.":null
 }));
}
function previewRoute(req:Request){
 const path=new URL(req.url).searchParams.get("path");
 return typeof path==="string"&&path.startsWith("/")&&path.length<180?path:null;
}
export default async function aulaDemo(req:Request,_ctx:Context){
 const config=settings(req);
 if(!config)return json({detail:"preview_demo_not_configured"},503);
 if(!safeOrigin(req))return json({detail:"origin_denied"},403);
 const path=previewRoute(req);
 if(!path)return json({detail:"not_found"},404);
 if(req.method==="GET"&&path==="/health")return json({ok:true,mode:"synthetic_preview"});
 if(req.method==="POST"&&path==="/auth/login"){
   let b:any;
   try{b=await parseBody(req);}catch{return json({detail:"invalid_json"},400);}
   const email=String(b?.email||"").trim().toLowerCase(),pass=String(b?.password||"");
   const match=config.accounts.find((a:any)=>a.email.toLowerCase()===email&&equal(signed(pass,config.key),signed(String(a.password),config.key)));
   if(!match)return json({detail:"invalid_credentials"},401);
   const session={user_id:"preview-"+match.role,name:match.name,email:match.email,role:match.role,completed:[],expires:Date.now()+4*3600000};
   return json({user:profile(session)},200,{"set-cookie":cookie(issue(session,config.key))});
 }
 const session=getSession(req,config.key);
 if(!session)return json({detail:"not_authenticated"},401);
 if(req.method==="GET"&&path==="/auth/me")return json({user:profile(session)});
 if(req.method==="POST"&&path==="/auth/logout")return json({ok:true},200,{"set-cookie":clearCookie()});
 if(req.method==="POST"&&path==="/auth/password")return json({detail:"demo_read_only"},409);
 if(req.method==="GET"&&path==="/my/courses"){
   return json({courses:[{...course,deadline:"2027-02-01T00:00:00.000Z"}]});
 }
 if(req.method==="GET"&&path==="/admin/users"&&session.role==="admin"){
   return json({users:config.accounts.map((a:any,i:number)=>({id:"30000000-0000-4000-8000-"+String(i).padStart(12,"0"),name:a.name,email:a.email,role:a.role,active:true}))});
 }
 if(req.method==="GET"&&path==="/admin/tutors"&&["admin","author"].includes(session.role)){
   return json({tutors:config.accounts.filter((a:any)=>a.role==="tutor").map((a:any)=>({id:"preview-tutor",name:a.name,email:a.email}))});
 }
 const matched=path.match(/^\/courses\/([a-f0-9-]+)(?:\/units\/([a-f0-9-]+)(?:\/(complete|heartbeat))?)?$/);
 if(matched&&matched[1]===courseId){
   const unit=matched[2]?units.find(x=>x.id===matched[2]):null;
   if(!matched[2]&&req.method==="GET")return json({course:{...course,deadline:"2027-02-01T00:00:00Z"},units:unitOutline(session)});
   if(!unit)return json({detail:"unit_not_found"},404);
   const state=unitOutline(session).find(x=>x.id===unit.id);
   if(!state.open)return json({detail:"unit_locked",reason:state.reason},423);
   if(req.method==="GET"&&!matched[3])return json({unit});
   if(req.method==="POST"&&matched[3]==="heartbeat")return json({viewed_seconds:30});
   if(req.method==="POST"&&matched[3]==="complete"){
     if(session.role!=="student")return json({detail:"student_only"},403);
     if(unit.requires_test||unit.requires_practice)return json({detail:"assessment_required",reason:"Para finalizar esta unidad faltan el test y la práctica obligatoria (fase 3)."},423);
     if(!session.completed.includes(unit.id))session.completed.push(unit.id);
     return json({ok:true},200,{"set-cookie":cookie(issue(session,config.key))});
   }
 }
 // The author controls can be inspected, but cannot mutate any records in a
 // shared, public review URL. The real PostgreSQL API implements these writes.
 if(path.startsWith("/admin/"))return json({detail:"demo_read_only"},409);
 return json({detail:"not_found"},404);
}
