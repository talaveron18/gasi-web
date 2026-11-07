import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';

const Context=createContext(null);
export const AULA_ENABLED=process.env.REACT_APP_AULA_ENABLED==='true';
const ROOT='/api/aula';
export async function aulaRequest(path,options={}){
  const response=await fetch(ROOT+path,{
    credentials:'same-origin',cache:'no-store',method:options.method||'GET',
    headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},
    body:options.body?JSON.stringify(options.body):undefined
  });
  if(!String(response.headers.get('content-type')||'').includes('application/json'))
    throw new Error('El servidor del aula no ha devuelto una respuesta válida.');
  const data=await response.json().catch(()=>({detail:'invalid_json_response'}));
  if(!response.ok){const error=new Error(data.reason||data.detail||'No se ha podido completar la operación.');error.status=response.status;error.detail=data.detail;throw error;}
  return data;
}
const validUser=(u)=>Boolean(u&&typeof u==='object'&&typeof u.user_id==='string'&&typeof u.email==='string'&&
  ['admin','author','tutor','student'].includes(u.role)&&typeof u.name==='string');
export function AulaProvider({children}){
  const[user,setUser]=useState(null),[loading,setLoading]=useState(AULA_ENABLED);
  const refresh=useCallback(async()=>{
    if(!AULA_ENABLED){setUser(null);setLoading(false);return;}
    try{const data=await aulaRequest('/auth/me');setUser(validUser(data.user)?data.user:null);}catch{setUser(null);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  const login=async(email,password)=>{
    try{const data=await aulaRequest('/auth/login',{method:'POST',body:{email,password}});
      if(!validUser(data.user))throw new Error('Sesión inválida.');
      setUser(data.user);return {ok:true};}catch(error){return{ok:false,error:error.status===429?'Demasiados intentos. Vuelve a intentarlo más tarde.':'No se ha podido iniciar sesión. Revisa tus credenciales.'};}
  };
  const logout=async()=>{try{await aulaRequest('/auth/logout',{method:'POST',body:{}});}finally{setUser(null);}};
  const changePassword=async(current_password,new_password)=>{
    try{await aulaRequest('/auth/password',{method:'POST',body:{current_password,new_password}});setUser(null);return{ok:true};}
    catch(error){return{ok:false,error:error.message};}
  };
  return <Context.Provider value={{user,loading,refresh,login,logout,changePassword,request:aulaRequest}}>{children}</Context.Provider>;
}
export function useAula(){const value=useContext(Context);if(!value)throw new Error('AulaProvider required');return value;}
