// Sensitive stdin/stdout pair: called only by copy-supabase-to-d1.py, whose
// parent captures both streams. Output holds sealed ciphertext, never raw hashes.
import {build} from 'esbuild';
let text='';for await(const chunk of process.stdin)text+=chunk;
const input=JSON.parse(text);
const bundled=await build({stdin:{contents:'export * from "./lib/cloudflare/d1-auth-import";export {isAdminEmail} from "./lib/course-access";',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const h=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
// A: protected app_metadata role, then configured owner email. B has its own
// role model; roles are not inferred for B in this copy.
const resolveRole=row=>{if(!input.adminRoles)return null;const r=row.appMetadata?.admin_role;if(r==='owner'||r==='editor')return r;return h.isAdminEmail(row.email)?'owner':null;};
const plan=await h.prepareD1AuthInitialImport(input.users,{projectId:input.projectId,credentialKey:input.credentialKey,resolveRole});
process.stdout.write(JSON.stringify(plan));
