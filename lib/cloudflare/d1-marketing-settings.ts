import type {AuthDatabase} from '@/lib/cloudflare/d1-auth-core';
import {preparePublicSettings,verifyPublicSettings,readPublicSettings,type PublicSettingSource} from './d1-public-settings';
import {normalizeMarketingSettings,type MarketingSettings} from '@/lib/marketing-settings';
const strings=new Set(['seoTitle','seoDescription','socialImageUrl','googleSiteVerification','facebookDomainVerification','facebookPixelId','gaMeasurementId','gtmId']);
const bools=new Set(['trackingEnabled','facebookPixelEnabled','gaEnabled','gtmEnabled']);
const unavailable=()=>new Error('Native marketing projection unavailable');
function decode(value:string){
 if(typeof value!=='string'||new TextEncoder().encode(value).length>65536)throw unavailable();
 const raw:unknown=JSON.parse(value);if(raw===null)return null;if(typeof raw!=='object'||Array.isArray(raw))throw unavailable();
 for(const [key,v]of Object.entries(raw)){
  if(strings.has(key)){if(typeof v!=='string')throw unavailable();}
  else if(bools.has(key)){if(typeof v!=='boolean')throw unavailable();}
  else if(key==='facebookPixelIds'){if(!Array.isArray(v)||v.length>100||v.some(x=>typeof x!=='string'))throw unavailable();}
  else throw unavailable();
 }
 return raw as Partial<MarketingSettings>;
}

const codec={key:'marketing',normalize:(value:string)=>normalizeMarketingSettings(decode(value))};
export const prepareD1MarketingSettings=(source:PublicSettingSource)=>preparePublicSettings(source,codec);
export const verifyD1MarketingSettings=(db:AuthDatabase,source:PublicSettingSource,options:{now?:number}={})=>verifyPublicSettings(db,source,codec,options);
export const readD1MarketingSettings=(db:Pick<AuthDatabase,'first'>,options:{now?:number;maxSnapshotAgeMs?:number}={})=>readPublicSettings(db,codec,options);
