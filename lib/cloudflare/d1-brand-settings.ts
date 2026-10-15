import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {preparePublicSettings,verifyPublicSettings,readPublicSettings,type PublicSettingSource} from './d1-public-settings';
import {normalizeBrandSettings} from '@/lib/brand-settings';
const fields=new Set(['name','shortName','logoMark','logoImage','tagline','phone','email','primaryCtaLabel','primaryCtaHref','heroImageUrl','heroVideoUrl']);
const codec={key:'brand',normalize:(value:string)=>{
 if(typeof value!=='string'||new TextEncoder().encode(value).length>65536)throw Error('Native brand unavailable');
 const raw=JSON.parse(value);if(raw!==null&&(typeof raw!=='object'||Array.isArray(raw)||Object.entries(raw).some(([k,v])=>!fields.has(k)||typeof v!=='string')))throw Error('Native brand unavailable');
 return normalizeBrandSettings(raw);
}};
export const prepareD1BrandSettings=(source:PublicSettingSource)=>preparePublicSettings(source,codec);
export const verifyD1BrandSettings=(db:AuthDatabase,source:PublicSettingSource,options:{now?:number}={})=>verifyPublicSettings(db,source,codec,options);
export const readD1BrandSettings=(db:Pick<AuthDatabase,'first'>,options:{now?:number;maxSnapshotAgeMs?:number}={})=>readPublicSettings(db,codec,options);
