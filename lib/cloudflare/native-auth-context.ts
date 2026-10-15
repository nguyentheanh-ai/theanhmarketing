import {authProofDigest,authAuthorityContext} from '@/lib/cloudflare/auth-proof-domain';
import {getD1AuthSession,type AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
type Options=Parameters<typeof getD1AuthSession>[2]&{key:string};
type Proof={accessToken?:string;refreshToken?:string};
const valid=/^[A-Za-z0-9_-]{43}$/,uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function encode(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
function decode(value:string){if(!valid.test(value))return null;try{const bytes=Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')+'='),v=>v.charCodeAt(0));return bytes.length===32&&encode(bytes)===value?bytes:null;}catch{return null;}}

async function signingKey(value:string){const raw=decode(value);if(!raw)throw Error('Native UI context unavailable');return crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function identity(db:AuthDatabase,proof:Proof,options:Options){
 if(!/^[a-z0-9]{20}$/.test(options.projectId))return null;
 const access=proof.accessToken,refresh=proof.refreshToken;
 if(access!==undefined&&!decode(access))return null;
 if(access===undefined&&(!refresh||!decode(refresh)))return null;
 const row=access!==undefined?await db.first('SELECT user_id,family_id,session_version FROM d1_auth_sessions WHERE token_hash=?1 AND project_id=?2',[await authProofDigest(access,options),options.projectId]):await db.first(`SELECT f.user_id,f.family_id,f.session_version FROM d1_auth_refresh_families f WHERE f.project_id=?2 AND (f.current_hash=?1 OR EXISTS(SELECT 1 FROM d1_auth_refresh_receipts r WHERE r.old_hash=?1 AND r.project_id=f.project_id AND r.family_id=f.family_id))`,[await authProofDigest(refresh!,options),options.projectId]);
 if(!row||!uuid.test(String(row.user_id))||!uuid.test(String(row.family_id))||!Number.isSafeInteger(row.session_version)||Number(row.session_version)<1||options.allowedUserIds!==undefined&&!options.allowedUserIds.includes(String(row.user_id)))return null;
 return {userId:String(row.user_id),familyId:String(row.family_id),version:Number(row.session_version)};
}
function payload(id:NonNullable<Awaited<ReturnType<typeof identity>>>,options:Options){return new TextEncoder().encode(JSON.stringify(options.nativeAuthority?['tam-native-ui-context-v2',authAuthorityContext(options),id.userId,id.familyId,id.version]:['tam-native-ui-context-v1',options.projectId,id.userId,id.familyId,id.version]));}
// Public HMAC witness is not a bearer credential. It binds a rendered form to
// its historical family/version, even for status-only retry after revocation.
// Every action must still run its normal live authorization/transaction guards.
export async function verifyNativeAuthContext(db:AuthDatabase,proof:Proof,witness:string,options:Options){
 const bytes=decode(witness);if(!bytes)return false;const id=await identity(db,proof,options);if(!id)return false;
 return crypto.subtle.verify('HMAC',await signingKey(options.key),bytes,payload(id,options));
}
export async function createNativeAuthContext(db:AuthDatabase,accessToken:string,options:Options){
 const session=await getD1AuthSession(db,accessToken,options);if(!session)return undefined;
 const id=await identity(db,{accessToken},options);if(!id||id.userId!==session.user.id||id.familyId!==session.familyId)throw Error('Native UI context unavailable');
 return encode(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(options.key),payload(id,options))));
}
