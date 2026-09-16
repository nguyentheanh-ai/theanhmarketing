import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function mount(file, exportName, props={}) {
 const states=[];let cursor=0;const requests=[],events=[],redirects=[];
 const jsx=(type,props)=>({type,props:props||{}});
 const modules={
  react:{useState:initial=>{const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],value=>{states[index]=value}]},useRef:initial=>{const index=cursor++;return states[index]??= {current:initial}},useEffect:()=>{}},
  'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},
  '@/lib/agent-kit-preorder':{AGENT_KIT_SLUG:'bo-agent-kit-x10-hieu-suat-cong-viec'},
  './offer':{CODEX_AGENT_KIT_OFFER:{price:990000,originalPrice:2599000,paymentPlan:'agent-kit-offer-990'}},
  '@/lib/tracking/client-attribution':{getClientAttribution:()=>({utmSource:'test'})},
  '@/lib/tracking/events':{trackMarketingEvent:(...args)=>events.push(args)},
  '@/components/payment/invoice-request-fields':{InvoiceRequestFields:'invoice'},
  '@/lib/orders/invoice':{invoiceInputFromFormData:()=>({requested:false})},
  './outcomes':{OfferIcon:'icon',outcomes:[]},
  '../checkout.js':{getClientAttribution:()=>({utmSource:'test'}),createLeadId:()=> 'test',markInitiateCheckoutDispatched:()=>{},trackOnce:()=>{},trackMarketingEvent:(...args)=>events.push(args),buildOrderPayload:({formData,paymentPlan})=>({studentName:formData.get('studentName'),paymentPlan})},
 };
 let response={ok:true,order:{orderCode:'TAMLOCALTEST',amount:792000}};
 const context={exports:{},require:name=>{assert.ok(modules[name],name);return modules[name]},FormData:class {get(name){return {studentName:'Local Test',email:'local@example.invalid',phone:'0900000000'}[name]}},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:response.ok,json:async()=>response}},crypto:{randomUUID:()=> 'local'},document:{referrer:''},window:{location:{href:'http://localhost',assign:url=>redirects.push(url)},sessionStorage:{setItem:()=>{}}}};
 vm.runInNewContext(ts.transpile(readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}),context);
 const render=()=>{cursor=0;return context.exports[exportName](props)};
 return {render,requests,events,redirects,setResponse:value=>{response=value}};
}
function nodes(tree,predicate,result=[]) {if(!tree || typeof tree!=='object')return result;if(Array.isArray(tree)){tree.forEach(child=>nodes(child,predicate,result));return result}if(predicate(tree))result.push(tree);nodes(tree.props?.children,predicate,result);return result}
const text=tree=>{if(tree===null||tree===undefined||typeof tree==='boolean')return '';if(typeof tree!=='object')return String(tree);if(Array.isArray(tree))return tree.map(text).join('');return text(tree.props?.children)};
for(const [name,file,exportName,props] of [
 ['Codex','app/academy/codex-x10-hieu-suat/sections.tsx','CodexOffer',{}],
 ['Bộ Kit','docs/landing-source/doi-ngu-nhan-su-ai/RegistrationForm.jsx','default',{product:{name:'Agent Kit',payNowVnd:990000,paymentPlan:'agent-kit-offer-990',purchaseCta:'Tiếp tục thanh toán'}}]
]) {
 test(`${name}: input, invalid rejection, normalized coupon, amount, payload and redirect`,async()=>{
  const app=mount(file,exportName,props);
  const input=tree=>nodes(tree,node=>node.type==='input'&&node.props.name==='couponCode')[0];
  const form=tree=>nodes(tree,node=>node.type==='form')[0];
  let tree=app.render();assert.ok(input(tree));
  input(tree).props.onChange({target:{value:'BAD'}});tree=app.render();
  await form(tree).props.onSubmit({preventDefault(){},currentTarget:{}});assert.equal(app.requests.length,0);assert.match(text(app.render()),/không hợp lệ/);
  input(app.render()).props.onChange({target:{value:' hocvien20 '}});tree=app.render();assert.match(text(tree),/792.000đ/);assert.match(text(tree),/198.000đ/);
  await form(tree).props.onSubmit({preventDefault(){},currentTarget:{}});
  assert.equal(app.requests[0].couponCode,'HOCVIEN20');assert.equal(app.requests[0].paymentPlan,'agent-kit-offer-990');assert.equal(app.redirects[0],'/thanh-toan/TAMLOCALTEST');
  assert.equal(app.events.filter(([event])=>event==='InitiateCheckout')[0][1].value,792000);
 });
 test(`${name}: clearing coupon restores normal checkout and API error permits retry`,async()=>{
  const app=mount(file,exportName,props);const getInput=()=>nodes(app.render(),node=>node.props?.name==='couponCode')[0];
  getInput().props.onChange({target:{value:'HOCVIEN20'}});getInput().props.onChange({target:{value:''}});
  assert.doesNotMatch(text(app.render()),/792.000đ/);
  app.setResponse({ok:false,message:'Thử lại'});
  await nodes(app.render(),node=>node.type==='form')[0].props.onSubmit({preventDefault(){},currentTarget:{}});
  assert.equal(app.requests[0].couponCode,'');assert.match(text(app.render()),/Thử lại/);
  assert.equal(nodes(app.render(),node=>node.type==='button'&&node.props.type==='submit')[0].props.disabled,false);
 });
}
