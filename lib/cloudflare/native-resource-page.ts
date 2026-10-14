import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {resolveNativeStageOptions} from '@/lib/cloudflare/native-stage-router';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {requireD1ResourceAccess} from '@/lib/cloudflare/native-resource-access';
export async function readNativeResourcePageAccess(resource:'ebook'|'agents'){
 const context=getNativeRequestContext();if(!context)return null;
 const options=resolveNativeStageOptions(context.request,context.env);if(!options)return null;
 return requireD1ResourceAccess(options.db,readD1SessionCookie(context.request),resource,options);
}
