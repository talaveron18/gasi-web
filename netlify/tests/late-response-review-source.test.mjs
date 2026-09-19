import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../functions/internal-clinical.mts",import.meta.url),"utf8");

test("late physician responses can be reviewed by another authorized clinical actor",()=>{
 const start=source.indexOf("const lateReview=path.match");
 assert.ok(start>=0,"late review route missing");
 const route=source.slice(start,start+3200);
 assert.match(route,/writableEpisodeOnClient\(client,w,id,true\)/);\n assert.match(route,/FOR UPDATE/);\n assert.match(route,/auditOnClient\(client,w,"LATE_RESPONSE_REVIEWED"/);
 assert.match(route,/episode_write_denied/);
 assert.match(route,/late_after_disposition/);
 assert.match(route,/response\.author_id===w\.id.*late_response_self_review_denied/);
 assert.match(route,/response\.late_reviewed_at=at/);
 assert.match(route,/response\.late_reviewed_by_id=w\.id/);
 assert.match(route,/LATE_RESPONSE_REVIEWED/);
});

test("late response review remains non-destructive and closed episodes are immutable",()=>{
 const start=source.indexOf("const lateReview=path.match");
 const route=source.slice(start,start+3200);
 assert.match(route,/closed_episode_immutable/);
 assert.doesNotMatch(route,/DELETE FROM internal_clinical_episodes/);
 assert.doesNotMatch(route,/response\.text\s*=/);
});
