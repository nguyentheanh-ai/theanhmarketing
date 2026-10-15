import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {resolveNativeStageOptions,resolveNativeAuthContextKey} from '@/lib/cloudflare/native-stage-router';
import {readD1SessionCookie} from '@/lib/cloudflare/d1-auth-http';
import {createNativeAuthContext} from '@/lib/cloudflare/native-auth-context';
// Server-only consumers. Only the opaque form witness may enter client props;
// never serialize bindings, key, session token or the trusted identity payload.
export async function readNativeUiAuthContext(){
 const context=getNativeRequestContext();if(!context)return undefined;
 const key=resolveNativeAuthContextKey(context.env);if(!key)return undefined;
 const options=resolveNativeStageOptions(context.request,context.env);if(!options)throw Error('Native UI context unavailable');
 return createNativeAuthContext(options.db,readD1SessionCookie(context.request),{...options,projectId:'vsxxgdzwtscuxcmjfckt',key});
}
