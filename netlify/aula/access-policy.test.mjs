import test from 'node:test';
import assert from 'node:assert/strict';
import {ROLES,canAuthor,gateUnit,canFinishUnit} from './access-policy.mjs';
const u0={id:'u0',unit_no:0,requires_test:false,requires_practice:false};
const u1={id:'u1',unit_no:1,requires_test:true,requires_practice:true};
const u2={id:'u2',unit_no:2,requires_test:false,requires_practice:false};
const units=[u0,u1,u2];
const enrollment={status:'active',deadline:'2027-02-01T00:00:00Z'};
const now=new Date('2026-11-07T12:00:00Z');
const check=(unit,progressByUnit=new Map(),other={})=>gateUnit({unit,units,progressByUnit,enrollment,now,...other});
test('all roles explicit; learners cannot author',()=>{assert.deepEqual(ROLES,['admin','author','tutor','student']);assert.equal(canAuthor('student'),false);assert.equal(canAuthor('tutor'),false)});
test('unit zero is open but unit one is locked until zero complete',()=>{
 assert.equal(check(u0).open,true);
 assert.equal(check(u1).open,false);
 assert.equal(check(u1,new Map([['u0',{completed_at:now} ]])).open,true);
});
test('a unit with required test and practice never unlocks next without both',()=>{
 const p=new Map([['u0',{completed_at:now}],['u1',{completed_at:now,test_passed_at:now}]]);
 assert.equal(check(u2,p).open,false);
 p.set('u1',{completed_at:now,test_passed_at:now,practice_approved_at:now});
 assert.equal(check(u2,p).open,true);
 assert.equal(canFinishUnit(u1,{test_passed_at:now}).ok,false);
});
test('daily cap applies to new units, not an already viewed unit',()=>{
 const p=new Map([['u0',{completed_at:now}]]);
 assert.equal(check(u1,p,{newUnitsToday:1,maxPerDay:1}).open,false);
 p.set('u1',{first_viewed_at:now});
 assert.equal(check(u1,p,{newUnitsToday:1,maxPerDay:1}).open,true);
});
test('expired and revoked enrollments always fail closed',()=>{
 assert.equal(check(u0,new Map(),{enrollment:{...enrollment,status:'revoked'}}).open,false);
 assert.equal(check(u0,new Map(),{enrollment:{...enrollment,deadline:'2026-01-01T00:00:00Z'}}).open,false);
});
