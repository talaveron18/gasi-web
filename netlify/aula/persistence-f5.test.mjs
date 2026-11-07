import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {getDatabase} from '@netlify/database';
import aula from '../functions/aula.mts';
const url=process.env.GASI_INTEGRATION_DB_URL;
const db=url?getDatabase({connectionString:url}):null;
const base='http://localhost';
async function sql(q,values=[]){const c=await db.pool.connect();try{return (await c.query(q,values)).rows;}finally{c.release();}}
async function call(path,method='GET',body={},cookie=''){
 const r=await aula(new Request(base+'/api/aula'+path,{method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{'content-type':'application/json',origin:base}:{})},body:method==='GET'?undefined:JSON.stringify(body)}),{});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
function ok(res,status){assert.equal(res.status,status,JSON.stringify(res.body));return res.body;}
test('F5 PostgreSQL: competencies, RA-H2 mapping, author checks, time analytics and security',{
 skip:!url?'requires isolated PostgreSQL':false
},async()=>{
 process.env.GASI_AULA_DB_URL=url;
 const nonce=crypto.randomBytes(6).toString('hex'),password=crypto.randomBytes(20).toString('base64url');
 async function actor(role,prefix){
   const mail=prefix+nonce+'@example.invalid';
   const u=(await sql("INSERT INTO aula_users(email,name,role,password_hash,must_change_password) VALUES($1,$2,$3,$4,FALSE) RETURNING id",[
     mail,'Persona '+role,role,await bcrypt.hash(password,12)]))[0];
   const login=await call('/auth/login','POST',{email:mail,password});ok(login,200);
   return {id:u.id,cookie:login.cookie};
 }
 const author=await actor('author','author'),other=await actor('author','other'),student=await actor('student','student');
 const competencies=[{id:'C1',text:'Reconocer y describir situaciones de riesgo'}];
 const course=ok(await call('/admin/courses','POST',{
   title:'Formación de prueba F5 '+nonce,objective:'Competencias y resultados del curso',
   duration_hours:16,access_days:90,max_units_per_day:3,competencies},author.cookie),201).course;
 const root=ok(await call('/courses/'+course.id,'GET',{},author.cookie),200).units[0];
 ok(await call('/admin/courses/'+course.id+'/units/'+root.id,'PATCH',{
  learning_outcomes:[{id:'RA0',text:'Conocer la metodología del aula'}],
  content_blocks:[{type:'heading',level:1,text:'Bienvenida'},{type:'heading',level:2,text:'Cómo estudiar',outcome_ids:['RA0']},{type:'text',text:'Introducción'}]
 },author.cookie),200);
 const resources=[{type:'enlace',title:'Referencia oficial',description:'Material de consulta',url:'https://www.boe.es'}];
 const second=ok(await call('/admin/courses/'+course.id+'/units','POST',{
   unit_no:1,title:'Unidad evaluable F5',introduction:'Recursos y competencias',
   learning_outcomes:[{id:'RA1',text:'Describir la primera respuesta segura'}],
   content_blocks:[{type:'heading',level:1,text:'Actuación inicial'},{type:'heading',level:2,text:'Secuencia',outcome_ids:['RA1']},
      {type:'accordion',text:'Pasos básicos',body:'Identificar riesgos y solicitar ayuda'},
      {type:'flashcard',text:'¿Qué es una valoración?',body:'Observación de la situación'}],
   resources
 },author.cookie),201).unit;
 assert.equal((await call('/admin/courses/'+course.id+'/audit','GET',{},other.cookie)).status,403);
 assert.equal((await call('/admin/courses/'+course.id,'PATCH',{competencies:[]},other.cookie)).status,403);
 assert.equal((await call('/admin/courses/'+course.id+'/units/'+second.id,'PATCH',{resources:[{type:'enlace',title:'Riesgoso',description:'',url:'javascript:alert(1)'}]},author.cookie)).status,422);
 assert.equal((await call('/admin/courses/'+course.id+'/units/'+second.id,'PATCH',{content_blocks:[{type:'link',text:'Riesgoso',src:'javascript:alert(1)'}]},author.cookie)).status,422);
 const audit=ok(await call('/admin/courses/'+course.id+'/audit','GET',{},author.cookie),200);
 assert.equal(audit.ready,true,JSON.stringify(audit.issues));
 assert.equal(audit.ra_map.find(x=>x.id==='RA1').headings[0],'Secuencia');
 assert.ok(audit.metrics.some(x=>x.unit_no===1));
 const detail=ok(await call('/courses/'+course.id+'/units/'+second.id,'GET',{},author.cookie),200).unit;
 assert.deepEqual(detail.resources,resources);
 ok(await call('/admin/courses/'+course.id+'/publish','POST',{},author.cookie),200);
 assert.equal((await call('/admin/courses/'+course.id,'PATCH',{competencies:[]},author.cookie)).status,409);
 const admin=await actor('admin','admin');
 ok(await call('/admin/enrollments','POST',{student_id:student.id,course_id:course.id},admin.cookie),201);
 ok(await call('/courses/'+course.id+'/units/'+root.id,'GET',{},student.cookie),200);
 await sql('UPDATE aula_unit_progress SET viewed_seconds=240 WHERE unit_id=$1',[root.id]);
 const stats=ok(await call('/admin/courses/'+course.id+'/audit','GET',{},author.cookie),200);
 const unit0=stats.metrics.find(x=>x.unit_no===0);
 assert.ok(Number(unit0.avg_seconds)>=240);
 assert.equal(unit0.studied_by,1);
});
