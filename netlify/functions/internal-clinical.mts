import type { Config, Context } from "@netlify/functions";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});

export default async (_req:Request,_context:Context)=>json({ok:true,diagnostic:"database-provision-isolation"});

export const config:Config={path:"/api/internal-clinical/*"};
