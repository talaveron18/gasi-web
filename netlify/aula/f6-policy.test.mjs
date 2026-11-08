import test from 'node:test';
import assert from 'node:assert/strict';
import {validSurvey,validateSurveyResponses,eligibleCertificate} from './f6-policy.mjs';
const q=[{id:1,type:'scale',text:'Califica el contenido'},
{id:2,type:'text',text:'¿Qué mejorarías?'},{id:3,type:'choice',text:'¿Recomendarías el curso?',options:['Sí','No']}];
test('survey validates question uniqueness, type and complete server answers',()=>{
 assert.equal(validSurvey('Encuesta final','final',q),true);
 assert.equal(validSurvey('Encuesta final','final',[...q,q[0]]),false);
 assert.equal(validSurvey('Encuesta final','final',[{id:1,type:'choice',text:'Respuesta sin alternativas'}]),false);
 assert.equal(validateSurveyResponses(q,{'1':5,'2':'Muy claro','3':0}),true);
 assert.equal(validateSurveyResponses(q,{'1':5,'2':'Muy claro'}),false);
 assert.equal(validateSurveyResponses(q,{'1':5,'2':'Muy claro','3':9}),false);
 assert.equal(validateSurveyResponses(q,{'1':5,'2':'Muy claro','3':0,'999':2}),false);
});
test('certificate requires all unit approvals and an actual final survey',()=>{
 const units=[{id:'u0',requires_test:false,requires_practice:false},{id:'u1',requires_test:true,requires_practice:true}];
 const p=new Map([['u0',{completed_at:'now'}],['u1',{completed_at:'now',test_passed_at:'now'}]]);
 assert.equal(eligibleCertificate(units,p,true),false);
 p.get('u1').practice_approved_at='now';
 assert.equal(eligibleCertificate(units,p,false),false);
 assert.equal(eligibleCertificate(units,p,true),true);
});
