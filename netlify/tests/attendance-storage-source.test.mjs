import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(new URL("../database/migrations/20260919121000_internal-attendance-v1/migration.sql", import.meta.url), "utf8");
const onePerCenter = fs.readFileSync(new URL("../database/migrations/20260919224500_one-workstation-per-center/migration.sql", import.meta.url), "utf8");

test("attendance requires a center-bound workstation credential", () => {
  assert.match(sql, /internal_center_workstations/);
  assert.match(sql, /center TEXT NOT NULL/);
  assert.match(sql, /credential_hash TEXT NOT NULL/);
  assert.match(sql, /active BOOLEAN NOT NULL DEFAULT TRUE/);
});

test("attendance events use server timestamps and preserve workstation evidence", () => {
  assert.match(sql, /workstation_id TEXT NOT NULL REFERENCES internal_center_workstations\(id\)/);
  assert.match(sql, /occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/);
  assert.match(sql, /event_type TEXT NOT NULL CHECK \(event_type IN \('CLOCK_IN','CLOCK_OUT','CORRECTION'\)\)/);
});

test("attendance history is append-only and corrections reference prior evidence", () => {
  assert.match(sql, /related_event_seq BIGINT REFERENCES internal_attendance_events\(seq\)/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON internal_attendance_events/);
  assert.match(sql, /RAISE EXCEPTION 'internal_attendance_events are append-only'/);
});


test("one fixed workstation per center is enforced by PostgreSQL",()=>{
 assert.match(onePerCenter,/CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_center_workstations_center/);
 assert.match(onePerCenter,/ON internal_center_workstations\(center\)/);
});
