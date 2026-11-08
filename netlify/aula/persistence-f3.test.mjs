import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {getDatabase} from '@netlify/database';
import aula from '../functions/aula.mts';
const dbUrl=process.env.GASI_INTEGRATION_DB_URL;
const db=dbUrl?getDatabase({connectionString:dbUrl}):null;
const base='http://localhost';
async function sql(statement,args=[]){const client=await db.pool.connect();try{return (await client.query(statement,args)).rows;}finally{client.release();}}
async function call(path,method='GET',body={},cookie=''){
 const headers={...(cookie?{cookie}:{}),...(method!=='GET'?{'content-type':'application/json',origin:base}:{})};
 const response=await aula(new Request(base+'/api/aula'+path,{method,headers,body:method!=='GET'?JSON.stringify(body):undefined}),{});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
function expected(r,status){assert.equal(r.status,status,JSON.stringify(r.data));return r.data;}
test('F3 full Postgres: 15 to 10 questions, server grading, tutor rubric and gated completion',{
 skip:!dbUrl?'needs ephemeral GASI_INTEGRATION_DB_URL':false
},async()=>{
 process.env.GASI_AULA_DB_URL=dbUrl;
 const suffix=crypto.randomBytes(6).toString('hex');
 const password=crypto.randomBytes(20).toString('base64url');
 const persons={};
 for(const role of ['admin','student','tutor','author','otherTutor','otherStudent']){
   const storedRole=role==='otherTutor'?'tutor':role==='otherStudent'?'student':role;
   persons[role]=(await sql("INSERT INTO aula_users(name,email,role,password_hash,must_change_password) VALUES($1,$2,$3,$4,FALSE) RETURNING id,email",[
     'Prueba '+role,role.toLowerCase()+suffix+'@example.invalid',storedRole,await bcrypt.hash(password,12)]))[0];
 }
 const signIn=async role=>expected(await call('/auth/login','POST',{email:persons[role].email,password}),200).user;
 const adminAuth=await call('/auth/login','POST',{email:persons.admin.email,password}),studentAuth=await call('/auth/login','POST',{email:persons.student.email,password});
 const tutorAuth=await call('/auth/login','POST',{email:persons.tutor.email,password}),otherAuth=await call('/auth/login','POST',{email:persons.otherTutor.email,password});
 const authorAuth=await call('/auth/login','POST',{email:persons.author.email,password});
 const otherStudentAuth=await call('/auth/login','POST',{email:persons.otherStudent.email,password});
 for(const a of [adminAuth,studentAuth,tutorAuth,otherAuth,authorAuth,otherStudentAuth])expected(a,200);
 const admin=adminAuth.cookie,student=studentAuth.cookie,tutor=tutorAuth.cookie,outsider=otherAuth.cookie,author=authorAuth.cookie,otherStudent=otherStudentAuth.cookie;
 const course=expected(await call('/admin/courses','POST',{
  title:'Curso de prueba F3',objective:'Evaluación en servidor',duration_hours:8,access_days:90,max_units_per_day:3},admin),201).course;
 // Each actor is isolated from courses they do not own or attend.
 // Draft courses are deliberately concealed from students as 404, not 403.
 assert.equal((await call('/courses/'+course.id,'GET',{},otherStudent)).status,404);
 assert.equal((await call('/courses/'+course.id,'GET',{},student)).status,404);
 assert.equal((await call('/courses/'+course.id,'GET',{},outsider)).status,403);
 assert.equal((await call('/courses/'+course.id,'GET',{},author)).status,403);
 const first=expected(await call('/courses/'+course.id,'GET',{},admin),200).units[0];
 expected(await call('/admin/courses/'+course.id+'/units/'+first.id,'PATCH',{
   title:'Unidad cero',content_blocks:[{type:'heading',level:1,text:'Bienvenida'}],learning_outcomes:[{id:'RA0',text:'Entender la metodología'}]},admin),200);
 const next=expected(await call('/admin/courses/'+course.id+'/units','POST',{
   unit_no:1,title:'Unidad evaluable',requires_test:true,requires_practice:true,
   content_blocks:[{type:'heading',level:1,text:'RCP y DEA'}],learning_outcomes:[{id:'RA1',text:'Reconocer actuaciones'}]},admin),201).unit;
 expected(await call('/admin/courses/'+course.id+'/publish','POST',{},admin),422);
 const bank=Array.from({length:15},(_,i)=>({prompt:'Pregunta formativa '+(i+1),options:['Opción adecuada','Opción distractora','Otra opción distractora'],correct_index:0,explanation:'Revisión '+(i+1)}));
 const practice={title:'Práctica simulada',prompt:'Explica los pasos seguros ante una situación simulada de emergencia.',
  reference_solution:'Se protege la escena, se valora a la persona y se activa ayuda.',
  rubric:['Seguridad de escena','Valoración inicial','Solicitud de ayuda','Comunicación de actuaciones'],min_per_criterion:2};
 expected(await call('/admin/courses/'+course.id+'/units/'+next.id+'/assessment','PUT',{questions:bank.slice(0,14),practice},admin),422);
 expected(await call('/admin/courses/'+course.id+'/units/'+next.id+'/assessment','PUT',{questions:bank,practice},admin),200);
 const optional=expected(await call('/admin/courses/'+course.id+'/units','POST',{
   unit_no:2,title:'Práctica voluntaria de repaso',allows_voluntary_practice:true,
   content_blocks:[{type:'heading',level:1,text:'Repaso voluntario'}],
   learning_outcomes:[{id:'RA2',text:'Describir el procedimiento de respuesta'}]
 },admin),201).unit;
 expected(await call('/admin/courses/'+course.id+'/units/'+optional.id+'/assessment','PUT',{questions:[],practice},admin),200);
 expected(await call('/admin/courses/'+course.id+'/publish','POST',{},admin),200);
 // Neither a different author nor an unassigned tutor may alter or read the assessment.
 assert.equal((await call('/admin/courses/'+course.id+'/units/'+next.id+'/assessment','GET',{},author)).status,403);
 assert.equal((await call('/admin/courses/'+course.id+'/units/'+next.id+'/assessment','PUT',{questions:bank,practice},author)).status,403);
 assert.equal((await call('/courses/'+course.id,'GET',{},outsider)).status,403);
 expected(await call('/admin/tutors','POST',{course_id:course.id,tutor_id:persons.tutor.id},admin),201);
 expected(await call('/admin/enrollments','POST',{course_id:course.id,student_id:persons.student.id},admin),201);
 assert.equal((await call('/courses/'+course.id,'GET',{},otherStudent)).status,403);
 assert.equal((await call('/courses/'+course.id+'/units/'+next.id+'/assessment','GET',{},otherStudent)).status,403);
 assert.equal((await call('/courses/'+course.id+'/units/'+next.id+'/assessment/test','POST',{attempt_id:'not-owned',answers:{}},otherStudent)).status,403);
 assert.equal((await call('/admin/users','GET',{},tutor)).status,403);
 assert.equal((await call('/admin/users','GET',{},student)).status,403);
 assert.equal((await call('/admin/users','GET',{},author)).status,403);
 assert.equal((await call('/tutor/reviews','GET',{},author)).status,403);
 let listing=expected(await call('/courses/'+course.id,'GET',{},student),200);
 assert.deepEqual(listing.units.map(u=>u.open),[true,false,false]);
 expected(await call('/courses/'+course.id+'/units/'+first.id,'GET',{},student),200);
 await sql("UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1",[first.id]);
 expected(await call('/courses/'+course.id+'/units/'+first.id+'/complete','POST',{},student),200);
 expected(await call('/courses/'+course.id+'/units/'+next.id,'GET',{},student),200);
 const assessment='/courses/'+course.id+'/units/'+next.id+'/assessment';
 const initial=expected(await call(assessment,'GET',{},student),200);
 assert.equal(initial.questions.length,10);
 assert.equal(new Set(initial.questions.map(q=>q.id)).size,10);
 assert.ok(initial.questions.every(q=>q.options.length===3&&!Object.hasOwn(q,'correct_index')));
 assert.ok(initial.attempt_id);
 const attemptOrders=(await sql("SELECT option_orders FROM aula_test_attempts WHERE id=$1",[initial.attempt_id]))[0].option_orders;
 const badAnswers=Object.fromEntries(initial.questions.map(q=>[q.id,attemptOrders[q.id].indexOf(0)]));
 assert.ok(Object.values(attemptOrders).every(order=>order.length===3&&new Set(order).size===3));
 assert.equal((await call(assessment+'/test','POST',{attempt_id:initial.attempt_id,answers:{...badAnswers,injected:0}},student)).status,422);
 const grade=expected(await call(assessment+'/test','POST',{attempt_id:initial.attempt_id,answers:badAnswers},student),200);
 assert.equal(grade.score,10);assert.equal(grade.passed,true);
 assert.equal((await call(assessment+'/test','POST',{attempt_id:initial.attempt_id,answers:badAnswers},student)).status,409);
 assert.equal((await call('/courses/'+course.id+'/units/'+next.id+'/complete','POST',{},student)).status,422);
 await sql('UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1',[next.id]);
 assert.equal((await call('/courses/'+course.id+'/units/'+next.id+'/complete','POST',{},student)).status,423);
 const sent=expected(await call(assessment+'/practice','POST',{answer:'Valoro la seguridad, compruebo respiración y solicito ayuda urgente.'},student),201);
 assert.equal(sent.submission.status,'pending');
 assert.ok(sent.reference_solution);
 const gated=expected(await call(assessment,'GET',{},student),200);
 assert.equal(gated.practice.submission.status,'pending');
 assert.ok(gated.practice.reference_solution);
 const queue=expected(await call('/tutor/reviews','GET',{},tutor),200).reviews;
 assert.equal(queue.length,1);
 assert.equal(queue[0].id,sent.submission.id);
 assert.deepEqual(expected(await call('/tutor/reviews','GET',{},outsider),200).reviews,[]);
 assert.equal((await call('/tutor/reviews/'+sent.submission.id,'POST',{decision:'approved',grades:[3,3,3,3]},outsider)).status,403);
 assert.equal((await call('/tutor/reviews/'+sent.submission.id,'POST',{decision:'approved',grades:[1,3,3,3]},tutor)).status,422);
 expected(await call('/tutor/reviews/'+sent.submission.id,'POST',{decision:'approved',grades:[3,3,3,3],feedback:'Correcto'},tutor),200);
 const after=expected(await call(assessment,'GET',{},student),200);
 assert.equal(after.test_passed,true);assert.equal(after.practice_approved,true);
 expected(await call('/courses/'+course.id+'/units/'+next.id+'/complete','POST',{},student),200);
 listing=expected(await call('/courses/'+course.id,'GET',{},student),200);
 assert.deepEqual(listing.units.map(u=>u.completed),[true,true,false]);
 const voluntaryOpen=expected(await call('/courses/'+course.id+'/units/'+optional.id,'GET',{},student),200);
 assert.equal(voluntaryOpen.unit.allows_voluntary_practice,true);
 const optionalAssessment=expected(await call('/courses/'+course.id+'/units/'+optional.id+'/assessment','GET',{},student),200);
 assert.ok(optionalAssessment.practice);
 await sql('UPDATE aula_unit_progress SET viewed_seconds=20 WHERE unit_id=$1',[optional.id]);
 expected(await call('/courses/'+course.id+'/units/'+optional.id+'/complete','POST',{},student),200);
 const voluntarySent=expected(await call('/courses/'+course.id+'/units/'+optional.id+'/assessment/practice','POST',{
   answer:'Reviso la seguridad de la escena y pido ayuda especializada de forma inmediata.'},student),201);
 assert.equal(voluntarySent.submission.status,'pending');
 const optionalQueue=expected(await call('/tutor/reviews','GET',{},tutor),200).reviews;
 assert.ok(optionalQueue.some(x=>x.id===voluntarySent.submission.id));
 listing=expected(await call('/courses/'+course.id,'GET',{},student),200);
 assert.deepEqual(listing.units.map(u=>u.completed),[true,true,true]);
});
