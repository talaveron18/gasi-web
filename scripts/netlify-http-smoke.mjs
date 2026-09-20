import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port=8899;
const origin=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const child=spawn("npx",[
  "-y","netlify-cli@27.8.0","dev",
  "--offline",
  "--framework","#static",
  "--dir","frontend/build",
  "--port",String(port),
  "--no-open",
  "--skip-gitignore"
],{
  cwd:process.cwd(),
  env:{...process.env,BROWSER:"none"},
  stdio:["ignore","pipe","pipe"],
  detached:process.platform!=="win32"
});

let stdout="",stderr="";
child.stdout.on("data",d=>{stdout+=d.toString();});
child.stderr.on("data",d=>{stderr+=d.toString();});

async function waitReady(){
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
    if(child.exitCode!==null)throw new Error(`netlify_dev_exited:${child.exitCode}\n${stdout}\n${stderr}`);
    try{
      const response=await fetch(`${origin}/acceso`,{redirect:"manual"});
      if(response.status===200)return response;
    }catch{}
    await sleep(200);
  }
  throw new Error(`netlify_dev_timeout\n${stdout}\n${stderr}`);
}

try{
  const response=await waitReady();
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-content-type-options"),"nosniff");
  assert.equal(response.headers.get("referrer-policy"),"no-referrer");
  assert.equal(response.headers.get("x-frame-options"),"DENY");
  assert.equal(response.headers.get("permissions-policy"),"camera=(), microphone=(), geolocation=()");
  const shellCacheControl=response.headers.get("cache-control")||"";
  const shellRevalidates=/\bno-cache\b/i.test(shellCacheControl)||/\bmax-age=0\b/i.test(shellCacheControl);
  assert.equal(shellRevalidates,true,"SPA shell must be immediately stale/revalidated");
  assert.doesNotMatch(shellCacheControl,/immutable|s-maxage\s*=\s*[1-9]/i,"SPA shell must not be immutable or shared-cache pinned");

  const body=await response.text();
  assert.match(body,/<!doctype html>/i);

  const evidence={
    status:"PASS",
    scope:"Netlify Dev HTTP smoke over production build; no deploy",
    request:"GET /acceso",
    observed:{
      status:response.status,
      x_content_type_options:response.headers.get("x-content-type-options"),
      referrer_policy:response.headers.get("referrer-policy"),
      x_frame_options:response.headers.get("x-frame-options"),
      permissions_policy:response.headers.get("permissions-policy"),
      cache_control:response.headers.get("cache-control"),
      shell_revalidation_semantics:"no-cache OR max-age=0; immutable forbidden"
    }
  };
  console.log(JSON.stringify(evidence));
}finally{
  const killTree=signal=>{
    try{
      if(process.platform==="win32")child.kill(signal);
      else process.kill(-child.pid,signal);
    }catch{}
  };
  killTree("SIGTERM");
  await Promise.race([
    new Promise(resolve=>child.once("exit",resolve)),
    sleep(2000)
  ]);
  if(child.exitCode===null){
    killTree("SIGKILL");
    await Promise.race([
      new Promise(resolve=>child.once("exit",resolve)),
      sleep(1000)
    ]);
  }
}
