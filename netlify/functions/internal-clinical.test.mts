import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { auditMetadata, canonical, canRead, canWrite, decodeKiosk, has, isMobileRequest, publicEpisode, signKiosk, validRecoverySnapshot } from "./internal-clinical.mts";

process.env.GASI_MASTER_ACTOR_ID="GASI-MASTER-01";
process.env.GASI_INTERNAL_SESSION_SECRET="test-only-session-secret-with-more-than-32-bytes";

const genesis="0".repeat(64);
const makeSnapshot=()=>{
  const at="2026-09-18T18:00:00.000Z";
  const payload={at,actor_id:"GASI-MASTER-01",actor_role:"admin",action:"LOGIN_SUCCESS",episode_id:null,metadata:{}};
  const event_hash=crypto.createHash("sha256").update(genesis+":"+canonical(payload)).digest("hex");
  return {
    schema_version:2,
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
    counters:[{name:"episode",value:1}],
    timeclock_devices:[
      {id:"GASI-KIOSK-A",center:"CENTER-A",label:"Recepción",token_hash:"b".repeat(64),active:true,auth_version:1,created_at:at,last_seen_at:null}
    ],
    timeclock_events:[
      {id:"11111111-1111-4111-8111-111111111111",worker_id:"GASI-NURSE-01",center:"CENTER-A",device_id:"GASI-KIOSK-A",event_type:"IN",occurred_at:at,created_at:at}
    ],
    timeclock_corrections:[
      {id:"22222222-2222-4222-8222-222222222222",event_id:"11111111-1111-4111-8111-111111111111",replacement_event_type:null,replacement_occurred_at:null,reason:"Sin cambios",corrected_by_id:"GASI-MASTER-01",corrected_at:at}
    ]
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


test("recovery validates attendance device and center integrity",()=>{
  const wrongCenter=makeSnapshot();
  wrongCenter.timeclock_events[0].center="CENTER-B";
  assert.equal(validRecoverySnapshot(wrongCenter),false);
  const unknownWorker=makeSnapshot();
  unknownWorker.timeclock_events[0].worker_id="UNKNOWN";
  assert.equal(validRecoverySnapshot(unknownWorker),false);
  const badDeviceHash=makeSnapshot();
  badDeviceHash.timeclock_devices[0].token_hash="short";
  assert.equal(validRecoverySnapshot(badDeviceHash),false);
});

test("attendance corrections cannot point to missing events",()=>{
  const snap=makeSnapshot();
  snap.timeclock_corrections[0].event_id="33333333-3333-4333-8333-333333333333";
  assert.equal(validRecoverySnapshot(snap),false);
});


test("timeclock kiosk credential is required and signed independently",()=>{
  assert.throws(()=>decodeKiosk(""),/kiosk_required/);
  assert.throws(()=>decodeKiosk("v1.invalid.invalid"),/kiosk_required/);
  const token=signKiosk({id:"GASI-KIOSK-A",auth_version:7});
  const decoded=decodeKiosk(token);
  assert.equal(decoded.did,"GASI-KIOSK-A");
  assert.equal(decoded.av,7);
});


test("mobile clients are rejected for attendance terminals",()=>{
  const mobile=new Request("https://gasisalud.com/api/internal-clinical/timeclock/punch",{headers:{"user-agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile"}});
  const clientHint=new Request("https://gasisalud.com/api/internal-clinical/timeclock/punch",{headers:{"sec-ch-ua-mobile":"?1","user-agent":"Desktop"}});
  const desktop=new Request("https://gasisalud.com/api/internal-clinical/timeclock/punch",{headers:{"user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140"}});
  assert.equal(isMobileRequest(mobile),true);
  assert.equal(isMobileRequest(clientHint),true);
  assert.equal(isMobileRequest(desktop),false);
});
