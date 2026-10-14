import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {readD1StudentSessionAccess} from '@/lib/cloudflare/d1-student-session-access';
import {FACEBOOK_EBOOK_COURSE_SLUG} from '@/lib/ebook/facebook-ebook';
import {AGENT_KIT_SLUG} from '@/lib/agent-kit-preorder';
type Policy={sessionTtlMs:number;now?:number;allowedUserIds?:readonly string[]};
// Preserve the two existing source policies: ebook uses payment/override
// ownership only, while the Agent library additionally accepts active LMS.
// Admin projection is deliberately unsupported by the native student boundary.
export async function requireD1ResourceAccess(db:AuthDatabase,token:string,resource:'ebook'|'agents',policy:Policy){
 const result=await readD1StudentSessionAccess(db,token,policy);
 if(result.status==='guest')return {ok:false as const,status:401 as const};
 if(result.status==='password-change-required')return {ok:false as const,status:403 as const};
 const owns=resource==='ebook'?result.access.legacyOwnedSlugs.includes(FACEBOOK_EBOOK_COURSE_SLUG):result.access.ownedSlugs.includes(AGENT_KIT_SLUG);
 return owns?{ok:true as const,userId:result.user.id,email:result.user.email,isAdmin:false as const}:{ok:false as const,status:403 as const};
}
