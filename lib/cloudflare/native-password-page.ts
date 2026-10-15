import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {resolveNativeStageOptions} from '@/lib/cloudflare/native-stage-router';
import {getD1AuthSession} from '@/lib/cloudflare/d1-auth-core';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
export async function readNativePasswordPage(){
 const context=getNativeRequestContext();if(!context)return null;
 const options=resolveNativeStageOptions(context.request,context.env);if(!options)return null;
 const session=await getD1AuthSession(options.db,readD1SessionCookie(context.request),{...options,projectId:"vsxxgdzwtscuxcmjfckt"});
 return {provider:'native-d1' as const,mustChangePassword:session?.user.mustChangePassword??false,signedIn:session!==null};
}
