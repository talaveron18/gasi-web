import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const root=process.cwd();
const required=[
  "frontend/yarn.lock",
  "package-lock.json",
  "netlify/package-lock.json",
  "netlify.toml",
  "frontend/build/index.html",
  "frontend/build/asset-manifest.json",
];

const sha256File=file=>{
  const h=crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
};

const walk=dir=>{
  const out=[];
  for(const name of fs.readdirSync(dir).sort()){
    const full=path.join(dir,name);
    const stat=fs.statSync(full);
    if(stat.isDirectory()) out.push(...walk(full));
    else if(stat.isFile()) out.push(full);
  }
  return out;
};

const treeDigest=(dir)=>{
  const files=walk(dir);
  const h=crypto.createHash("sha256");
  const entries=files.map(file=>{
    const relative=path.relative(dir,file).replaceAll(path.sep,"/");
    const digest=sha256File(file);
    h.update(relative); h.update("\0"); h.update(digest); h.update("\n");
    return {path:relative,sha256:digest,size:fs.statSync(file).size};
  });
  return {sha256:h.digest("hex"),files:entries};
};

for(const rel of required){
  const full=path.join(root,rel);
  if(!fs.existsSync(full)) throw new Error(`release_input_missing:${rel}`);
}

const manifestPath=path.join(root,"frontend/build/asset-manifest.json");
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
for(const rel of Object.values(manifest.files||{})){
  const normalized=String(rel).replace(/^\//,"");
  const full=path.join(root,"frontend/build",normalized);
  if(!fs.existsSync(full)) throw new Error(`asset_manifest_target_missing:${normalized}`);
}

const buildDir=path.join(root,"frontend/build");
const buildFiles=walk(buildDir);
const sourceMaps=buildFiles.filter(file=>file.endsWith(".map"));
if(sourceMaps.length) throw new Error(`public_source_maps_present:${sourceMaps.map(file=>path.relative(buildDir,file)).join(",")}`);

const forbiddenBuildPatterns=[
  /GASI_INTERNAL_SESSION_SECRET/i,
  /GASI_RECOVERY_SIGNING_SECRET/i,
  /GASI_MASTER_PASSWORD_HASH/i,
  /GASI_MASTER_PASSWORD/i,
  /postgresql:\/\//i,
  /BEGIN PRIVATE KEY/i,
];
let forbiddenHits=0;
for(const file of buildFiles){
  if(!/\.(?:js|css|html|json|txt)$/i.test(file))continue;
  const body=fs.readFileSync(file,"utf8");
  for(const pattern of forbiddenBuildPatterns){
    if(pattern.test(body)){
      forbiddenHits++;
      throw new Error(`forbidden_backend_secret_marker_in_public_build:${path.relative(buildDir,file)}:${pattern}`);
    }
  }
}
const original=treeDigest(buildDir);
const restoreRoot=fs.mkdtempSync(path.join(os.tmpdir(),"gasi-release-restore-"));
const restoredDir=path.join(restoreRoot,"build");
try{
  fs.cpSync(buildDir,restoredDir,{recursive:true,preserveTimestamps:true});
  const restored=treeDigest(restoredDir);
  if(restored.sha256!==original.sha256) throw new Error("release_restore_digest_mismatch");

  const inputHashes=Object.fromEntries(required.slice(0,4).map(rel=>[rel,sha256File(path.join(root,rel))]));
  const evidence={
    status:"PASS",
    scope:"WEB_INFRA GASI V1 release rehearsal only; no production deployment",
    commit_sha:process.env.GITHUB_SHA||"unknown",
    workflow_run_id:process.env.GITHUB_RUN_ID||"unknown",
    environment:{node:process.version,platform:process.platform,arch:process.arch},
    expected:{
      lockfiles_present:true,
      netlify_production_build_present:true,
      asset_manifest_resolves:true,
      restored_artifact_digest_matches:true,
      public_source_maps_absent:true,
      backend_secret_markers_absent:true,
    },
    observed:{
      input_sha256:inputHashes,
      build_tree_sha256:original.sha256,
      restored_tree_sha256:restored.sha256,
      build_file_count:original.files.length,
      build_bytes:original.files.reduce((n,x)=>n+x.size,0),
      source_map_count:sourceMaps.length,
      forbidden_backend_secret_marker_hits:forbiddenHits,
    },
    result:"release artifact copied to isolated restore directory and re-hashed successfully",
    production_deploy:false,
  };
  fs.writeFileSync(path.join(root,"release-evidence.json"),JSON.stringify(evidence,null,2)+"\n");
  console.log(JSON.stringify(evidence));
} finally {
  fs.rmSync(restoreRoot,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
