// F6 validation: certificate issuance never trusts the browser's claims.
export function validSurvey(title,kind,questions){
 if(typeof title!=='string'||title.trim().length<5||title.length>180||!['final','followup'].includes(kind)
   ||!Array.isArray(questions)||questions.length<1||questions.length>20)return false;
 const ids=new Set();
 for(const q of questions){
   if(!q||!Number.isInteger(q.id)||q.id<1||q.id>1000||ids.has(q.id)||
     typeof q.text!=='string'||q.text.trim().length<5||q.text.length>600||
     !['scale','text','choice'].includes(q.type))return false;
   if(q.type==='choice'&&(!Array.isArray(q.options)||q.options.length<2||q.options.length>6||
      q.options.some(o=>typeof o!=='string'||o.trim().length<1||o.length>200)))return false;
   ids.add(q.id);
 }
 return true;
}
export function validateSurveyResponses(questions,responses){
 if(!Array.isArray(questions)||!responses||typeof responses!=='object'||Array.isArray(responses)||
   Object.keys(responses).length!==questions.length)return false;
 const ids=new Set(questions.map(q=>String(q.id)));
 if(Object.keys(responses).some(id=>!ids.has(id)))return false;
 return questions.every(q=>{
   const value=responses[String(q.id)];
   if(q.type==='scale')return Number.isInteger(value)&&value>=1&&value<=5;
   if(q.type==='text')return typeof value==='string'&&value.trim().length>=3&&value.length<=2000;
   return q.type==='choice'&&Number.isInteger(value)&&value>=0&&value<q.options.length;
 });
}
export function eligibleCertificate(units,progressByUnit,finalSubmitted){
 if(!finalSubmitted||!Array.isArray(units)||units.length<2)return false;
 return units.every(u=>{
   const row=progressByUnit.get(String(u.id));
   return !!row?.completed_at&&(!u.requires_test||!!row.test_passed_at)&&(!u.requires_practice||!!row.practice_approved_at);
 });
}
