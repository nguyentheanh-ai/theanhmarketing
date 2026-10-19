// Static audit: every literal .from(...).select(...) chain in the app is parsed
// by the D1 shim against the captured schema (tables, columns, embeds).
import {build} from 'esbuild';import {readFileSync,writeFileSync} from 'node:fs';import {execSync} from 'node:child_process';
const built=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-postgrest";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'error'});
const h=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const schemas={a:JSON.parse(readFileSync('lib/cloudflare/generated/supabase-schema-a.json','utf8'))};
const files=execSync("grep -rlE '\\.from\\(' app lib services components --include=*.ts --include=*.tsx | grep -v lib/cloudflare",{encoding:'utf8'}).trim().split('\n');
const consts={};const issues=[],ok=[];
for(const file of files){
 const src=readFileSync(file,'utf8');
 for(const m of src.matchAll(/const\s+(\w+)\s*=\s*\n?\s*(["'`])([^"'`]*)\2\s*(as const)?;/g))consts[m[1]]=m[3];
 const re=/(?:\.schema\(\s*["'](\w+)["']\s*\)\s*)?\.from\(\s*["'`]([\w.]+)["'`]\s*\)([\s\S]{0,1500}?)(?=\.from\(|;\n|\n\s*\n)/g;
 for(const m of src.matchAll(re)){
  const schema=m[1]??'public',table=m[2];if(['storage','objects'].includes(table))continue;
  const line=src.slice(0,m.index).split('\n').length;
  // Clients are often pre-scoped (const crm = admin.schema('crm_v2')): try both.
  const keys=[`${schema}.${table}`,`crm_v2.${table}`,`public.${table}`].filter((k,i,a)=>a.indexOf(k)===i&&schemas.a.tables[k]);
  if(!keys.length){issues.push({file,line,key:table,problem:'table not in schema A (B app, auth or storage)'});continue;}
  let key=keys[0];
  const sel=[...m[3].matchAll(/\.select\(\s*(?:(["'`])([\s\S]*?)\1|(\w+))?/g)];
  const client=h.createD1PostgrestClient({all:async()=>[]},schemas.a,{prefix:'a'});
  for(const s of sel){
   let text=s[2]??(s[3]?consts[s[3]]:'*');if(text===undefined){issues.push({file,line,key,problem:`select from variable ${s[3]} not resolved`});continue;}
   if(text.includes('${')){issues.push({file,line,key,problem:'dynamic select template',select:text.slice(0,120)});continue;}
   try{const nodes=h.parseSelect(text);const check=(tableKey,nodes)=>{const t=schemas.a.tables[tableKey];for(const n of nodes){if(n.kind==='col'&&!(n.name in t.cols)&&n.name!=='count')throw Error(`column ${tableKey}.${n.name} missing`);if(n.kind==='embed'&&!n.count){const rel=resolveRel(tableKey,n);check(rel,n.children.length?n.children:[{kind:'star'}]);}}};
    const resolveRel=(from,n)=>{const q=client.from(from.split('.')[1]);void q;return h.__resolve?h.__resolve(schemas.a,from,n.relation,n.hint):resolveViaQuery(from,n)};
    const resolveViaQuery=(from,n)=>{const r=h.resolveRelationForAudit(schemas.a,from,n.relation,n.hint);return r.table;};
    let last;for(const k of keys){try{check(k,nodes);last=null;key=k;break;}catch(e){last=e;}}if(last)throw last;ok.push(`${file}:${line}`);}
   catch(e){issues.push({file,line,key,problem:e.message,select:text.slice(0,160)});}
  }
 }
}
writeFileSync('reports/cloudflare-d1/d1-shim-query-audit-a.json',JSON.stringify({checked:ok.length,issues},null,1)+'\n');
console.log('checked',ok.length,'issues',issues.length);for(const i of issues)console.log(i.file+':'+i.line,i.key,'-',i.problem,i.select?'| '+i.select:'');
