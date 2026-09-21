import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const focused=fs.readFileSync(new URL("../../frontend/src/pages/InternalClinicalFocusedEpisode.jsx",import.meta.url),"utf8");

test("focused episode fetches only the requested authoritative resource",()=>{
 assert.match(focused,/api\.getEpisode\(episodeId\)/);
 assert.doesNotMatch(focused,/loadAuthoritativeEpisodes\(api\)/);
 assert.doesNotMatch(focused,/selectAuthoritativeEpisodeById/);
});

test("focused episode fails closed when the direct scoped API rejects visibility",()=>{
 assert.match(focused,/setErrorCode\(err\.code\|\|'episode_not_visible'\)/);
 assert.match(focused,/setEpisode\(null\)/);
 assert.match(focused,/setState\('ERROR'\)/);
});
