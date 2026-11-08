import test from 'node:test';
import assert from 'node:assert/strict';
import {validOutcomes,validCompetencies,validResources,authorAudit} from './f5-policy.mjs';
test('valid author metadata checks uniqueness and HTTPS links',()=>{
 assert.equal(validCompetencies([{id:'C1',text:'Competencia de ejemplo'}]),true);
 assert.equal(validOutcomes([{id:'RA1',text:'Resultado aprendido'},{id:'RA1',text:'Duplicado'}]),false);
 assert.equal(validResources([{type:'enlace',title:'Fuente oficial',description:'Referencia',url:'https://example.invalid'}]),true);
 assert.equal(validResources([{type:'enlace',title:'Malicioso',description:'',url:'javascript:alert(1)'}]),false);
});
test('reports mismatched headings, RA links, missing tests and practice rubric',()=>{
 const course={competencies:[{id:'C1',text:'Competencia principal'}]};
 const units=[
  {id:'u0',unit_no:0,title:'Introducción',learning_outcomes:[],content_blocks:[{type:'heading',level:1,text:'Bienvenida'}]},
  {id:'u1',unit_no:1,title:'Evaluación',learning_outcomes:[{id:'RA1',text:'Aprender actuaciones'}],
   content_blocks:[{type:'heading',level:1,text:'Evaluación'},{type:'heading',level:2,text:'Contenido',outcome_ids:['RA-ERRONEO']}],
   requires_test:true,question_count:14,requires_practice:true,has_practice:false}
 ];
 const result=authorAudit(course,units,[]);
 assert.equal(result.ready,false);
 assert.ok(result.issues.some(x=>/15 preguntas/.test(x.message)));
 assert.ok(result.issues.some(x=>/inexistentes/.test(x.message)));
 assert.equal(result.ra_map[0].headings.length,0);
 units[1].content_blocks[1].outcome_ids=['RA1'];
 units[1].question_count=15;units[1].has_practice=true;
 assert.equal(authorAudit(course,units).ready,true);
});
