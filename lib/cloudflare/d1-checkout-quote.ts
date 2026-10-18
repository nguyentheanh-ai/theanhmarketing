import type {AuthDatabase} from './d1-auth-core';
import {readD1StudentPublicCatalog} from './d1-student-public-catalog';
import {getFixedPaymentPackage,buildOrderPackage} from '@/lib/orders/payment-package';
import {applyOrderCoupon} from '@/lib/orders/coupon';
import {AGENT_KIT_SLUG,assertAgentKitPaymentPlanAvailable} from '@/lib/agent-kit-preorder';
import {isValidSlug} from '@/lib/security/validation';
type Selection={courseSlug?:string;courseSlugs?:string[];paymentPlan?:string;couponCode?:string};
function selection(value:unknown):Selection{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid checkout selection');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['courseSlug','courseSlugs','paymentPlan','couponCode'].includes(k)))throw Error('Invalid checkout selection');
 if(v.courseSlug!==undefined&&(typeof v.courseSlug!=='string'||!isValidSlug(v.courseSlug)))throw Error('Invalid checkout selection');
 if(v.courseSlugs!==undefined&&(!Array.isArray(v.courseSlugs)||v.courseSlugs.length>20||v.courseSlugs.some(s=>typeof s!=='string'||!isValidSlug(s))))throw Error('Invalid checkout selection');
 for(const key of ['paymentPlan','couponCode'])if(v[key]!==undefined&&(typeof v[key]!=='string'||v[key].length>120))throw Error('Invalid checkout selection');
 return v as Selection;
}
// Read/quote only, not mounted as checkout and never creates a lead/order or
// sends a provider event. The eventual INSERT still needs its own atomic price
// publication/authority check; this read must not be treated as a write lease.
export async function readD1CheckoutQuote(db:Pick<AuthDatabase,'first'>,input:unknown,options:{now?:number}={}){
 const value=selection(input),catalog=await readD1StudentPublicCatalog(db,options);
 const requested=value.courseSlugs?.length?value.courseSlugs:value.courseSlug?[value.courseSlug]:[];
 const fixed=getFixedPaymentPackage({courseSlug:requested.length===1?requested[0]:undefined,paymentPlan:value.paymentPlan});
 const courses=fixed?[]:requested.map(slug=>{const course=catalog.courses.find(c=>c.slug===slug);if(!course)throw Error('Unknown checkout product');return course;});
 if(!fixed&&!courses.length)throw Error('Empty checkout selection');
 if(requested.includes(AGENT_KIT_SLUG)&&value.paymentPlan)assertAgentKitPaymentPlanAvailable(value.paymentPlan);
 const quote=applyOrderCoupon(fixed??buildOrderPackage(courses,value.paymentPlan),value.paymentPlan,value.couponCode);
 if(!Number.isSafeInteger(quote.amount)||quote.amount<=0||quote.orderItems.some(i=>!Number.isSafeInteger(i.price)||i.price<0))throw Error('Invalid checkout amount');
 return quote;
}
