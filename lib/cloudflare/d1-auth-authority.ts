import {authAuthorityContext,type AuthAuthorityPolicy} from '@/lib/cloudflare/auth-proof-domain';
import {nativeAuthoritySql,type AuthorityHandoff} from '@/lib/cloudflare/d1-data-authority';
import type { AuthDatabase } from '@/lib/cloudflare/d1-auth-core';
export type AuthMirrorPolicy=AuthAuthorityPolicy&{now?:number;maxSnapshotAgeMs?:number};
export function authMirrorWindow(policy:AuthMirrorPolicy){
 authAuthorityContext(policy);
 const now=policy.now??Date.now(),age=policy.maxSnapshotAgeMs??300000;
 if(!/^[a-z0-9]{20}$/.test(policy.projectId)||!Number.isFinite(now)||!Number.isFinite(age)||age<=0)throw new Error('Invalid Auth mirror policy');
 return {stamp:new Date(now).toISOString(),floor:new Date(now-age).toISOString()};
}
// SQL positions are backend code constants, never HTTP input. Core statements
// use ?2 for time; composed access statements explicitly supply their position.
export function authMirrorReadySql(projectPosition:number,floorPosition:number,timePosition=2,authority?:AuthorityHandoff){
 if([projectPosition,floorPosition,timePosition].some(position=>!Number.isInteger(position)||position<1))throw new Error('Invalid Auth SQL positions');
 if(authority)return `(?${projectPosition}='${authority.projectId}' AND typeof(?${floorPosition})='text' AND ${nativeAuthoritySql(authority,timePosition)})`;
 return `EXISTS (SELECT 1 FROM d1_auth_sync_state mirror WHERE mirror.source_project_id=?${projectPosition} AND mirror.status='verified'
  AND julianday(mirror.source_snapshot_at) BETWEEN julianday(?${floorPosition}) AND julianday(?${timePosition})
  AND julianday(mirror.last_verified_at) BETWEEN julianday(?${floorPosition}) AND julianday(?${timePosition}))`;
}
// Mirror remains the default. Explicit backend handoff context selects the
// pinned native ledger; it never falls back to Source after native denial.
// No environment gate/activation is introduced by this helper.
export async function assertD1AuthMirrorReady(db:AuthDatabase,policy:AuthMirrorPolicy){
 const window=authMirrorWindow(policy);
 const row=await db.first(`SELECT 1 AS ready WHERE ${authMirrorReadySql(1,3,2,policy.nativeAuthority)}`,[policy.projectId,window.stamp,window.floor]);
 if(row?.ready!==1)throw new Error('Auth projection is not current and verified');
 return window;
}
