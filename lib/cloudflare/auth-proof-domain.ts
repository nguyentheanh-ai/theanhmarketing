import {nativeAuthoritySql,type AuthorityHandoff} from '@/lib/cloudflare/d1-data-authority';
export type AuthAuthorityPolicy={projectId:string;nativeAuthority?:AuthorityHandoff};
// Opaque proofs are namespaced by the expected backend handoff. A restored
// row from a different epoch/fence cannot authenticate the same wire token.
// Absence preserves the deployed mirror hash and derivation byte-for-byte.
export function authAuthorityContext(policy:AuthAuthorityPolicy){
 const v=policy.nativeAuthority;if(v===undefined)return null;
 if(!v||v.projectId!==policy.projectId)throw Error('Auth authority mismatch');
 nativeAuthoritySql(v,1); // validates every literal; does not activate anything
 return JSON.stringify([v.projectId,v.component,v.epoch,v.restoreFence,v.transitionId,v.sourceCutoffAt,v.manifestDigest,v.sourceFenceReceipt,v.approvalReceipt]);
}
export async function authProofDigest(value:string,policy:AuthAuthorityPolicy){
 const context=authAuthorityContext(policy),material=context===null?value:JSON.stringify(['tam-native-auth-proof-v1',context,value]);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(material))),b=>b.toString(16).padStart(2,'0')).join('');
}
