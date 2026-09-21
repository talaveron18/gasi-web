import React,{useCallback,useEffect,useMemo,useState}from'react';
import{Link,Navigate}from'react-router-dom';
import{AlertTriangle,RefreshCw,Save}from'lucide-react';
import{useInternalPrototypeAuth}from'@/contexts/InternalPrototypeAuthContext';
import{createInternalClinicalApi}from'@/lib/internalClinicalApi';

const EMPTY={tenantId:'',center:'',channelType:'PHONE',label:'',target:'',active:true};

export default function InternalContingencyAdmin(){
 const{session,token,isMaster}=useInternalPrototypeAuth();
 const api=useMemo(()=>token?createInternalClinicalApi({token}):null,[token]);
 const[items,setItems]=useState([]),[form,setForm]=useState(EMPTY),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const load=useCallback(async()=>{if(!api)return;setBusy(true);setError('');try{setItems(await api.listContingencyInventory());}catch(e){setError(e.code||'contingency_inventory_unavailable');}finally{setBusy(false);}},[api]);
 useEffect(()=>{load();},[load]);
 if(!session||!token)return null;
 if(!isMaster)return <Navigate to="/interno/clinica" replace/>;
 const save=async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{await api.upsertContingencyChannel(form);setMessage('Canal alternativo guardado y trazado.');setForm(EMPTY);await load();}catch(err){setError(err.code||'contingency_save_failed');}finally{setBusy(false);}};
 return <main className="min-h-screen bg-slate-950 py-10 text-slate-100"><div className="mx-auto max-w-5xl px-4">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-amber-300">GASI · Continuidad técnica</p><h1 className="mt-1 text-3xl font-bold">Canales de contingencia</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Configuración operativa por cliente y centro. No almacena ni transmite narrativa clínica.</p></div><Link to="/interno/clinica" className="rounded-lg border border-slate-700 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Volver</Link></header>
  <section className="mt-7 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold">Configurar canal</h2><form onSubmit={save} aria-busy={busy} className="mt-4 grid gap-4 md:grid-cols-2">
   <label className="text-sm">Cliente / tenant<input required maxLength={80} value={form.tenantId} onChange={e=>setForm({...form,tenantId:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
   <label className="text-sm">Centro<input required maxLength={160} value={form.center} onChange={e=>setForm({...form,center:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
   <label className="text-sm">Tipo<select value={form.channelType} onChange={e=>setForm({...form,channelType:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"><option value="PHONE">Teléfono</option><option value="URL">URL HTTPS</option><option value="REFERENCE">Referencia operativa</option></select></label>
   <label className="text-sm">Etiqueta<input required maxLength={160} value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Ej. Facultativo de respaldo" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
   <label className="text-sm md:col-span-2">Destino<input required maxLength={500} value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder={form.channelType==='PHONE'?'+34 ...':form.channelType==='URL'?'https://...':'Referencia / instrucción operativa'} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"/></label>
   <label className="flex items-center gap-3 text-sm md:col-span-2"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Canal activo</label>
   <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50 md:col-span-2"><Save className="h-4 w-4"/>{busy?'Guardando…':'Guardar canal trazable'}</button>
  </form>{message&&<p role="status" aria-live="polite" className="mt-4 text-sm text-emerald-300">{message}</p>}{error&&<p role="alert" className="mt-4 text-sm text-red-300">Operación bloqueada. Código: {error}</p>}</section>
  <section className="mt-7"><div className="flex items-center justify-between"><h2 className="font-bold">Configuración actual</h2><button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className="h-4 w-4"/>Actualizar</button></div>
   <div className="mt-3 space-y-3">{items.map(item=><article key={`${item.tenant_id}:${item.center}`} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs uppercase text-slate-500">{item.tenant_id} · {item.center}</p><p className="mt-1 font-semibold">{item.label}</p><p className="mt-1 text-sm text-slate-400">{item.channel_type} · {item.target}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.active?'bg-emerald-400/15 text-emerald-200':'bg-slate-700 text-slate-300'}`}>{item.active?'ACTIVO':'INACTIVO'}</span></div><p className="mt-2 text-xs text-slate-500">Actualizado: {item.updated_at||'—'} · {item.updated_by_id||'—'}</p></article>)}{!items.length&&!busy&&<p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4"/>No hay canales alternativos configurados.</p>}</div>
  </section>
 </div></main>;
}
