import {cleanEmail,cleanPhone,cleanSlug,cleanSlugList,cleanText,isValidEmail,isValidPhone,isValidSlug} from '@/lib/security/validation';
import {normalizeInvoiceInput} from '@/lib/orders/invoice';
import {formatVnd} from '@/lib/payments/sepay';
import {normalizeAttribution} from '@/lib/tracking/attribution';
import type {PaymentOrder} from '@/services/orderService';
import {createNativeCheckoutOrder,NativeCheckoutConflict,type NativeCheckoutOptions} from './d1-checkout-order';
import type {NativeOrderDatabase} from './native-order-settlement';

const ORIGIN='https://theanh-main-cf-staging.12c1thdtheanh.workers.dev',PATH='/api/cloudflare-checkout/orders',MAX_BODY=32768;
const privacy={'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const fail=(status:number,message:string,extra:Record<string,string>={})=>Response.json({ok:false,message},{status,headers:{...privacy,...extra}});
type Body=Record<string,unknown>;
export type NativeCheckoutContext={order:PaymentOrder;leadId:string|null;incomingLeadId:string;body:Body;leadSource:string;ipAddress:string;userAgent:string};
export type NativeCheckoutHttpOptions=Omit<NativeCheckoutOptions,'now'>&{
 db:NativeOrderDatabase;now?:()=>number;
 // Shared limiter (Source: 12 per 10 minutes per client).
 allowAttempt:(request:Request)=>Promise<boolean>;
 // Meta Lead/InitiateCheckout + Sheets; caller hands the promise to waitUntil.
 afterCreate?:(context:NativeCheckoutContext)=>Promise<void>;
 waitUntil?:(promise:Promise<unknown>)=>void;
};

// Same lead source rules as app/api/orders/route.ts determineLeadSource.
export function determineNativeLeadSource(order:{courseSlug:string;courseTitle:string},landingPage?:unknown){
 const page=cleanText(landingPage,120),course=`${order.courseSlug} ${order.courseTitle}`.toLowerCase();
 if(page.includes('ai-master-x10')||course.includes('ai-master-x10'))return 'LDP AI Master X10';
 if(page.includes('ebook-facebook-ads-2026')||course.includes('ebook-facebook-ads-2026'))return 'LDP Ebook Facebook Ads 2026';
 if(page.includes('facebook-ads-master-2026')||course.includes('facebook-ads-2026'))return 'LDP Facebook Ads Master 2026';
 return page?`LDP ${page}`:`LDP ${order.courseTitle||'Website'}`;
}

// Same PaymentOrder shape as services/orderService.ts mapDbOrder for a new order.
export function nativeRowToPaymentOrder(row:Record<string,unknown>):PaymentOrder{
 const t=(k:string)=>typeof row[k]==='string'?row[k] as string:'',n=(k:string)=>typeof row[k]==='string'?row[k] as string:null;
 const amount=typeof row.amount==='number'?row.amount:0;
 return {id:t('id'),leadId:n('lead_id'),orderCode:t('order_code'),studentName:t('student_name'),email:t('email'),phone:t('phone'),
  courseSlug:t('course_slug'),courseTitle:t('course_title'),amount,amountLabel:formatVnd(amount),currency:t('currency')||'VND',
  status:(['paid','failed','expired'].includes(t('status'))?t('status'):'pending') as PaymentOrder['status'],paymentMethod:t('payment_method')||'sepay',
  paymentQrUrl:t('payment_qr_url'),paidAt:n('paid_at'),expiresAt:n('expires_at'),createdAt:t('created_at'),sepayReferenceCode:n('sepay_reference_code'),
  orderItems:Array.isArray(row.order_items)?row.order_items as PaymentOrder['orderItems']:[],
  paymentEmailSentAt:n('payment_email_sent_at'),paymentEmailLastError:null,accountingEmailSentAt:null,accountingEmailLastError:null,
  purchaseEventSent:Boolean(row.purchase_event_sent),paymentPlan:n('payment_plan'),parentOrderCode:n('parent_order_code'),
  attribution:normalizeAttribution({utmSource:t('utm_source'),utmMedium:t('utm_medium'),utmCampaign:t('utm_campaign'),utmContent:t('utm_content'),utmId:t('utm_id'),utmTerm:t('utm_term'),campaignId:t('campaign_id'),campaignName:t('campaign_name'),adsetId:t('adset_id'),adId:t('ad_id'),adName:t('ad_name'),fbclid:t('fbclid'),fbc:t('fbc'),fbp:t('fbp'),landingPage:t('landing_page')}),
  invoice:row.invoice_requested?{requested:true,taxCode:t('invoice_tax_code'),companyName:t('invoice_company_name'),companyAddress:t('invoice_company_address'),email:t('invoice_email')}:{requested:false,taxCode:'',companyName:'',companyAddress:'',email:''},
 };
}

async function readBody(request:Request):Promise<Body>{
 const declared=request.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BODY))throw new RangeError();
 const text=await request.text();if(new TextEncoder().encode(text).length>MAX_BODY)throw new RangeError();
 const value:unknown=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new SyntaxError();return value as Body;
}

// Candidate native replacement for POST /api/orders (staging only, not mounted
// by default). Validation, messages, lead note and response match the Source
// route; writes go to D1 only and never fall back to Supabase.
export async function handleNativeCheckoutHttp(request:Request,options:NativeCheckoutHttpOptions):Promise<Response>{
 const url=new URL(request.url);if(url.origin!==ORIGIN||url.pathname!==PATH)return fail(404,'Không tìm thấy.');
 if(request.method!=='POST')return new Response(null,{status:405,headers:{...privacy,Allow:'POST'}});
 try{if(!await options.allowAttempt(request))return fail(429,'Bạn thao tác quá nhanh, vui lòng thử lại sau.',{'Retry-After':'60'});}catch{return fail(503,'Không tạo được đơn thanh toán.');}
 let body:Body;try{body=await readBody(request);}catch(error){return error instanceof RangeError?fail(413,'Dữ liệu quá lớn.'):fail(400,'Thiếu thông tin tạo đơn thanh toán.');}
 const studentName=cleanText(body.studentName,120),email=cleanEmail(body.email),phone=cleanPhone(body.phone);
 const courseSlug=cleanSlug(body.courseSlug),courseSlugs=cleanSlugList(body.courseSlugs),paymentPlan=cleanText(body.paymentPlan,40),couponCode=cleanText(body.couponCode,40).toUpperCase();
 const invoice=normalizeInvoiceInput(body.invoice);
 const forwarded=request.headers.get('x-forwarded-for')??'',ipAddress=request.headers.get('cf-connecting-ip')??forwarded.split(',')[0]?.trim()??'',userAgent=request.headers.get('user-agent')??'';
 const incomingLeadId=cleanText(body.leadId,120),databaseLeadId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingLeadId)?incomingLeadId:'';
 const attribution={utmSource:cleanText(body.utmSource,120),utmMedium:cleanText(body.utmMedium,120),utmCampaign:cleanText(body.utmCampaign,160),utmContent:cleanText(body.utmContent,160),utmId:cleanText(body.utmId,160),utmTerm:cleanText(body.utmTerm,160),
  campaignId:cleanText(body.campaignId,120)||cleanText(body.utmId,160),campaignName:cleanText(body.campaignName,200)||cleanText(body.utmCampaign,160),adsetId:cleanText(body.adsetId,120),adId:cleanText(body.adId,120),adName:cleanText(body.adName,200),
  fbclid:cleanText(body.fbclid,220),fbp:cleanText(body.fbp,180),fbc:cleanText(body.fbc,220),landingPage:cleanText(body.pageUrl,500)||cleanText(body.landingPage,160)};
 if(!studentName||!email||!phone||!isValidEmail(email)||!isValidPhone(phone))return fail(400,'Thiếu thông tin tạo đơn thanh toán.');
 if(!invoice.ok)return fail(400,invoice.message);
 if(!courseSlugs.length&&(!courseSlug||!isValidSlug(courseSlug)))return fail(400,'Khóa học thanh toán không hợp lệ.');
 // Browser retry key; without one each request is a new checkout (Source behaviour).
 const headerKey=request.headers.get('idempotency-key')??'',idempotencyKey=/^[A-Za-z0-9_-]{16,128}$/.test(headerKey)?headerKey:crypto.randomUUID().replace(/-/g,'');
 let leadSource='';
 try{
  const result=await createNativeCheckoutOrder(options.db,{idempotencyKey,studentName,email,phone,courseSlug:courseSlug||undefined,courseSlugs,paymentPlan:paymentPlan||undefined,couponCode:couponCode||undefined,
   leadId:databaseLeadId||null,ipAddress,userAgent,attribution,invoice:invoice.value,
   lead:row=>{const o=nativeRowToPaymentOrder(row);leadSource=determineNativeLeadSource(o,body.landingPage);return {source:leadSource,message:[
    `Mã đơn: ${o.orderCode}`,`Khóa: ${o.courseTitle}`,`Gói: ${paymentPlan||'default'}`,`Số tiền: ${o.amountLabel}`,`Trạng thái: ${o.status}`,
    `Landing: ${cleanText(body.landingPage,120)}`,`URL: ${cleanText(body.pageUrl,500)}`,`Referrer: ${cleanText(body.referrer,500)}`,
    `UTM source: ${cleanText(body.utmSource,120)}`,`UTM medium: ${cleanText(body.utmMedium,120)}`,`UTM campaign: ${cleanText(body.utmCampaign,160)}`,
    `UTM content: ${cleanText(body.utmContent,160)}`,`UTM id: ${cleanText(body.utmId,160)}`,`UTM term: ${cleanText(body.utmTerm,160)}`,
    `campaign_id: ${attribution.campaignId}`,`campaign_name: ${attribution.campaignName}`,`adset_id: ${attribution.adsetId}`,`ad_id: ${attribution.adId}`,
    `ad_name: ${attribution.adName}`,`fbclid: ${attribution.fbclid}`,`IP: ${cleanText(ipAddress,80)}`,`fbp: ${cleanText(body.fbp,180)}`,`fbc: ${cleanText(body.fbc,220)}`,`Lead ID: ${incomingLeadId}`].join('\n')};}},
   {nativeAuthority:options.nativeAuthority,sepay:options.sepay,now:options.now,createOrderCode:options.createOrderCode,createId:options.createId});
  const order=nativeRowToPaymentOrder(result.order),leadId=result.status==='created'?result.leadId:(typeof result.order.lead_id==='string'?result.order.lead_id:null);
  // Side effects only for the first commit; a retry must not resend Meta/Sheets.
  if(result.status==='created'&&options.afterCreate){
   const task=options.afterCreate({order,leadId,incomingLeadId,body,leadSource:leadSource||determineNativeLeadSource(order,body.landingPage),ipAddress,userAgent}).catch(()=>console.warn('[native-checkout] side effects failed'));
   if(options.waitUntil)options.waitUntil(task);else await task;
  }
  return Response.json({ok:true,order,leadId},{headers:privacy});
 }catch(error){
  if(error instanceof NativeCheckoutConflict)return fail(409,'Yêu cầu thanh toán đã được dùng cho đơn khác.');
  if(error instanceof RangeError)return fail(400,'Khóa học thanh toán không hợp lệ.');
  return fail(503,'Không tạo được đơn thanh toán.');
 }
}
