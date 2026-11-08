// A single, pure F2 progression policy. The API always enforces this on the
// server; frontend state is presentation only.
export const ROLES = Object.freeze(['admin', 'author', 'tutor', 'student']);
export const canAuthor = role => role === 'admin' || role === 'author';
export const canManageAccounts = role => role === 'admin';
export const canReview = role => role === 'admin' || role === 'tutor';
export const canReadEnrolled = (role, owner) => canAuthor(role) || (role === 'tutor' && owner === 'assigned') || role === 'student';

export function isUnitComplete(unit, progress) {
  return Boolean(progress?.completed_at &&
    (!unit.requires_test || progress.test_passed_at) &&
    (!unit.requires_practice || progress.practice_approved_at));
}

// Called only with ordered units and server-owned progress; do not accept a
// client-provided "previous completed" flag.
export function gateUnit({unit, units, progressByUnit, enrollment, newUnitsToday = 0, now = new Date(), maxPerDay = null}) {
  if (!enrollment || enrollment.status !== 'active') return {open:false, reason:'No tienes una matrícula activa en este curso.'};
  if (new Date(enrollment.deadline).getTime() < now.getTime()) return {open:false,reason:'El plazo de acceso al curso ha finalizado.'};
  const position=units.findIndex(x=>x.id===unit.id);
  if (position === -1) return {open:false,reason:'La unidad no pertenece a este curso.'};
  for(let i=0;i<position;i++) if(!isUnitComplete(units[i],progressByUnit.get(units[i].id))) {
    return {open:false,reason:'Debes completar las unidades anteriores, incluidos los tests y las prácticas obligatorias.'};
  }
  const existing=progressByUnit.get(unit.id);
  const limit=Number(maxPerDay);
  if(!existing && Number.isInteger(limit) && limit>0 && newUnitsToday>=limit) {
    return {open:false,reason:'Has alcanzado el máximo de unidades nuevas permitidas hoy. Podrás continuar mañana.'};
  }
  return {open:true,reason:null,completed:isUnitComplete(unit,existing)};
}
export function canFinishUnit(unit,progress) {
  if(unit.requires_test&&!progress?.test_passed_at)return {ok:false,reason:'Para completar esta unidad falta superar el test.'};
  if(unit.requires_practice&&!progress?.practice_approved_at)return {ok:false,reason:'Para completar esta unidad falta la evaluación de la práctica obligatoria.'};
  return {ok:true,reason:null};
}
