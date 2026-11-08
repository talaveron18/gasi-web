import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {getDatabase} from '@netlify/database';
import aula from '../functions/aula.mts';
const url=process.env.GASI_INTEGRATION_DB_URL;
const db=url?getDatabase({connectionString:url}):null;
const base='http://localhost';
async function sql(statement,params=[]){const c=await db.pool.connect();try{return (await c.query(statement,params)).rows;}finally{c.release();}}
async function request(path,method='GET',body={},cookie=''){
 const r=await aula(new Request(base+'/api/aula'+path,{method,headers:{...(cookie?{cookie}:{}),...(method!=='GET'?{origin:base,'content-type':'application/json'}:{})},
  body:method==='GET'?undefined:JSON.stringify(body)}),{});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
function expect(r,status){assert.equal(r.status,status,JSON.stringify(r.body));return r.body;}
test('F4 PostgreSQL forum/tutor/record/feedback: isolated courses and learners',{
 skip:!url?'requires PostgreSQL 17 in CI':false
},async()=>{
 process.env.GASI_AULA_DB_URL=url;
 const nonce=crypto.randomBytes(5).toString('hex'),pwd=crypto.randomBytes(20).toString('base64url');
 const profiles={};
 for(const [name,role] of [['admin','admin'],['author','author'],['tutor','tutor'],['outsider','tutor'],['alice','student'],['bob','student']]){
   profiles[name]=(await sql("INSERT INTO aula_users(name,email,role,password_hash,must_change_password) VALUES($1,$2,$3,$4,FALSE) RETURNING id,email",
     [name+' de prueba',name+nonce+'@example.invalid',role,await bcrypt.hash(pwd,12)]))[0];
   profiles[name].cookie=expect(await request('/auth/login','POST',{email:profiles[name].email,password:pwd}),200);
 }
 // Login cookies are returned in response headers, never in response payload.
 for(const name of Object.keys(profiles)){
   const login=await request('/auth/login','POST',{email:profiles[name].email,password:pwd});
   profiles[name].cookie=expect(login,200)&&login.cookie;
 }
 const cookies=Object.fromEntries(Object.entries(profiles).map(([name,u])=>[name,u.cookie]));
 async function createCourse(title){
   const c=expect(await request('/admin/courses','POST',{title,objective:'Curso de pruebas de comunidad F4'},cookies.admin),201).course;
   const info=expect(await request('/courses/'+c.id,'GET',{},cookies.admin),200);
   const welcome=info.units[0];
   expect(await request('/admin/courses/'+c.id+'/units/'+welcome.id,'PATCH',{
     title:'Bienvenida y metodología',content_blocks:[{type:'heading',level:1,text:'Introducción'}]},cookies.admin),200);
   expect(await request('/admin/courses/'+c.id+'/units','POST',{
     title:'Aprendizaje secuencial',unit_no:1,learning_outcomes:[{id:'RA1',text:'Participar con seguridad'}],
     content_blocks:[{type:'heading',level:1,text:'Contenido'}]},cookies.admin),201);
   expect(await request('/admin/courses/'+c.id+'/publish','POST',{},cookies.admin),200);
   return {id:c.id,welcomeId:welcome.id};
 }
 const a=await createCourse('Formación F4 A '+nonce),b=await createCourse('Formación F4 B '+nonce);
 expect(await request('/admin/enrollments','POST',{course_id:a.id,student_id:profiles.alice.id},cookies.admin),201);
 expect(await request('/admin/enrollments','POST',{course_id:b.id,student_id:profiles.bob.id},cookies.admin),201);
 expect(await request('/admin/tutors','POST',{course_id:a.id,tutor_id:profiles.tutor.id},cookies.admin),201);
 assert.equal((await request('/courses/'+a.id+'/forum','GET',{},cookies.bob)).status,403);
 assert.equal((await request('/courses/'+a.id+'/forum','GET',{},cookies.outsider)).status,403);
 assert.equal((await request('/courses/'+a.id+'/record?student_id='+profiles.alice.id,'GET',{},cookies.bob)).status,403);
 assert.equal((await request('/courses/'+a.id+'/record?student_id='+profiles.alice.id,'GET',{},cookies.author)).status,403);
 const posted=expect(await request('/courses/'+a.id+'/forum','POST',{title:'Pregunta de bienvenida al curso',body:'¿Cómo participamos?'},cookies.alice),201);
 const threads=expect(await request('/courses/'+a.id+'/forum','GET',{},cookies.tutor),200).threads;
 assert.equal(threads.length,1);
 assert.equal(threads[0].posts,1);
 const thread=expect(await request('/courses/'+a.id+'/forum/'+posted.thread_id,'GET',{},cookies.alice),200);
 assert.equal(thread.posts.length,1);
 expect(await request('/courses/'+a.id+'/forum/'+posted.thread_id,'POST',{body:'Mensaje de tutor'},cookies.tutor),201);
 expect(await request('/courses/'+a.id+'/forum/'+posted.thread_id,'PATCH',{locked:true},cookies.tutor),200);
 assert.equal((await request('/courses/'+a.id+'/forum/'+posted.thread_id,'POST',{body:'Respuesta adicional'},cookies.alice)).status,423);
 assert.deepEqual(expect(await request('/courses/'+b.id+'/forum','GET',{},cookies.bob),200).threads,[]);
 const asked=expect(await request('/courses/'+a.id+'/tutorials','POST',{question:'¿Puede indicarme cómo completar correctamente la actividad?'},cookies.alice),201);
 assert.equal((await request('/courses/'+a.id+'/tutorials','POST',{question:'Otra pregunta'},cookies.bob)).status,403);
 const all=expect(await request('/tutor/tutorials','GET',{},cookies.tutor),200).tutorials;
 assert.ok(all.some(x=>x.id===asked.tutorial_id));
 assert.deepEqual(expect(await request('/tutor/tutorials','GET',{},cookies.outsider),200).tutorials,[]);
 expect(await request('/courses/'+a.id+'/tutorials/'+asked.tutorial_id,'POST',{answer:'Consulta el contenido y entrega la práctica de forma segura.'},cookies.tutor),200);
 const mine=expect(await request('/courses/'+a.id+'/tutorials','GET',{},cookies.alice),200).tutorials;
 assert.equal(mine[0].status,'answered');
 expect(await request('/courses/'+a.id+'/tutorials/'+asked.tutorial_id,'PATCH',{},cookies.alice),200);
 const ownRecord=expect(await request('/courses/'+a.id+'/record?student_id='+profiles.bob.id,'GET',{},cookies.alice),200);
 assert.equal(ownRecord.student_id,profiles.alice.id,'students cannot choose whose records they see');
 assert.equal(ownRecord.units.length,2);
 const assigned=expect(await request('/courses/'+a.id+'/record?student_id='+profiles.alice.id,'GET',{},cookies.tutor),200);
 assert.equal(assigned.student_id,profiles.alice.id);
 const learners=expect(await request('/courses/'+a.id+'/learners','GET',{},cookies.tutor),200).learners;
 assert.equal(learners.length,1);
 assert.equal(learners[0].student_id,profiles.alice.id);
 assert.equal((await request('/courses/'+a.id+'/learners','GET',{},cookies.alice)).status,403);
 assert.equal((await request('/courses/'+a.id+'/record?student_id='+profiles.alice.id,'GET',{},cookies.outsider)).status,403);
 assert.equal((await request('/courses/'+a.id+'/ratings','POST',{unit_id:a.welcomeId,rating:5},cookies.alice)).status,403);
 expect(await request('/courses/'+a.id+'/units/'+a.welcomeId,'GET',{},cookies.alice),200);
 expect(await request('/courses/'+a.id+'/ratings','POST',{unit_id:a.welcomeId,rating:5,comment:'Contenido claro'},cookies.alice),200);
 const ratings=expect(await request('/courses/'+a.id+'/ratings','GET',{},cookies.admin),200).ratings;
 assert.equal(ratings.length,1);
 assert.equal(Number(ratings[0].average_rating),5);
 assert.equal((await request('/courses/'+b.id+'/ratings','POST',{unit_id:a.welcomeId,rating:5},cookies.bob)).status,403);
});
