import test from 'node:test';
import assert from 'node:assert/strict';
import {TEST_BANK_SIZE,TEST_SAMPLE_SIZE,validateBank,selectTen,gradeTest,validateRubric,gradePractice} from './f3-policy.mjs';
const bank=Array.from({length:15},(_,i)=>({id:'q'+i,prompt:'Pregunta ficticia '+i,options:['Primera','Segunda','Tercera'],correct_index:i%3,explanation:'Revisión '+i}));
test('validates exactly 15 different 3-option questions',()=>{
 assert.equal(TEST_BANK_SIZE,15);assert.equal(TEST_SAMPLE_SIZE,10);
 assert.equal(validateBank(bank),true);
 assert.equal(validateBank(bank.slice(0,14)),false);
 assert.equal(validateBank(bank.map(q=>({...q,options:['Uno','Uno','Otro']}))),false);
});
test('samples exactly ten unique bank questions, never creates answers on client',()=>{
 const sample=selectTen(bank,()=>0.5);
 assert.equal(sample.length,10);
 assert.equal(new Set(sample.map(x=>x.id)).size,10);
 assert.ok(sample.every(x=>bank.includes(x)));
});
test('grades securely, requires all ten exact IDs and seven correct',()=>{
 const sample=selectTen(bank,()=>0.5);
 const all=Object.fromEntries(sample.map(q=>[q.id,q.correct_index]));
 assert.equal(gradeTest(sample,all).score,10);
 assert.equal(gradeTest(sample,all).passed,true);
 for(let i=0;i<4;i++)all[sample[i].id]=(sample[i].correct_index+1)%3;
 assert.equal(gradeTest(sample,all).score,6);
 assert.equal(gradeTest(sample,all).passed,false);
 assert.throws(()=>gradeTest(sample,{...all,injected:2}),/invalid_answers/);
 assert.throws(()=>gradeTest(sample,{...all,[sample[0].id]:9}),/invalid_answers/);
});
test('rubric requires four criteria and minimum per criterion',()=>{
 const rubric=['Seguridad y escena','Valoración clínica inicial','Solicitud de ayuda y comunicación','Secuencia correcta de respuesta'];
 assert.equal(validateRubric(rubric),true);
 assert.equal(validateRubric(rubric.slice(0,3)),false);
 assert.deepEqual(gradePractice(rubric,[2,3,4,2]),{approved:true,total:11,max:16});
 assert.equal(gradePractice(rubric,[4,4,1,4]).approved,false);
 assert.throws(()=>gradePractice(rubric,[2,2,2]),/invalid_rubric_grades/);
});
