import type { AuthDatabase } from '@/lib/cloudflare/d1-auth-core';
export type AuthMirrorPolicy={projectId:string;now?:number;maxSnapshotAgeMs?:number};
export function authMirrorWindow(policy:AuthMirrorPolicy){
 const now=policy.now??Date.now(),age=policy.maxSnapshotAgeMs??300000;
 if(!/^[a-z0-9]{20}$/.test(policy.projectId)||!Number.isFinite(now)||!Number.isFinite(age)||age<=0)throw new Error('Invalid Auth mirror policy');
 return {stamp:new Date(now).toISOString(),floor:new Date(now-age).toISOString()};
}
// SQL positions are backend code constants, never HTTP input. ?2 is the UTC
// authorization check time in every core statement using this fragment.
export function authMirrorReadySql(projectPosition:number,floorPosition:number){
 if(!Number.isInteger(projectPosition)||!Number.isInteger(floorPosition)||projectPosition<1||floorPosition<1)throw new Error('Invalid Auth SQL positions');
 return `EXISTS (SELECT 1 FROM d1_auth_sync_state mirror WHERE mirror.source_project_id=?${projectPosition} AND mirror.status='verified'
  AND julianday(mirror.source_snapshot_at) BETWEEN julianday(?${floorPosition}) AND julianday(?2)
  AND julianday(mirror.last_verified_at) BETWEEN julianday(?${floorPosition}) AND julianday(?2))`;
}
// Mirror stage only. Import/delta must record genuine source snapshot time after
// full verification. This is not a heartbeat or a native-write cutover flag.
export async function assertD1AuthMirrorReady(db:AuthDatabase,policy:AuthMirrorPolicy){
 const window=authMirrorWindow(policy);
 const row=await db.first(`SELECT 1 AS ready WHERE ${authMirrorReadySql(1,3)}`,[policy.projectId,window.stamp,window.floor]);
 if(row?.ready!==1)throw new Error('Auth projection is not current and verified');
 return window;
}
