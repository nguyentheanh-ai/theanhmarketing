import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import type {NativeEmailAuthEnv} from '@/lib/cloudflare/native-email-auth-http';
// Server-only provider choice for signup / forgot / reset pages. Outside the
// staging Worker (no request context, e.g. Vercel) this is always Supabase.
export function nativeEmailAuthProvider(){
 const env=getNativeRequestContext()?.env as NativeEmailAuthEnv|undefined;
 // Full native data mode serves every user from D1.
 return env?.CF_NATIVE_QA_EMAIL_AUTH_MODE==='qa'||(env as {CF_NATIVE_DATA_MODE?:string}|undefined)?.CF_NATIVE_DATA_MODE==='d1'?'native-d1' as const:'supabase' as const;
}
