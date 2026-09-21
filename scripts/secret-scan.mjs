import fs from "node:fs";
import { execFileSync } from "node:child_process";

const patterns=[
  ["private_key",/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g],
  ["aws_access_key",/\bAKIA[0-9A-Z]{16}\b/g],
  ["github_token",/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ["stripe_live_key",/\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
  ["stripe_webhook_secret",/\bwhsec_[A-Za-z0-9]{20,}\b/g],
  ["google_api_key",/\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["slack_token",/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ["remote_database_password",/\bpostgres(?:ql)?:\/\/[^:\s/]+:[^@\s/]+@(?!(?:127\.0\.0\.1|localhost)(?::|\/))[^\s"'<>]+/gi]
];

const files=execFileSync("git",["ls-files","-z"],{encoding:"utf8"})
  .split("\0")
  .filter(Boolean)
  .filter(file=>!file.endsWith("package-lock.json")&&!file.endsWith("yarn.lock"));

const findings=[];
for(const file of files){
  let stat;
  try{stat=fs.statSync(file);}catch{continue;}
  if(!stat.isFile()||stat.size>2*1024*1024)continue;
  let text;
  try{text=fs.readFileSync(file,"utf8");}catch{continue;}
  if(text.includes("\u0000"))continue;
  for(const [name,re] of patterns){
    re.lastIndex=0;
    for(const match of text.matchAll(re)){
      const before=text.slice(0,match.index).split("\n").length;
      findings.push({file,line:before,kind:name});
    }
  }
}

if(findings.length){
  console.error("Potential committed secrets detected:");
  for(const finding of findings)console.error(`- ${finding.file}:${finding.line} [${finding.kind}]`);
  process.exit(1);
}
console.log(`Secret scan PASS: ${files.length} tracked files checked with high-confidence patterns.`);
