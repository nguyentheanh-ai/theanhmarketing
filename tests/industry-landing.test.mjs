import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const read = path => readFileSync(path, 'utf8');
const source = read('services/orderService.ts');
const ast = ts.createSourceFile('orders.ts', source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.flatMap(s => ts.isVariableStatement(s) ? [...s.declarationList.declarations] : []).find(d => d.name.getText(ast) === 'coursePaymentPlans');
const facebookPlans = declaration.initializer.properties.find(p => p.name.getText(ast) === '"facebook-ads-2026"').initializer.getText(ast);
const build = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name.text === 'buildOrderPackage');
const context = vm.createContext({ VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN:'historical-promotion', isVietnamThangThaiLanPromotionActive:()=>false, parseVndAmount:s=>Number(s.replace(/\D/g,'')) });
vm.runInContext(ts.transpile(`const coursePaymentPlans = { 'facebook-ads-2026': ${facebookPlans} }; ${build.getText(ast)}; globalThis.build = buildOrderPackage;`), context);
const course = { slug:'facebook-ads-2026', title:'Facebook Ads', price:'799.000đ' };
test('server package fixes price and fulfills existing Facebook Ads course',()=>{
  const order = context.build([course], 'industry-expert-1290');
  assert.equal(order.amount,1290000); assert.equal(order.courseSlug,course.slug);
  assert.equal(order.courseTitle,'Khóa học quảng cáo chuyển đổi dành cho chuyên gia');
  assert.equal(order.orderItems.length,1); assert.equal(order.orderItems[0].price,1290000);
  assert.equal(context.build([{...course,price:'1đ'}],'industry-expert-1290').amount,1290000);
});
test('new plan cannot be used for another course, multiple courses or unknown plan',()=>{
  for (const courses of [[{...course,slug:'other'}],[course,course],[]]) assert.throws(()=>context.build(courses,'industry-expert-1290'));
  assert.throws(()=>context.build([course],'industry-expert-1'));
});
test('existing Facebook plans retain server amounts',()=>{
  for (const [plan,amount] of [['video',399000],['zoom-kit',799000],['advanced-zoom',1299000],['zoom-kit-ebook-299',1098000]]) assert.equal(context.build([course],plan).amount,amount);
});
function checkout(fetcher, options={}) {
  const handlers = {}; const sent=[]; const redirects=[];
  const button={innerHTML:'Thanh toán',disabled:false}; const status={dataset:{},textContent:''};
  const form={ elements:Object.fromEntries(Object.entries({studentName:' Test ',email:'test@example.invalid',phone:'0900000000'}).map(([k,value])=>[k,{value}])), querySelector:()=>button, reportValidity:()=>options.valid!==false, addEventListener:(e,fn)=>handlers[e]=fn, setAttribute:()=>{} };
  const location={ hostname:'127.0.0.1', href:'http://127.0.0.1/academy/quang-cao-chuyen-gia?utm_source=test&fbclid=click123', search:'?utm_source=test&fbclid=click123', assign:url=>redirects.push(url) };
  const win={location,getInvoiceRequest:()=>({requested:true,taxCode:'TEST'})};
  if(options.brokenInvoice) delete win.getInvoiceRequest;
  if(options.brokenAnalytics) win.fbq=()=>{throw Error('analytics blocked')};
  const doc={getElementById:id=>id==='payment-form'?form:status, querySelector:()=>null,cookie:'_fbp=fb.1.test',referrer:'https://example.invalid/'};
  vm.runInNewContext(read('public/industry-ads/checkout.js'),{window:win,document:doc,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async(url,init)=>{sent.push({url,...init,body:JSON.parse(init.body)});return fetcher(url,init)}});
  return { submit:()=>handlers.submit({preventDefault(){}}),sent,redirects,button,status };
}
test('checkout sends invoice and attribution, uses server order code, survives broken analytics',async()=>{
  const c=checkout(async()=>({ok:true,json:async()=>({order:{orderCode:'TAM-TEST'}})}),{brokenAnalytics:true});
  await c.submit(); assert.equal(c.sent.length,1);
  const p=c.sent[0].body; assert.equal(c.sent[0].url,'/api/orders');assert.equal(p.paymentPlan,'industry-expert-1290');assert.equal(p.courseSlug,'facebook-ads-2026');assert.equal(p.utmSource,'test');assert.equal(p.fbclid,'click123');assert.equal(p.fbp,'fb.1.test');assert.match(p.fbc,/click123$/);assert.equal(p.invoice.requested,true);assert.equal(p.studentName,'Test');assert.equal('amount' in p,false);assert.deepEqual(c.redirects,['/thanh-toan/TAM-TEST']);
});
test('double submit creates only one request',async()=>{
  let resolve;const response=new Promise(r=>resolve=r);const c=checkout(()=>response);
  const first=c.submit();await c.submit();assert.equal(c.sent.length,1);
  resolve({ok:true,json:async()=>({order:{orderCode:'TAM-TEST'}})});await first;
});
test('invalid form or missing invoice helper cannot create order',async()=>{
  for(const options of [{valid:false},{brokenInvoice:true}]){const c=checkout(()=>{throw Error('must not call')},options);await c.submit();assert.equal(c.sent.length,0);assert.equal(c.redirects.length,0);assert.equal(c.button.disabled,false)}
});
test('server error, malformed response and timeout restore form without redirect',async()=>{
  for(const fetcher of [async()=>({ok:false,json:async()=>({message:'Không hợp lệ'})}),async()=>({ok:true,json:async()=>({})}),async()=>{const e=Error('timeout');e.name='AbortError';throw e}]){const c=checkout(fetcher);await c.submit();assert.equal(c.button.disabled,false);assert.equal(c.status.dataset.error,'true');assert.equal(c.redirects.length,0)}
});
test('all local assets and anchor targets resolve; Vietnamese stays intact',()=>{
 const html=read('public/industry-ads/chuyen-gia.html');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 for(const [,href] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(href),href);
 for(const [,path] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g))assert.ok(existsSync('public'+path),path);
 assert.doesNotMatch(html,/�|Ã¡|Ä‘|Æ°/);assert.match(html,/1\.290\.000/);
 assert.match(read('next.config.ts'),/source: "\/academy\/quang-cao-chuyen-gia", destination: "\/industry-ads\/chuyen-gia.html"/);
});
function loadTs(file) {
 const compiled=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};new Function('exports','module','require',compiled)(mod.exports,mod,spec=>{
   if(spec==='@/lib/notifications/email-link-bridge')return loadTs('lib/notifications/email-link-bridge.ts');
   if(spec==='@/lib/agent-kit-preorder')return loadTs('lib/agent-kit-preorder.ts');
   throw new Error('Unexpected dependency: '+spec);
 });return mod.exports;
}
test('success email keeps the expert product, amount and existing course access',()=>{
 const {buildPaymentSuccessEmailPayload}=loadTs('lib/notifications/payment-success-email.ts');
 const order={...context.build([course],'industry-expert-1290'),id:'test',orderCode:'TAM-TEST',studentName:'Test',email:'test@example.invalid',phone:'0900000000',amountLabel:'1.290.000đ',currency:'VND',status:'paid',paymentPlan:'industry-expert-1290',paymentMethod:'sepay'};
 const result=buildPaymentSuccessEmailPayload(order);
 assert.match(result.html,/1\.290\.000/);assert.match(result.html,/Khóa học quảng cáo chuyển đổi dành cho chuyên gia/);assert.match(result.html,/vao-khoa-hoc/);assert.match(result.html,/Quyền truy cập khóa Facebook Ads Master 2026/);
 assert.doesNotMatch(result.html,/1 buổi Zoom chuyên sâu/);
});
test('campaign dashboard uses one bounded snapshot and reconciles its displayed totals',()=>{
 const data=JSON.parse(read('public/industry-ads/campaign-snapshot.json'));
 const html=read('public/industry-ads/chuyen-gia.html');
 const embedded=JSON.parse(html.match(/<script type="application\/json" id="campaign-data">(.*?)<\/script>/s)[1]);
 assert.deepEqual(embedded,data);
 assert.equal(data.rows.reduce((n,row)=>n+row.purchases,0),64);
 const spend=data.rows.reduce((n,row)=>n+row.spend,0);
 assert.equal(spend,28513898);assert.equal(Math.round(spend/64),445530);
 assert.deepEqual(data.rows.map(r=>Math.round(r.spend/r.purchases)),[351705,551146,575700]);
 assert.ok(existsSync('public'+data.source));
});
