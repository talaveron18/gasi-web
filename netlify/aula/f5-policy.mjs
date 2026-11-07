// Pure F5 author checks. Do not trust imported client-side metadata.
export function validOutcomes(raw){
 return Array.isArray(raw)&&raw.length<=100&&raw.every(x=>x&&typeof x.id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x.id)&&
  typeof x.text==='string'&&x.text.trim().length>=5&&x.text.length<=500)
  &&new Set(raw.map(x=>x.id)).size===raw.length;
}
export function validCompetencies(raw){return validOutcomes(raw);}
export function validResources(raw){
 return Array.isArray(raw)&&raw.length<=60&&raw.every(x=>
   x&&['bibliografia','enlace','glosario','faq'].includes(x.type)&&typeof x.title==='string'&&x.title.trim().length>=2&&x.title.length<=180
   &&typeof x.description==='string'&&x.description.length<=4000
   &&(!x.url||typeof x.url==='string'&&/^https:\/\//.test(x.url)&&x.url.length<=1000));
}
export function authorAudit(course,units,stats=[]){
 const issues=[],map=[];
 if(!Array.isArray(units)||units.length===0||units[0].unit_no!==0)issues.push({level:'error',message:'Falta la unidad 0 de bienvenida.'});
 if(!Array.isArray(course.competencies)||course.competencies.length===0)issues.push({level:'warning',message:'Define las competencias generales del curso.'});
 for(let i=0;i<units.length;i++){
   const u=units[i],outcomes=Array.isArray(u.learning_outcomes)?u.learning_outcomes:[],blocks=Array.isArray(u.content_blocks)?u.content_blocks:[];
   if(u.unit_no!==i)issues.push({level:'error',unit_no:u.unit_no,message:'Hay un salto en la numeración de las unidades.'});
   if(blocks.filter(b=>b.type==='heading'&&b.level===1).length!==1)issues.push({level:'error',unit_no:u.unit_no,message:'Cada unidad debe tener un único título H1.'});
   const headings=blocks.filter(b=>b.type==='heading'&&b.level===2);
   if(!headings.length)issues.push({level:'warning',unit_no:u.unit_no,message:'Faltan apartados H2.'});
   if(i>0&&!outcomes.length)issues.push({level:'error',unit_no:u.unit_no,message:'Faltan resultados de aprendizaje.'});
   const known=new Set(outcomes.map(x=>x.id));
   for(const h of headings){
     const refs=Array.isArray(h.outcome_ids)?h.outcome_ids:[];
     if(!refs.length)issues.push({level:'warning',unit_no:u.unit_no,message:'H2 sin resultados de aprendizaje asignados: '+String(h.text||'').slice(0,90)});
     if(refs.some(id=>!known.has(id)))issues.push({level:'error',unit_no:u.unit_no,message:'H2 enlaza resultados de aprendizaje inexistentes.'});
   }
   if(u.requires_test&&Number(u.question_count)!==15)issues.push({level:'error',unit_no:u.unit_no,message:'Test obligatorio sin un banco completo de 15 preguntas.'});
   if((u.requires_practice||u.allows_voluntary_practice)&&!u.has_practice)issues.push({level:'error',unit_no:u.unit_no,message:'Práctica obligatoria sin rúbrica.'});
   for(const ra of outcomes)map.push({unit_no:u.unit_no,unit_title:u.title,id:ra.id,text:ra.text,
     headings:headings.filter(h=>Array.isArray(h.outcome_ids)&&h.outcome_ids.includes(ra.id)).map(h=>h.text)});
 }
 return {issues,ready:!issues.some(x=>x.level==='error'),ra_map:map,
  metrics:units.map(u=>({...stats.find(s=>String(s.unit_id)===String(u.id)),unit_no:u.unit_no,title:u.title}))};
}
