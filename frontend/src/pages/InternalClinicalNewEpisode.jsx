import React,{useEffect,useMemo,useState}from'react';
import{Link,Navigate}from'react-router-dom';
import{Search,UserPlus,X}from'lucide-react';
import{useInternalPrototypeAuth}from'@/contexts/InternalPrototypeAuthContext';
import{createInternalClinicalApi}from'@/lib/internalClinicalApi';
import{createAuthoritativeClinicalEpisode}from'@/lib/internalClinicalActions';

const EMPTY_FORM={center:'',level:2,summary:'',givenName:'',familyName:'',secondFamilyName:'',birthDate:'',ageYears:'',dni:'',employeeNumber:''};
const CREATOR_ROLES=['nurse','psychologist','physiotherapist'];
const ROLE_COPY={nurse:{title:'Abrir caso clínico',label:'Enfermería',level:true},psychologist:{title:'Abrir consulta de Psicología',label:'Psicología',level:false},physiotherapist:{title:'Abrir consulta de Fisioterapia',label:'Fisioterapia',level:false}};
const fullName=p=>[p&&p.givenName||p&&p.given_name,p&&p.familyName||p&&p.family_name,p&&p.secondFamilyName||p&&p.second_family_name].filter(Boolean).join(' ');
const recordNo=p=>p&&p.medicalRecordNumber||p&&p.medical_record_number||'—';
const employeeNo=p=>p&&p.employeeNumber||p&&p.employee_number||'';
const patientBirth=p=>p&&p.birthDate||p&&p.birth_date||'';
const patientAge=p=>p&&p.ageYears!=null?p.ageYears:p&&p.age_years!=null?p.age_years:null;
const normalizeCandidate=p=>p?Object.assign({},p,{medicalRecordNumber:p.medicalRecordNumber||p.medical_record_number,givenName:p.givenName||p.given_name,familyName:p.familyName||p.family_name,secondFamilyName:p.secondFamilyName||p.second_family_name||'',birthDate:p.birthDate||p.birth_date||null,ageYears:p.ageYears!=null?p.ageYears:p.age_years,employeeNumber:p.employeeNumber||p.employee_number||''}):p;

function PatientCard({patient,onSelect,selected=false}){
 const details=[recordNo(patient),patient&&patient.dni?'DNI '+patient.dni:'',employeeNo(patient)?'Empleado '+employeeNo(patient):'',patientBirth(patient)?'Nac. '+patientBirth(patient):patientAge(patient)!=null?patientAge(patient)+' años':''].filter(Boolean);
 return <button type="button" onClick={()=>onSelect&&onSelect(patient)} className={'w-full text-left rounded-lg border p-3 transition '+(selected?'border-cyan-300 bg-cyan-400/10':'border-slate-700 bg-slate-950 hover:border-cyan-500')}><div className="font-semibold">{fullName(patient)||'Sin nombre visible'}</div><div className="mt-1 text-xs text-slate-400">{details.join(' · ')}</div>{Number(patient&&patient.episodeCount||patient&&patient.episode_count||0)>0&&<div className="mt-1 text-xs text-slate-500">{Number(patient.episodeCount||patient.episode_count)} episodio(s) previos</div>}</button>;
}

export default function InternalClinicalNewEpisode(){
 const{session,token}=useInternalPrototypeAuth();
 const api=useMemo(()=>token?createInternalClinicalApi({token}):null,[token]);
 const[form,setForm]=useState(()=>Object.assign({},EMPTY_FORM,{center:Array.isArray(session&&session.centers)?session.centers[0]||'':''}));
 const[state,setState]=useState('IDLE');
 const[errorCode,setErrorCode]=useState(null);
 const[createdEpisode,setCreatedEpisode]=useState(null);
 const[searchTerm,setSearchTerm]=useState('');
 const[searchResults,setSearchResults]=useState([]);
 const[searchState,setSearchState]=useState('IDLE');
 const[selectedPatient,setSelectedPatient]=useState(null);
 const[newPatientOpen,setNewPatientOpen]=useState(false);
 const[duplicateCandidate,setDuplicateCandidate]=useState(null);

 useEffect(()=>{if(!api||selectedPatient||searchTerm.trim().length<2){setSearchResults([]);setSearchState('IDLE');return;}let alive=true;const timer=setTimeout(async()=>{setSearchState('SEARCHING');try{const rows=await api.searchPatients(searchTerm.trim());if(alive){setSearchResults(rows);setSearchState('READY');}}catch(_){if(alive){setSearchResults([]);setSearchState('ERROR');}}},250);return()=>{alive=false;clearTimeout(timer);};},[api,searchTerm,selectedPatient]);

 if(!session)return null;
 if(!CREATOR_ROLES.includes(session.role))return <Navigate to="/interno/clinica" replace/>;

 const centers=Array.isArray(session.centers)?session.centers:[];
 const roleCopy=ROLE_COPY[session.role];
 const update=(key,value)=>{setForm(current=>Object.assign({},current,{[key]:value}));setState('IDLE');setErrorCode(null);setDuplicateCandidate(null);};
 const choosePatient=patient=>{const normalized=normalizeCandidate(patient);setSelectedPatient(normalized);setSearchTerm(fullName(normalized));setSearchResults([]);setSearchState('IDLE');setNewPatientOpen(false);setDuplicateCandidate(null);setState('IDLE');setErrorCode(null);};
 const clearPatient=()=>{setSelectedPatient(null);setSearchTerm('');setSearchResults([]);setNewPatientOpen(false);setDuplicateCandidate(null);};
 const startNew=()=>{setSelectedPatient(null);setNewPatientOpen(true);setDuplicateCandidate(null);setForm(current=>Object.assign({},current,{givenName:'',familyName:'',secondFamilyName:'',birthDate:'',ageYears:'',dni:'',employeeNumber:''}));};
 const patientPayload=selectedPatient?null:{given_name:form.givenName,family_name:form.familyName,second_family_name:form.secondFamilyName,birth_date:form.birthDate||null,age_years:form.ageYears===''?null:Number(form.ageYears),dni:form.dni,employee_number:form.employeeNumber};

 const submit=async event=>{event.preventDefault();setState('SAVING');setErrorCode(null);setCreatedEpisode(null);setDuplicateCandidate(null);const result=await createAuthoritativeClinicalEpisode({api,session,patientId:selectedPatient&&selectedPatient.id||null,patient:patientPayload,center:form.center,level:roleCopy.level?form.level:2,summary:form.summary});if(!result.ok){setState('ERROR');setErrorCode(result.errorCode);if(result.candidate)setDuplicateCandidate(normalizeCandidate(result.candidate));return;}setCreatedEpisode(result.episode);setState('SAVED');setSelectedPatient(null);setSearchTerm('');setSearchResults([]);setNewPatientOpen(false);setForm(current=>Object.assign({},EMPTY_FORM,{center:current.center}));};

 const patientReady=Boolean(selectedPatient||newPatientOpen);
 const newIdentityReady=Boolean(form.givenName.trim()&&form.familyName.trim()&&(form.birthDate||form.ageYears!==''));

 return <main className="min-h-screen bg-slate-950 text-slate-100 py-10" data-testid="authoritative-new-episode"><div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-cyan-300">GASI · Zona clínica interna</p><h1 className="mt-1 text-3xl font-bold">{roleCopy.title}</h1><p className="mt-2 text-sm text-slate-400">{roleCopy.label} · cada episodio se vincula a una historia clínica única.</p></div><Link to="/interno/clinica" className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Volver a casos</Link></div>
  <form onSubmit={submit} aria-busy={state==='SAVING'} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
   <section aria-labelledby="patient-heading"><h2 id="patient-heading" className="font-semibold">1. Identificar a la persona</h2><p className="mt-1 text-xs text-slate-500">Busca antes de crear una historia nueva. Puedes usar nombre, DNI, número de empleado o número de historia.</p>
    {selectedPatient?<div className="mt-3"><PatientCard patient={selectedPatient} selected/><button type="button" onClick={clearPatient} className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300"><X className="w-4"/>Cambiar persona</button></div>:<>
     <label className="mt-3 block"><span className="sr-only">Buscar paciente existente</span><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500"/><input value={searchTerm} onChange={e=>{setSearchTerm(e.target.value);setNewPatientOpen(false);}} placeholder="Ej. Javier Suárez, DNI, empleado o GASI-HC-…" className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm"/></div></label>
     {searchState==='SEARCHING'&&<p role="status" className="mt-2 text-sm text-slate-400">Buscando coincidencias…</p>}
     {searchState==='ERROR'&&<p role="alert" className="mt-2 text-sm text-red-300">No se pudo consultar el registro. No se creará una historia a ciegas.</p>}
     {searchResults.length>0&&<div className="mt-3 space-y-2" role="listbox" aria-label="Posibles coincidencias">{searchResults.map(p=><PatientCard key={p.id} patient={p} onSelect={choosePatient}/>)}</div>}
     {searchState==='READY'&&searchTerm.trim().length>=2&&searchResults.length===0&&<p className="mt-2 text-sm text-slate-400">No hay coincidencias suficientes.</p>}
     <button type="button" onClick={startNew} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm"><UserPlus className="w-4"/>Registrar nueva persona</button>
    </>}
   </section>
   {newPatientOpen&&<fieldset className="rounded-xl border border-slate-700 p-4"><legend className="px-2 text-sm font-semibold">Nueva historia clínica</legend><div className="grid gap-4 sm:grid-cols-2">
    <label className="block text-sm">Nombre *<input required value={form.givenName} onChange={e=>update('givenName',e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Primer apellido *<input required value={form.familyName} onChange={e=>update('familyName',e.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Segundo apellido<input value={form.secondFamilyName} onChange={e=>update('secondFamilyName',e.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Fecha de nacimiento<input type="date" value={form.birthDate} onChange={e=>update('birthDate',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Edad {form.birthDate?'(opcional)':'*'}<input type="number" min="0" max="130" required={!form.birthDate} value={form.ageYears} onChange={e=>update('ageYears',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">DNI / documento<input value={form.dni} onChange={e=>update('dni',e.target.value)} maxLength={40} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
    <label className="block text-sm">Número de empleado<input value={form.employeeNumber} onChange={e=>update('employeeNumber',e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
   </div><p className="mt-3 text-xs text-slate-500">DNI y número de empleado se usan como identificadores fuertes para impedir duplicados dentro del mismo cliente.</p></fieldset>}
   {duplicateCandidate&&<div role="alert" className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100"><strong>Posible historia ya existente.</strong><p className="mt-1">No se ha creado nada. Revisa esta coincidencia antes de continuar.</p><div className="mt-3"><PatientCard patient={duplicateCandidate} onSelect={choosePatient}/></div></div>}
   <label className="block"><span className="text-sm font-semibold">2. Centro asignado</span><select value={form.center} onChange={e=>update('center',e.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><option value="" disabled>Seleccionar centro</option>{centers.map(center=><option key={center} value={center}>{center}</option>)}</select></label>
   {roleCopy.level&&<fieldset aria-describedby="clinical-level-help"><legend className="text-sm font-semibold">3. Nivel de prioridad/canal</legend><p id="clinical-level-help" className="mt-1 text-xs text-slate-500">La clasificación organiza prioridad y canal; no constituye diagnóstico ni prescripción.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[[1,'N1 · Urgencia'],[2,'N2 · Consulta no aguda'],[3,'N3 · Gestión']].map(([level,label])=><label key={level} className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"><input type="radio" name="level" checked={Number(form.level)===level} onChange={()=>update('level',level)} className="mt-1"/><span>{label}</span></label>)}</div></fieldset>}
   {roleCopy.level&&Number(form.level)===1&&<div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100"><strong>Nivel 1:</strong> realizar llamada telefónica directa al facultativo. La web NO sustituye ni debe retrasar esa llamada.</div>}
   {roleCopy.level&&Number(form.level)===3&&<div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">Gestión/documentación puede diseñarse, pero cualquier indicación médica remota, prescripción o actuación enfermera dependiente de validación jurídica permanece <strong>BLOQUEADA PARA ACTIVACIÓN REAL</strong>.</div>}
   {!roleCopy.level&&<div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4 text-sm text-cyan-100">Consulta propia de {roleCopy.label}. No habilita respuesta facultativa ni modificación de medicación o indicaciones médicas.</div>}
   <label className="block"><span className="text-sm font-semibold">{roleCopy.level?'4.':'3.'} Situación</span><textarea value={form.summary} onChange={e=>update('summary',e.target.value)} required rows={7} maxLength={5000} placeholder="Descripción de la situación clínica." className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm"/></label>
   <button type="submit" disabled={state==='SAVING'||centers.length===0||!patientReady||(!selectedPatient&&!newIdentityReady)} className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">{state==='SAVING'?'Abriendo…':'Abrir '+(session.role==='nurse'?'caso':'consulta')}</button>
   {centers.length===0&&<p role="alert" className="text-sm text-red-300">Esta identidad no tiene centros asignados; la apertura queda bloqueada.</p>}
   {state==='ERROR'&&!duplicateCandidate&&<p role="alert" className="text-sm text-red-300">Apertura bloqueada de forma segura. Código: {errorCode}.</p>}
   {state==='SAVED'&&createdEpisode&&<div role="status" aria-live="polite" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">Episodio <strong>{createdEpisode.id}</strong> vinculado a historia <strong>{createdEpisode.patient&&createdEpisode.patient.medicalRecordNumber||createdEpisode.patientRef||'—'}</strong>.<div className="mt-3 flex flex-wrap gap-4"><Link to={'/interno/clinica/caso/'+encodeURIComponent(createdEpisode.id)} className="font-semibold underline">Abrir este episodio</Link><Link to="/interno/clinica" className="underline">Volver al listado</Link></div></div>}
  </form>
 </div></main>;
}
