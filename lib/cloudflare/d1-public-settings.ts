import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
const PROJECT='vsxxgdzwtscuxcmjfckt';
const unavailable=()=>new Error('Native public settings projection unavailable');
export type PublicSettingSource={source_project_id:string;key:string;value_json:string;source_updated_at:string;captured_at:string;source_id?:null};
async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');}
function iso(value:string){const time=Date.parse(value);if(!Number.isFinite(time))throw unavailable();return new Date(time).toISOString();}
export type SettingCodec<T>={key:string;normalize:(value:string)=>T};
export async function preparePublicSettings<T>(source:PublicSettingSource,codec:SettingCodec<T>){
 if(source.source_project_id!==PROJECT||source.key!==codec.key||source.source_id!=null)throw unavailable();
 const updated=iso(source.source_updated_at),captured=iso(source.captured_at);if(updated>captured)throw unavailable();
 const normalized=codec.normalize(source.value_json),document=JSON.stringify(normalized),sourceDigest=await digest(source.value_json),normalizedDigest=await digest(document);
 const snapshotId=await digest(JSON.stringify([PROJECT,codec.key,sourceDigest,normalizedDigest,updated,captured]));
 const params=[PROJECT,codec.key,source.value_json,sourceDigest,document,normalizedDigest,updated,captured,snapshotId];
 const statement={sql:`INSERT INTO d1_marketing_snapshots(source_project_id,setting_key,source_document,source_digest,normalized_document,normalized_digest,source_updated_at,source_snapshot_at,snapshot_id,last_verified_at,status)
 VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,NULL,'pending') ON CONFLICT(snapshot_id) DO NOTHING RETURNING snapshot_id`,params};
 return {statement,normalized,sourceDigest,normalizedDigest,updated,captured,document,snapshotId};
}
function window(now:number,age=300000){if(!Number.isFinite(now)||!Number.isSafeInteger(age)||age<1||age>300000)throw unavailable();return{now:new Date(now).toISOString(),floor:new Date(now-age).toISOString()};}
export async function verifyPublicSettings<T>(db:AuthDatabase,source:PublicSettingSource,codec:SettingCodec<T>,options:{now?:number}={}){
 const p=await preparePublicSettings(source,codec),w=window(options.now??Date.now());
 if(p.captured>w.now||p.captured<w.floor)throw unavailable();
 const params=[PROJECT,codec.key,source.value_json,p.sourceDigest,p.document,p.normalizedDigest,p.updated,p.captured,p.snapshotId,w.now];
 const matches=`s.source_project_id=?1 AND s.setting_key=?2 AND s.source_document=?3 AND s.source_digest=?4 AND s.normalized_document=?5 AND s.normalized_digest=?6 AND s.source_updated_at=?7 AND s.source_snapshot_at=?8 AND s.snapshot_id=?9`;
 const row=await db.first(`SELECT snapshot_id FROM d1_marketing_snapshots s WHERE ${matches} AND s.status IN ('pending','verified')`,params.slice(0,9));if(!row)throw unavailable();
 // Publish the fully compared candidate and pointer in one platform batch.
 // A trigger/fault or a concurrently published newer revision rolls it all back.
 const result=await db.batch([
  {sql:`UPDATE d1_marketing_snapshots AS s SET last_verified_at=?10,status='verified' WHERE ${matches} AND s.status IN ('pending','verified')`,params},
  {sql:`INSERT INTO d1_marketing_settings(source_project_id,setting_key,snapshot_id,published_at)
   SELECT ?1,?2,s.snapshot_id,?10 FROM d1_marketing_snapshots s WHERE ${matches} AND s.status='verified' AND s.last_verified_at=?10
   ON CONFLICT(source_project_id,setting_key) DO UPDATE SET snapshot_id=excluded.snapshot_id,published_at=excluded.published_at
   WHERE julianday(?8)>=(SELECT julianday(source_snapshot_at) FROM d1_marketing_snapshots old WHERE old.snapshot_id=d1_marketing_settings.snapshot_id)
    AND julianday(?7)>=(SELECT julianday(source_updated_at) FROM d1_marketing_snapshots old WHERE old.snapshot_id=d1_marketing_settings.snapshot_id)
    AND (?8<>(SELECT source_snapshot_at FROM d1_marketing_snapshots old WHERE old.snapshot_id=d1_marketing_settings.snapshot_id) OR excluded.snapshot_id=d1_marketing_settings.snapshot_id)`,params},
  {sql:`SELECT CASE WHEN EXISTS(SELECT 1 FROM d1_marketing_settings a JOIN d1_marketing_snapshots s ON s.snapshot_id=a.snapshot_id WHERE a.source_project_id=?1 AND a.setting_key=?2 AND a.snapshot_id=?9 AND a.published_at=?10 AND ${matches} AND s.status='verified' AND s.last_verified_at=?10) THEN 1 ELSE abs(-9223372036854775808) END AS published`,params},
 ]);
 if(result.length!==3||result.at(-1)?.results?.[0]?.published!==1)throw unavailable();
}
export async function readPublicSettings<T>(db:Pick<AuthDatabase,'first'>,codec:SettingCodec<T>,options:{now?:number;maxSnapshotAgeMs?:number}={}):Promise<T>{
 const w=window(options.now??Date.now(),options.maxSnapshotAgeMs);
 const row=await db.first(`SELECT s.* FROM d1_marketing_settings a JOIN d1_marketing_snapshots s ON s.snapshot_id=a.snapshot_id AND s.source_project_id=a.source_project_id AND s.setting_key=a.setting_key WHERE a.source_project_id=?1 AND a.setting_key=?2 AND julianday(a.published_at) BETWEEN julianday(s.source_snapshot_at) AND julianday(?4) AND s.status='verified' AND julianday(s.source_snapshot_at) BETWEEN julianday(?3) AND julianday(?4) AND julianday(last_verified_at) BETWEEN julianday(source_snapshot_at) AND julianday(?4) AND julianday(source_updated_at)<=julianday(source_snapshot_at)`,[PROJECT,codec.key,w.floor,w.now]);
 if(!row||typeof row.source_document!=='string'||typeof row.normalized_document!=='string'||typeof row.source_updated_at!=='string'||typeof row.source_snapshot_at!=='string')throw unavailable();
 const expected=await preparePublicSettings({source_project_id:PROJECT,key:codec.key,value_json:row.source_document,source_updated_at:row.source_updated_at,captured_at:row.source_snapshot_at},codec);
 if(expected.snapshotId!==row.snapshot_id||expected.sourceDigest!==row.source_digest||expected.normalizedDigest!==row.normalized_digest||expected.document!==row.normalized_document)throw unavailable();
 return expected.normalized;
}
