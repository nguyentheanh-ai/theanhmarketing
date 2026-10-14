// Local binding/transaction test. No real accounts, credentials or provider calls.
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import assert from 'node:assert/strict';
const source=`import {createD1AuthDatabase} from './lib/cloudflare/d1-auth-database';
export default {async fetch(request,env){const db=createD1AuthDatabase(env.DB);try{
 const mode=new URL(request.url).pathname;
 if(mode==='/rollback'){await db.batch([{sql:'INSERT INTO fixture VALUES(?1,?2)',params:[1,'synthetic-value']},{sql:'INSERT INTO fixture VALUES(?1,?2)',params:[1,'synthetic-duplicate']}]);return Response.json({unexpected:true})}
 if(mode==='/missing'){await db.first('SELECT * FROM fixture WHERE id=?1',[999]);return Response.json({row:await db.first('SELECT * FROM fixture WHERE id=?1',[999])})}
 if(mode==='/sql-error'){await db.first('SELECT synthetic_sensitive_column FROM fixture',[]);return Response.json({unexpected:true})}
 const result=await db.batch([{sql:'INSERT INTO fixture VALUES(?1,?2) RETURNING id',params:[2,null]},{sql:'SELECT id,value FROM fixture WHERE id=?1',params:[2]}]);return Response.json({result,row:await db.first('SELECT id,value FROM fixture WHERE id=?1',[2])});
 }catch(error){return Response.json({message:error.message},{status:503})}}};`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'browser',write:false,tsconfig:'tsconfig.json'});
assert(!bundle.outputFiles[0].text.includes('from "miniflare"'));
const mf=new Miniflare({workers:[{config:{name:'auth-binding-fixture',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],manifest:{mainModule:'fixture.mjs',modules:{'fixture.mjs':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',name:'auth-binding-fixture',id:'auth-binding-fixture'}}}}]});
try{
 const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE fixture(id INTEGER PRIMARY KEY,value TEXT)').run();
 const get=path=>mf.dispatchFetch('https://fixture.invalid'+path);
 const failed=await get('/rollback');assert.equal(failed.status,503);assert.deepEqual(await failed.json(),{message:'Auth database unavailable'});assert.equal((await db.prepare('SELECT count(*) n FROM fixture').first()).n,0);
 assert.deepEqual(await (await get('/missing')).json(),{row:null});
 const r=await get('/write-read');assert.equal(r.status,200);assert.deepEqual(await r.json(),{result:[{results:[{id:2}]},{results:[{id:2,value:null}]}],row:{id:2,value:null}});
 const error=await get('/sql-error');assert.equal(error.status,503);assert.deepEqual(await error.json(),{message:'Auth database unavailable'});assert.equal((await db.prepare('SELECT count(*) n FROM fixture').first()).n,1);
 console.log('PASS local workerd D1 Auth adapter: atomic rollback, null/read-your-write, ordered batch rows, generic SQL errors; SDK type-only import erased. No production claim.');
}finally{await mf.dispose()}
