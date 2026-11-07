// F3 assessment policy: do not trust client-selected questions, scores or approvals.
export const TEST_BANK_SIZE=15;
export const TEST_SAMPLE_SIZE=10;
export const TEST_MIN_CORRECT=7;
export function validateBank(bank){
 if(!Array.isArray(bank)||bank.length!==TEST_BANK_SIZE) return false;
 return bank.every((q,i)=>q&&typeof q.prompt==='string'&&q.prompt.trim().length>=10&&q.prompt.length<=2000&&
   Array.isArray(q.options)&&q.options.length===3&&q.options.every(o=>typeof o==='string'&&o.trim().length>=1&&o.length<=500)&&
   new Set(q.options.map(o=>o.trim().toLowerCase())).size===3&&Number.isInteger(q.correct_index)&&q.correct_index>=0&&q.correct_index<=2&&
   (q.explanation===undefined||(typeof q.explanation==='string'&&q.explanation.length<=3000)));
}
export function selectTen(bank,random=Math.random){
 if(!Array.isArray(bank)||bank.length!==TEST_BANK_SIZE)throw new Error('test_bank_incomplete');
 const arr=[...bank];
 for(let i=arr.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
 return arr.slice(0,TEST_SAMPLE_SIZE);
}
export function gradeTest(selected,answers){
 if(!Array.isArray(selected)||selected.length!==TEST_SAMPLE_SIZE||!answers||typeof answers!=='object'||Array.isArray(answers))throw new Error('invalid_attempt');
 const ids=new Set(selected.map(q=>String(q.id)));
 if(ids.size!==10||Object.keys(answers).length!==10||Object.keys(answers).some(id=>!ids.has(id)))throw new Error('invalid_answers');
 if(selected.some(q=>!Number.isInteger(answers[String(q.id)])||answers[String(q.id)]<0||answers[String(q.id)]>2))throw new Error('invalid_answers');
 const score=selected.filter(q=>answers[String(q.id)]===Number(q.correct_index)).length;
 return {score,passed:score>=TEST_MIN_CORRECT,review:selected.map(q=>({
   id:String(q.id),submitted:answers[String(q.id)],correct_index:Number(q.correct_index),
   correct:answers[String(q.id)]===Number(q.correct_index),explanation:q.explanation||''
 }))};
}
export function validateRubric(rubric){
 return Array.isArray(rubric)&&rubric.length>=4&&rubric.length<=12&&rubric.every(x=>typeof x==='string'&&x.trim().length>=5&&x.length<=300)&&new Set(rubric.map(x=>x.trim().toLowerCase())).size===rubric.length;
}
export function gradePractice(rubric,grades,minPerCriterion=2){
 if(!validateRubric(rubric)||!Array.isArray(grades)||grades.length!==rubric.length||
   grades.some(n=>!Number.isInteger(n)||n<0||n>4)||!Number.isInteger(minPerCriterion)||minPerCriterion<1||minPerCriterion>4)throw new Error('invalid_rubric_grades');
 return {approved:grades.every(n=>n>=minPerCriterion),total:grades.reduce((x,n)=>x+n,0),max:4*grades.length};
}

export function makeOptionOrders(sample,draw=n=>Math.floor(Math.random()*n)){
 if(!Array.isArray(sample)||sample.length!==TEST_SAMPLE_SIZE)throw new Error('invalid_sample');
 const orders={};
 for(const q of sample){
   const order=[0,1,2];
   for(let i=2;i>0;i--){const j=draw(i+1);if(!Number.isInteger(j)||j<0||j>i)throw new Error('invalid_rng');
     [order[i],order[j]]=[order[j],order[i]];
   }
   orders[String(q.id)]=order;
 }
 return orders;
}
export function gradeWithOptionOrders(selected,answers,orders={}){
 if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new Error('invalid_answers');
 const original={};
 for(const q of selected){
   const id=String(q.id),order=orders[id]||[0,1,2];
   if(!Array.isArray(order)||order.length!==3||new Set(order).size!==3||order.some(n=>!Number.isInteger(n)||n<0||n>2)
      ||!Number.isInteger(answers[id])||answers[id]<0||answers[id]>2)throw new Error('invalid_answers');
   original[id]=order[answers[id]];
 }
 const result=gradeTest(selected,original);
 return {...result,review:result.review.map(r=>{
   const order=orders[r.id]||[0,1,2];
   return {...r,submitted:answers[r.id],correct_index:order.indexOf(r.correct_index)};
 })};
}
