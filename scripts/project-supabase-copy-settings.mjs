// Publish marketing/brand public-setting snapshots into the separate copy D1
// from its a_public__site_settings table, using the runtime preparers. Status
// stays 'pending' (not verified/native). Usage: node scripts/project-supabase-copy-settings.mjs
import {build} from 'esbuild';import {execFileSync} from 'node:child_process';import {writeFileSync,readFileSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';
const DB='theanh-supabase-copy',run=(...a)=>execFileSync('node_modules/.bin/wrangler',['d1','execute',DB,'--remote',...a],{encoding:'utf8'});
const b=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-marketing-settings";export * from "./lib/cloudflare/d1-brand-settings";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const rows=JSON.parse(run('--json','--command',"SELECT key,value,updated_at FROM a_public__site_settings WHERE key IN ('marketing','brand')"))[0].results;
const captured=new Date().toISOString(),lit=v=>v===null?'NULL':typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'";
let sql=readFileSync('scripts/d1-marketing-settings-prototype.sql','utf8')+'\n';const summary={};
for(const [key,prepare] of [['marketing',h.prepareD1MarketingSettings],['brand',h.prepareD1BrandSettings]]){
 const row=rows.find(r=>r.key===key);
 const p=await prepare(row?{source_project_id:'vsxxgdzwtscuxcmjfckt',key,value_json:row.value,source_updated_at:row.updated_at,captured_at:captured}:{source_project_id:'vsxxgdzwtscuxcmjfckt',key,value_json:'null',source_updated_at:null,source_exists:false,captured_at:captured});
 sql+=p.statement.sql.replace(/\?(\d+)/g,(_,i)=>lit(p.statement.params[i-1])).replace(/ RETURNING snapshot_id$/,'')+';\n';
 sql+=`INSERT INTO d1_marketing_settings(source_project_id,setting_key,snapshot_id,published_at) VALUES('vsxxgdzwtscuxcmjfckt','${key}','${p.snapshotId}','${captured}') ON CONFLICT(source_project_id,setting_key) DO UPDATE SET snapshot_id=excluded.snapshot_id,published_at=excluded.published_at;\n`;
 summary[key]={exists:p.exists,snapshotId:p.snapshotId};
}
const file=mkdtempSync(tmpdir()+'/settings-')+'/s.sql';writeFileSync(file,sql);run('--yes','--file',file);
const back=JSON.parse(run('--json','--command','SELECT setting_key,status,source_exists FROM d1_marketing_snapshots s JOIN d1_marketing_settings m USING(snapshot_id,source_project_id,setting_key)'))[0].results;
console.log(JSON.stringify({summary,readback:back}));
