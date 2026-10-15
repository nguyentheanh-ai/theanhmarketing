import {getNativeRequestContext} from '@/lib/cloudflare/native-request-context';
import {createD1AuthDatabase} from '@/lib/cloudflare/d1-auth-database';
import {readD1MarketingSettings} from '@/lib/cloudflare/d1-marketing-settings';
import {readD1BrandSettings} from '@/lib/cloudflare/d1-brand-settings';
const ORIGIN='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev';
// Public settings only. Native mode must never fall through to Supabase or
// defaults when its verified projection is missing, stale or corrupted.
function nativeDatabase(){
 const ctx=getNativeRequestContext();if(!ctx)return null;
 const mode:string=ctx.env.CF_NATIVE_MARKETING_MODE??'disabled';if(mode==='disabled')return null;
 if(mode!=='qa'||ctx.env.CF_NATIVE_AUTH_ORIGIN!==ORIGIN||new URL(ctx.request.url).origin!==ORIGIN)throw Error('Native marketing configuration unavailable');
 return createD1AuthDatabase(ctx.env.NATIVE_AUTH_DB);
}

export async function readNativeMarketingSettings(){const db=nativeDatabase();return db?readD1MarketingSettings(db):null;}
export async function readNativeBrandSettings(){const db=nativeDatabase();return db?readD1BrandSettings(db):null;}
