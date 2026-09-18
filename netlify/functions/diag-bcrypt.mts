import bcrypt from "bcryptjs";
export default async()=>{try{const hash=await bcrypt.hash("diagnostic-password",4);return new Response(JSON.stringify({ok:true,bcrypt:typeof bcrypt.compare==="function",hash_prefix:hash.slice(0,4)}),{status:200,headers:{"content-type":"application/json","cache-control":"no-store"}});}catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:{"content-type":"application/json","cache-control":"no-store"}});}};
export const config={path:"/api/_diag/bcrypt"};
