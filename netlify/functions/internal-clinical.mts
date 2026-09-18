import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const bearer=(req:Request)=>{const value=req.headers.get("authorization")||"";return value.startsWith("Bearer ")?value.slice(7):"";};

export default async (req:Request,_context:Context)=>{
  const token=bearer(req);
  if(!token)return json({detail:"missing_session"},401);
  const db=getDatabase();
  const url=new URL(req.url);
  if(req.method==="GET"&&url.pathname==="/api/internal-clinical/health"){
    const rows=await db.sql`SELECT 1 AS ok`;
    return json({ok:rows[0]?.ok===1,storage:"netlify-database"});
  }
  return json({detail:"netlify_clinical_route_not_migrated"},501);
};

export const config:Config={path:"/api/internal-clinical/*"};
