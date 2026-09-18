export default async()=>new Response(JSON.stringify({ok:true,runtime:"netlify-function"}),{status:200,headers:{"content-type":"application/json","cache-control":"no-store"}});
export const config={path:"/api/_diag/ping"};
