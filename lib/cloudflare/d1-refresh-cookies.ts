import type {attachD1RefreshFamily} from '@/lib/cloudflare/d1-refresh-family';
export const D1_REFRESH_COOKIE='__Host-tam-refresh';
export type NativeRefreshPair=NonNullable<Awaited<ReturnType<typeof attachD1RefreshFamily>>>;
export function assertRefreshCookieLifetime(seconds:number){
 if(!Number.isSafeInteger(seconds)||seconds<1||seconds>400*86400)throw Error('Invalid refresh cookie lifetime');
}
export function createD1RefreshCookies(pair:NativeRefreshPair,now:number,cookieMaxAgeSeconds:number){
 assertRefreshCookieLifetime(cookieMaxAgeSeconds);
 const accessAge=Math.max(1,Math.min(cookieMaxAgeSeconds,Math.ceil((Date.parse(pair.expiresAt)-now)/1000)));
 const refreshAge=pair.refreshExpiresAt===null?cookieMaxAgeSeconds:Math.max(1,Math.min(cookieMaxAgeSeconds,Math.ceil((Date.parse(pair.refreshExpiresAt)-now)/1000)));
 return [['__Host-tam-session',pair.accessToken,accessAge],[D1_REFRESH_COOKIE,pair.refreshToken,refreshAge]].map(([name,value,age])=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax${pair.rememberLogin?'; Max-Age='+age:''}`);
}
