import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {getDatabase} from '@netlify/database';
import aula from '../functions/aula.mts';
const url=process.env.GASI_INTEGRATION_DB_URL;
const db=url?getDatabase({connectionString:url}):null;
const base='http://localhost';
async function sql(text,params=[]){const c=await db.pool.connect();try{return (await c.query(text,params)).rows;}finally{c.release();}}
async function call(path,method='GET',data={},cookie=''){
 const r=await aula(new Request(base+'/api/aula'+path,{method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{origin:base,'content-type':'application/json'}:{})},
   body:method==='GET'?undefined:JSON.stringify(data)}),{});
 return {status:r.status,payload:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
function expect(r,status){assert.equal(r.status,status,JSON.stringify(r.payload));return r.payload;}
test('F6 PostgreSQL: survey validation, completion gating, durable certificate, cross-student confidentiality',{
 skip:!url?'requires isolated PostgreSQL':false
},async()=>{
 process.env.GASI_AULA_DB_URL=url;
 const suffix=crypto.randomBytes(6).toString('hex'),password=crypto.randomBytes(18).toString('base64url');
 const actors={};
 for(const [n,role] of [['author','author'],['admin','admin'],['student','student'],['outsider','student']]){
   const email=n+suffix+'@example.invalid';
   const u=(await sql("INSERT INTO aula_users(name,email,role,password_hash,must_change_password) VALUES($1,$2,$3,$4,FALSE) RETURNING id",
     [n+' de prueba',email,role,await bcrypt.hash(password,12)]))[0];
   const login=await call('/auth/login','POST',{email,password});
   expect(login,200);actors[n]={id:u.id,cookie:login.cookie};
 }
 const a=actors.author.cookie,admin=actors.admin.cookie,student=actors.student.cookie,outsider=actors.outsider.cookie;
 const course=expect(await call('/admin/courses','POST',{title:'Curso de certificados '+suffix,
  objective:'Certificación verificable',duration_hours:8,access_days:90},a),201).course;
 const unit0=expect(await call('/courses/'+course.id,'GET',{},a),200).units[0];
 expect(await call('/admin/courses/'+course.id+'/units/'+unit0.id,'PATCH',{
  title:'Bienvenida',content_blocks:[{type:'heading',level:1,text:'Bienvenida'}]},a),200);
 const unit1=expect(await call('/admin/courses/'+course.id+'/units','POST',{
  unit_no:1,title:'Actuación inicial',learning_outcomes:[{id:'RA1',text:'Reconocer los primeros pasos'}],
  content_blocks:[{type:'heading',level:1,text:'Actuación inicial'}]},a),201).unit;
 const question=[{id:1,type:'scale',text:'Puntúa tu satisfacción'},
  {id:2,type:'choice',text:'¿Recomendarías este curso?',options:['Sí','No']},
  {id:3,type:'text',text:'¿Qué destacarías de la formación?'}];
 const follow=expect(await call('/admin/courses/'+course.id+'/surveys','POST',{
   kind:'followup',title:'Seguimiento del curso',unit_id:unit1.id,questions:[{id:1,type:'scale',text:'Valora esta unidad'}]},a),201);
 const final=expect(await call('/admin/courses/'+course.id+'/surveys','POST',{kind:'final',title:'Encuesta de finalización',questions:question},a),201);
 assert.equal((await call('/admin/courses/'+course.id+'/surveys','POST',{kind:'final',title:'Otra encuesta final',questions:question},a)).status,409);
 assert.equal((await call('/admin/courses/'+course.id+'/surveys','POST',{kind:'followup',title:'Encuesta no válida',questions:[{id:1,type:'choice',text:'Faltan alternativas'}]},a)).status,422);
 expect(await call('/admin/courses/'+course.id+'/publish','POST',{},a),200);
 assert.equal((await call('/admin/courses/'+course.id+'/surveys','POST',{kind:'followup',title:'Otra encuesta',questions:question},a)).status,409);
 expect(await call('/admin/enrollments','POST',{course_id:course.id,student_id:actors.student.id},admin),201);
 assert.equal((await call('/courses/'+course.id+'/surveys','GET',{},outsider)).status,403);
 assert.equal((await call('/courses/'+course.id+'/certificate','POST',{},student)).status,423);
 const list=expect(await call('/courses/'+course.id+'/surveys','GET',{},student),200).surveys;
 assert.equal(list.length,2);
 const initial=await call('/courses/'+course.id+'/surveys/'+final.survey_id,'POST',{responses:{'1':5,'2':0,'3':'Muy claro y completo'}},student);
 assert.equal(initial.status,423);
 assert.equal((await call('/courses/'+course.id+'/surveys/'+follow.survey_id,'POST',{responses:{'1':4}},student)).status,423);
 expect(await call('/courses/'+course.id+'/units/'+unit0.id,'GET',{},student),200);
 await sql('UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1',[unit0.id]);
 expect(await call('/courses/'+course.id+'/units/'+unit0.id+'/complete','POST',{},student),200);
 expect(await call('/courses/'+course.id+'/units/'+unit1.id,'GET',{},student),200);
 expect(await call('/courses/'+course.id+'/surveys/'+follow.survey_id,'POST',{responses:{'1':4}},student),201);
 await sql('UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1',[unit1.id]);
 expect(await call('/courses/'+course.id+'/units/'+unit1.id+'/complete','POST',{},student),200);
 assert.equal((await call('/courses/'+course.id+'/surveys/'+final.survey_id,'POST',{responses:{'1':0,'2':0,'3':'Valoración'}},student)).status,422);
 expect(await call('/courses/'+course.id+'/surveys/'+final.survey_id,'POST',{responses:{'1':5,'2':0,'3':'Muy claro y completo'}},student),201);
 assert.equal((await call('/courses/'+course.id+'/surveys/'+final.survey_id,'POST',{responses:{'1':5,'2':0,'3':'Duplicado'}},student)).status,409);
 const issued=expect(await call('/courses/'+course.id+'/certificate','POST',{},student),201).certificate;
 assert.match(issued.certificate_code,/^[a-f0-9]{40}$/);
 const listed=expect(await call('/my/certificates','GET',{},student),200).certificates;
 assert.ok(listed.some(c=>c.id===issued.id));
 const single=expect(await call('/my/certificates/'+issued.id,'GET',{},student),200).certificate;
 assert.equal(single.student_name,'student de prueba');
 assert.equal((await call('/my/certificates/'+issued.id,'GET',{},outsider)).status,404);
 assert.deepEqual(expect(await call('/my/certificates','GET',{},outsider),200).certificates,[]);
 expect(await call('/courses/'+course.id+'/certificate','POST',{},student),201);
 await sql("UPDATE aula_enrollments SET deadline=now()-interval '1 day' WHERE course_id=$1 AND student_id=$2",[course.id,actors.student.id]);
 assert.equal((await call('/courses/'+course.id+'/certificate','GET',{},student)).status,403);
 expect(await call('/my/certificates/'+issued.id,'GET',{},student),200);
});
