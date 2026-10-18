import test from 'node:test';
import assert from 'node:assert/strict';
import {sealSourceSnapshot} from '../scripts/sealed-source-snapshot.mjs';
import {refreshedTimestamp,legacyGraphFromArchive} from '../scripts/probe-sealed-legacy-sessions.mjs';
const master='fixture-only-master-key-never-production-123456789';
test('only the documented Supabase refreshed_at field accepts timezone-free UTC text',()=>{
  assert.equal(refreshedTimestamp('2026-10-18 11:30:00.123456','timestamp without time zone'),'2026-10-18T11:30:00.123456+00:00');
  assert.equal(refreshedTimestamp(null,'timestamp without time zone'),null);
  for(const [value,type] of [['2026-10-18 11:30:00','text'],['2026-10-18 11:30:00+00','timestamp without time zone'],['2026-02-30 11:30:00','timestamp without time zone']])assert.throws(()=>refreshedTimestamp(value,type),/UNAVAILABLE/);
});
test('session adapter preserves security fields for core rejection and rejects unfamiliar schema',()=>{
  const doc={id:'00000000-0000-4000-8000-000000000002',user_id:'00000000-0000-4000-8000-000000000001',
    created_at:'2026-10-18 11:30:00+00',updated_at:'2026-10-18 11:30:00+00',factor_id:null,aal:'aal1',not_after:null,
    refreshed_at:'2026-10-18 11:30:00',user_agent:null,ip:null,tag:null,oauth_client_id:null,
    refresh_token_hmac_key:'fixture-unimplemented-security-field',refresh_token_counter:'0',scopes:null};
  const make=extra=>{const row={...doc,...extra},catalog=[{s:'auth',t:'sessions',pk:['id'],cols:Object.keys(row).map(n=>({n,ty:n==='refreshed_at'?'timestamp without time zone':'text'}))}];
    return sealSourceSnapshot(master,'a',{snapshot:'1:2:',capturedAt:'2026-10-18T11:31:00Z',catalog,tables:{a_auth__sessions:{count:1,rows:[Object.values(row)]}}});};
  const graph=legacyGraphFromArchive({masterSecret:master,project:'a',archive:make({})});
  assert.equal(graph.sessions[0].refreshTokenHmacKey,doc.refresh_token_hmac_key);
  assert.equal(graph.sessions[0].refreshTokenCounter,'0');
  assert.throws(()=>legacyGraphFromArchive({masterSecret:master,project:'a',archive:make({future_security_field:null})}),/SCHEMA_UNAVAILABLE/);
});
