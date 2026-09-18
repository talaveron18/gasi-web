import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { auditMetadata, canonical, canRead, canWrite, has, publicEpisode, validRecoverySnapshot } from "./internal-clinical.mts";

process.env.GASI_MASTER_ACTOR_ID="GASI-MASTER-01";

const genesis="0".repeat(64);
const makeSnapshot=()=>{
  const at="2026-09-18T18:00:00.000Z";
  const payload={at,actor_id:"GASI-MASTER-01",actor_role:"admin",action:"LOGIN_SUCCESS",episode_id:null,metadata:{}};
  const event_hash=crypto.createHash("sha256").update(genesis+":"+canonical(payload)).digest("hex");
  return {
    schema_version:1,
    workers:[
      {id:"GASI-MASTER-01",role:"admin",display_name:"Fernando",centers:[],active:true,auth_version:1,delegated_privileges:[],password_hash:"$2b$12$placeholder",created_at:at},
      {id:"GASI-NURSE-01",role:"nurse",display_name:"Enfermería A",centers:["CENTER-A"],active:true,auth_version:1,delegated_privileges:[],password_hash:"$2b$12$placeholder",created_at:at}
    ],
    episodes:[
      {id:"GASI-EP-00000001",center:"CENTER-A",patient_ref:"PAT-001",discipline:"nursing",level:1,status:"OPEN",document:{summary:"x"},created_at:at}
    ],
    audit:[
      {seq:1,at,actor_id:"GASI-MASTER-01",actor_role:"admin",action:"LOGIN_SUCCESS",episode_id:null,metadata:{},previous_hash:genesis,event_hash}
    ],
    counters:[{name:"episode",value:1}]
  };
};

test("cross-tenant clinical access is denied",()=>{
  const nurse={id:"N1",role:"nurse",centers:["CENTER-A"],delegated_privileges:[]};
  assert.equal(canRead(nurse,{center:"CENTER-A",discipline:"nursing"}),true);
  assert.equal(canWrite(nurse,{center:"CENTER-A",discipline:"nursing"}),true);
  assert.equal(canRead(nurse,{center:"CENTER-B",discipline:"nursing"}),false);
  assert.equal(canWrite(nurse,{center:"CENTER-B",discipline:"nursing"}),false);
});

test("administration sees metadata but cannot write clinical content",()=>{
  const admin={id:"A1",role:"admin",centers:[],delegated_privileges:[]};
  const episode={id:"E1",center:"CENTER-A",patient_ref:"PAT-1",discipline:"nursing",level:2,status:"OPEN",created_at:"2026-09-18T18:00:00.000Z",document:{summary:"clinical"}};
  assert.equal(canRead(admin,episode),true);
  assert.equal(canWrite(admin,episode),false);
  const visible=publicEpisode(episode,true);
  assert.equal("patient_ref" in visible,false);
  assert.equal("summary" in visible,false);
});

test("combined professional/admin privilege never bypasses clinical guards",()=>{
  const combined={id:"N2",role:"nurse",centers:["CENTER-A"],delegated_privileges:["worker_access_management"]};
  assert.equal(has(combined,"worker_access_management"),true);
  assert.equal(canWrite(combined,{center:"CENTER-B",discipline:"nursing"}),false);
  assert.equal(canWrite(combined,{center:"CENTER-A",discipline:"psychology"}),false);
  assert.equal(canWrite(combined,{center:"CENTER-A",discipline:"nursing"}),true);
});

test("master privileges are intrinsic",()=>{
  const master={id:"GASI-MASTER-01",role:"admin",centers:[],delegated_privileges:[]};
  assert.equal(has(master,"clinical_privileged_read"),true);
  assert.equal(has(master,"worker_access_management"),true);
});

test("audit metadata rejects clinical text and nested structures",()=>{
  assert.throws(()=>auditMetadata({text:"clinical"}),/audit_metadata_forbidden/);
  assert.throws(()=>auditMetadata({extra:{nested:true}}),/audit_metadata_forbidden/);
  assert.deepEqual(auditMetadata({state:"ACTIVE",count:2,ok:true}),{state:"ACTIVE",count:2,ok:true});
});

test("valid recovery snapshot verifies audit chain and counter",()=>{
  assert.equal(validRecoverySnapshot(makeSnapshot()),true);
  const broken=makeSnapshot();
  broken.audit[0].event_hash="a".repeat(64);
  assert.equal(validRecoverySnapshot(broken),false);
  const regressed=makeSnapshot();
  regressed.counters[0].value=0;
  assert.equal(validRecoverySnapshot(regressed),false);
});

test("recovery rejects duplicate workers and missing active master",()=>{
  const duplicate=makeSnapshot();
  duplicate.workers.push({...duplicate.workers[1]});
  assert.equal(validRecoverySnapshot(duplicate),false);
  const noMaster=makeSnapshot();
  noMaster.workers=noMaster.workers.filter(x=>x.id!=="GASI-MASTER-01");
  assert.equal(validRecoverySnapshot(noMaster),false);
});
