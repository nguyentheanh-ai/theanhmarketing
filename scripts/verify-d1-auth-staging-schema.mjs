// Read-only, exact D1 staging A only. No credentials or account payload output.
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
if(!process.argv.includes('--remote'))throw Error('Explicit --remote required for the staging readback');
const databaseId='694139c9-6cda-4b8c-9228-c973dbcbb719';
const config=JSON.parse(readFileSync('wrangler.d1-staging.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));
if(config.account_id!=='8035ac71ae1041614760882f4b8862b2'||config.d1_databases?.length!==1||config.d1_databases[0].database_id!==databaseId||config.d1_databases[0].database_name!=='theanh-main-db-staging')throw Error('Staging identity mismatch');
const sql=new DatabaseSync(':memory:');
try{
 for(const file of ['d1-auth-core-prototype.sql','d1-auth-provider-identities-prototype.sql','d1-oauth-transactions-prototype.sql'])sql.exec(readFileSync('scripts/'+file,'utf8'));
 const query="SELECT name,type,sql FROM sqlite_master WHERE name LIKE 'd1_auth_%' OR name LIKE 'd1_oauth_%' ORDER BY name; SELECT (SELECT count(*) FROM d1_access_users) identities,(SELECT count(*) FROM d1_auth_accounts) accounts,(SELECT count(*) FROM d1_auth_sessions) sessions,(SELECT count(*) FROM d1_auth_provider_identities) provider_identities,(SELECT count(*) FROM d1_oauth_transactions) oauth_transactions,(SELECT count(*) FROM d1_auth_attempt_buckets) attempt_buckets,(SELECT count(*) FROM d1_auth_sync_state) sync_markers,(SELECT count(*) FROM d1_auth_source_versions) source_versions,(SELECT count(*) FROM d1_auth_delta_operations) delta_operations; PRAGMA foreign_key_check;";
 const output=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','theanh-main-db-staging','--remote','--config','wrangler.d1-staging.jsonc','--command',query,'--json'],{encoding:'utf8',maxBuffer:4000000}));
 if(output.length!==3||output.some(result=>result.success!==true))throw Error('Staging readback unavailable');
 const expected=sql.prepare("SELECT name,type,sql FROM sqlite_master WHERE name LIKE 'd1_auth_%' OR name LIKE 'd1_oauth_%' ORDER BY name").all();
 const clean=s=>s.replace(/IF NOT EXISTS/gi,'').replace(/\s+/g,' ').trim();
 const mismatch=expected.filter(e=>{const r=output[0].results.find(x=>x.name===e.name);return !r||r.type!==e.type||clean(r.sql)!==clean(e.sql)}).length+output[0].results.filter(r=>!expected.some(e=>e.name===r.name)).length;
 const counts=output[1].results[0],empty=Object.values(counts).every(n=>n===0),expectEmpty=process.argv.includes('--expect-empty');
 const report={status:mismatch===0&&output[2].results.length===0&&(!expectEmpty||empty)?'PASS':'FAIL',checkedAt:new Date().toISOString(),scope:'D1 A staging additive Auth schema only',databaseId,tables:expected.filter(x=>x.type==='table').length,indexes:expected.filter(x=>x.type==='index').length,schemaMismatches:mismatch,counts,expectEmpty,foreignKeyViolations:output[2].results.length,limits:'Schema/count readback is not account import, verified data, Worker binding, login or app cutover'};
 mkdirSync('reports/cloudflare-d1',{recursive:true});writeFileSync('reports/cloudflare-d1/auth-schema-readback.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 if(report.status!=='PASS')process.exitCode=1;
}finally{sql.close()}
