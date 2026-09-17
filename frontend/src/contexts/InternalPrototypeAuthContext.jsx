import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { interpretSessionAuthority } from '@/lib/internalSessionAuthority';

const InternalPrototypeAuthContext = createContext(null);
const INITIAL_IDENTITIES = [
  { id:'USR-DEMO-NURSE-01',displayName:'Enfermera Demo 01',role:'nurse',roleLabel:'Enfermería',centers:['Centro ficticio Madrid 01'],status:'ACTIVE',operationalStatus:'DEMO_READY' },
  { id:'USR-DEMO-PHYS-01',displayName:'Dr. Demo 01',role:'physician',roleLabel:'Facultativo',centers:['Centro ficticio Madrid 01'],status:'ACTIVE',operationalStatus:'DEMO_READY' },
  { id:'USR-DEMO-PSY-01',displayName:'Psicóloga Demo 01',role:'psychologist',roleLabel:'Psicología',centers:['Centro ficticio Madrid 01'],status:'ACTIVE',operationalStatus:'DEMO_READY' },
  { id:'USR-DEMO-PHYSIO-01',displayName:'Fisioterapeuta Demo 01',role:'physiotherapist',roleLabel:'Fisioterapia',centers:['Centro ficticio Madrid 01'],status:'ACTIVE',operationalStatus:'DEMO_READY' },
  { id:'USR-DEMO-ADMIN-01',displayName:'Coordinación Demo 01',role:'admin',roleLabel:'Administración / Coordinación',centers:[],status:'ACTIVE',operationalStatus:'DEMO_READY' },
];
const ROLE_LABELS={nurse:'Enfermería',physician:'Facultativo',psychologist:'Psicología',physiotherapist:'Fisioterapia',admin:'Administración / Coordinación'};
const timestamp=()=>new Date().toISOString();
const centralEnabled=()=>process.env.REACT_APP_INTERNAL_SYNTHETIC_API==='true';
const baseUrl=()=>String(process.env.REACT_APP_BACKEND_URL||'').replace(/\/$/,'');
const mapWorker=(w)=>({id:w.id,displayName:w.display_name,role:w.role,roleLabel:ROLE_LABELS[w.role]||w.role,centers:w.centers||[],status:w.active===false?'REVOKED':'ACTIVE',operationalStatus:'DEMO_BACKEND_CONFIRMED'});

export function InternalPrototypeAuthProvider({children}){
 const [identities,setIdentities]=useState(INITIAL_IDENTITIES); const [session,setSession]=useState(null); const [lastError,setLastError]=useState(''); const [sessionChecking,setSessionChecking]=useState(false); const [directoryLoading,setDirectoryLoading]=useState(false);
 const [accessAudit,setAccessAudit]=useState([{id:'AUD-DEMO-BOOT',at:'2026-09-12T12:00:00.000Z',actorId:'SYSTEM-DEMO',actor:'Sistema sintético',action:'PROTOTYPE_INITIALIZED',targetId:null,detail:'Registro sintético inicial. Sin datos reales.'}]);
 const appendAudit=useCallback((entry)=>setAccessAudit(c=>[...c,{id:`AUD-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,at:timestamp(),...entry}]),[]);

 const refreshDirectory=useCallback(async(actor=session)=>{
   if(!centralEnabled()) return {ok:true};
   if(!actor||actor.role!=='admin') return {ok:false,error:'Administración requerida para sincronizar el directorio.'};
   const root=baseUrl(); if(!root) return {ok:false,error:'Backend sintético no configurado.'};
   setDirectoryLoading(true);
   try{const r=await fetch(`${root}/api/internal-prototype/workers`,{headers:{'X-Demo-Actor-Id':actor.id},cache:'no-store'}); if(!r.ok) return {ok:false,error:`No se pudo sincronizar el directorio (HTTP ${r.status}).`}; const rows=await r.json(); if(!Array.isArray(rows)) return {ok:false,error:'Respuesta de directorio inválida.'}; setIdentities(rows.map(mapWorker)); return {ok:true};}
   catch{return {ok:false,error:'Backend no disponible; se conserva el último directorio confirmado.'};} finally{setDirectoryLoading(false);}
 },[session]);

 const validateSession=useCallback(async(candidate)=>{if(!candidate)return false;if(!centralEnabled())return candidate.status==='ACTIVE';const root=baseUrl();if(!root){setSession(null);setLastError('Validación central activada sin URL de backend.');return false;}setSessionChecking(true);try{const r=await fetch(`${root}/api/internal-prototype/session`,{headers:{'X-Demo-Actor-Id':candidate.id},cache:'no-store'});let a=null;if(r.ok)a=await r.json();const o=interpretSessionAuthority({candidate,httpStatus:r.status,authoritative:a});if(!o.ok){setSession(null);setLastError(o.message);return false;}setLastError('');return true;}catch{setSession(null);setLastError('Backend de identidad no disponible.');return false;}finally{setSessionChecking(false);}},[]);
 const signInSynthetic=async(id)=>{const identity=identities.find(x=>x.id===id);if(!identity||identity.status!=='ACTIVE'){setLastError('Identidad no disponible o revocada.');return false;}const next={...identity,signedInAt:timestamp(),prototypeOnly:true};if(centralEnabled()&&!(await validateSession(next)))return false;setSession(next);appendAudit({actorId:id,actor:identity.displayName,action:'LOGIN_SUCCESS',targetId:id,detail:`Acceso sintético como ${identity.roleLabel}.`});return true;};
 const signOut=()=>{setSession(null);setLastError('');};

 useEffect(()=>{if(session?.role==='admin'&&centralEnabled()) refreshDirectory(session).then(r=>{if(!r.ok)setLastError(r.error);});},[session?.id,session?.role,refreshDirectory]);

 const addSyntheticIdentity=async({displayName,role,centers})=>{if(session?.role!=='admin')return{ok:false,error:'Acción reservada a Administración / Coordinación.'};const name=String(displayName||'').trim();const cs=Array.isArray(centers)?centers.map(x=>String(x).trim()).filter(Boolean):[];if(!name||!ROLE_LABELS[role])return{ok:false,error:'Nombre y rol son obligatorios.'};if(role!=='admin'&&!cs.length)return{ok:false,error:'Los perfiles clínicos requieren centro.'};if(role==='admin'&&cs.length)return{ok:false,error:'Administración no recibe ámbito clínico.'};const id=`USR-DEMO-${role.toUpperCase()}-${Date.now()}`;let identity={id,displayName:name,role,roleLabel:ROLE_LABELS[role],centers:cs,status:'ACTIVE',operationalStatus:'DEMO_PENDING_VALIDATION'};if(centralEnabled()){const root=baseUrl();if(!root)return{ok:false,error:'Backend no configurado.'};try{const r=await fetch(`${root}/api/internal-prototype/workers`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Actor-Id':session.id},body:JSON.stringify({id,display_name:name,role,centers:cs})});if(!r.ok)return{ok:false,error:`Backend rechazó el alta (HTTP ${r.status}).`};identity=mapWorker(await r.json());const synced=await refreshDirectory(session);if(!synced.ok)return{ok:false,error:synced.error};}catch{return{ok:false,error:'No se pudo confirmar el alta con backend.'};}}else setIdentities(c=>[...c,identity]);appendAudit({actorId:session.id,actor:session.displayName,action:'IDENTITY_CREATED',targetId:identity.id,detail:`Alta sintética ${identity.roleLabel}.`});return{ok:true,identity};};
 const setIdentityStatus=async(id,status)=>{if(session?.role!=='admin')return{ok:false,error:'Administración requerida.'};const target=identities.find(x=>x.id===id);if(!target)return{ok:false,error:'Identidad no encontrada.'};if(id===session.id&&status==='REVOKED')return{ok:false,error:'No se permite autorrevocación.'};if(centralEnabled()){try{const r=await fetch(`${baseUrl()}/api/internal-prototype/workers/${encodeURIComponent(id)}/access`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Actor-Id':session.id},body:JSON.stringify({state:status})});if(!r.ok)return{ok:false,error:`Backend rechazó el cambio (HTTP ${r.status}).`};const synced=await refreshDirectory(session);if(!synced.ok)return{ok:false,error:synced.error};}catch{return{ok:false,error:'No se pudo confirmar el cambio con backend.'};}}else setIdentities(c=>c.map(x=>x.id===id?{...x,status}:x));appendAudit({actorId:session.id,actor:session.displayName,action:status==='ACTIVE'?'IDENTITY_REACTIVATED':'IDENTITY_REVOKED',targetId:id,detail:`${target.displayName} → ${status}.`});return{ok:true};};
 const value={session,identities,accessAudit,lastError,sessionChecking,directoryLoading,signInSynthetic,signOut,validateSession,refreshDirectory,addSyntheticIdentity,setIdentityStatus,isAuthenticated:Boolean(session),centralValidationEnabled:centralEnabled()};return <InternalPrototypeAuthContext.Provider value={value}>{children}</InternalPrototypeAuthContext.Provider>;
}
export function useInternalPrototypeAuth(){const v=useContext(InternalPrototypeAuthContext);if(!v)throw new Error('useInternalPrototypeAuth must be used inside InternalPrototypeAuthProvider');return v;}
