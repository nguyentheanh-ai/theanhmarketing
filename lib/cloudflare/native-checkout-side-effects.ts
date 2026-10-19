import {cleanText} from '@/lib/security/validation';
import {sendMetaInitiateCheckoutEvent,sendMetaLeadEvent,type MetaLeadEventInput} from '@/lib/meta/conversions-api';
import {syncOrderToGoogleSheet} from '@/lib/notifications/google-sheets';
import type {NativeCheckoutContext} from './native-checkout-http';

type Senders={lead:(i:MetaLeadEventInput)=>Promise<unknown>;checkout:(i:MetaLeadEventInput)=>Promise<unknown>;sheet:typeof syncOrderToGoogleSheet};
const defaults:Senders={lead:sendMetaLeadEvent,checkout:sendMetaInitiateCheckoutEvent,sheet:syncOrderToGoogleSheet};

// Same post-order work as the Source route's after(): Meta Lead and
// InitiateCheckout (event_id = order code for browser dedup) and Sheets sync.
// The Source Supabase activity log is not written; native activity logging is
// part of the CRM port. Each provider failure is isolated and only logged.
export function createNativeCheckoutSideEffects(senders:Partial<Senders>={}){
 const s={...defaults,...senders};
 return async ({order,leadId,incomingLeadId,body,leadSource,ipAddress,userAgent}:NativeCheckoutContext)=>{
  const a=order.attribution,base:MetaLeadEventInput={orderCode:order.orderCode,studentName:order.studentName,email:order.email,phone:order.phone,
   courseSlug:order.courseSlug,courseTitle:order.courseTitle,amount:order.amount,currency:order.currency,status:order.status,
   landingPage:cleanText(body.landingPage,120),pageUrl:cleanText(body.pageUrl,500),
   utmSource:cleanText(body.utmSource,120),utmMedium:cleanText(body.utmMedium,120),utmCampaign:cleanText(body.utmCampaign,160),
   utmContent:cleanText(body.utmContent,160),utmId:cleanText(body.utmId,160),utmTerm:cleanText(body.utmTerm,160),
   campaignId:a.campaignId,campaignName:a.campaignName,adsetId:a.adsetId,adId:a.adId,adName:a.adName,fbclid:a.fbclid,
   fbp:cleanText(body.fbp,180),fbc:cleanText(body.fbc,220),eventId:order.orderCode,ipAddress,userAgent};
  const run=async(name:string,task:()=>Promise<unknown>)=>{try{const r=await task() as {ok?:boolean;skipped?:boolean}|undefined;if(r&&r.ok===false&&!r.skipped)console.warn(`[native-checkout] ${name} failed`);}catch{console.warn(`[native-checkout] ${name} failed`);}};
  await run('meta_lead',()=>s.lead({...base,referrer:cleanText(body.referrer,500),leadId:leadId??incomingLeadId}));
  await run('meta_initiate_checkout',()=>s.checkout(base));
  await run('google_sheet',()=>s.sheet(order,{source:leadSource,landingPageUrl:cleanText(body.pageUrl,500)}));
 };
}
