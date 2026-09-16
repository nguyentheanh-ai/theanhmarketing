import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../reports/codex-sync-20260916/', import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={viewports:[],interactions:[],sections:[],errors:[]};
try {
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.hostname!=='127.0.0.1') return route.abort();
    if(u.pathname === '/api/orders') { const data = route.request().postDataJSON(); assert.equal(data.paymentPlan, 'agent-kit-offer-990'); assert.equal(data.courseSlug, 'bo-agent-kit-x10-hieu-suat-cong-viec'); assert.equal(data.landingPage, 'academy/codex-x10-hieu-suat'); }
    if(u.pathname.startsWith('/api/')) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'Chưa tạo được mã thanh toán. Bạn thử lại giúp mình.'})});
    return route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-16T06:00:00Z')});
  await page.goto('http://127.0.0.1:3108/academy/codex-x10-hieu-suat?utm_source=qa&utm_campaign=codex',{waitUntil:'networkidle'});
  await page.locator('.cx-order button[type=submit]').waitFor();
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.images){img.loading='eager';await img.decode().catch(()=>{});}});
    const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sections:document.querySelectorAll('.cx main>section').length,brokenImages:[...document.querySelectorAll('.cx img')].filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src),badLinks:[...document.querySelectorAll('.cx a[href^="#"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).map(a=>a.getAttribute('href'))}));
    assert.ok(metrics.scrollWidth<=width,`overflow ${width}: ${metrics.scrollWidth}`);
    assert.equal(metrics.sections,17);assert.deepEqual(metrics.brokenImages,[]);assert.deepEqual(metrics.badLinks,[]);
    report.viewports.push(metrics);
    await page.screenshot({path:`${output}${width}-full.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const section of await page.locator('.cx main>section').all()){
    const id=await section.getAttribute('id');
    await section.screenshot({path:`${output}section-${id}.png`,style:'.cx-sticky{visibility:hidden!important}'});
    report.sections.push({id,title:await section.locator('h1,h2').first().innerText()});
  }
  for(const width of [390,320]) {
    await page.setViewportSize({width,height:1000});
    for(const id of ['gioi-thieu','cach-lam','van-de','ung-dung','noi-dung','hoc-phi']) {
      await page.locator(`#${id}`).screenshot({path:`${output}${width}-${id}.png`,style:'.cx-sticky{visibility:hidden!important}'});
    }
  }
  for(const video of await page.locator('.cx video').all()) {
    await video.evaluate(v=>{const parent=v.closest('details');if(parent)parent.open=true;});
    await video.scrollIntoViewIfNeeded();
    await video.evaluate(async v=>{v.load();await new Promise((resolve,reject)=>{v.addEventListener('loadeddata',resolve,{once:true});v.addEventListener('error',()=>reject(new Error('Video cannot load')),{once:true});});await v.play();});
    await page.waitForFunction(v=>v.currentTime>0 && v.videoWidth>0,await video.elementHandle(),{timeout:15000});
    await video.evaluate(v=>v.pause());
  }
  report.interactions.push('All local proof videos decode and play.');
  await page.evaluate(()=>document.querySelectorAll('.cx details').forEach(x=>x.open=false));
  await page.locator('#gioi-thieu').scrollIntoViewIfNeeded();
  await page.locator('.cx-sticky').waitFor({state:'visible'});
  assert.match(await page.locator('.cx-sticky').innerText(),/990.000đ/);
  await page.locator('.cx-sticky a[href="#dang-ky"]').click();
  await page.locator('.cx-sticky').waitFor({state:'detached'});
  assert.equal(await page.locator('#dang-ky input[name=studentName]').evaluate(x=>x===document.activeElement),true);
  assert.match(await page.locator('.cx-price-comparison').innerText(),/Giá gốc/);
  assert.match(await page.locator('.cx-price-comparison').innerText(),/2.599.000đ/);
  await page.locator('#dang-ky input[name=studentName]').blur();
  await page.locator('#gioi-thieu').scrollIntoViewIfNeeded();
  await page.locator('.cx-sticky').waitFor({state:'visible'});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    await page.screenshot({path:`${output}${width}-sticky.png`});
    const bounds=await page.locator('.cx-sticky').boundingBox();
    assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width);
    const toc = page.locator('.cx-sticky-toc');
    const signup = page.locator('.cx-sticky-actions .cx-btn');
    const tocBounds = await toc.boundingBox();
    const signupBounds = await signup.boundingBox();
    assert.ok(Math.abs((tocBounds.y+tocBounds.height/2)-(signupBounds.y+signupBounds.height/2))<2);
    assert.ok(tocBounds.x+tocBounds.width<=signupBounds.x);
    await toc.click();
    await page.waitForFunction(()=>Math.abs(document.getElementById('muc-luc').getBoundingClientRect().top)<200);
    await page.locator('#gioi-thieu').scrollIntoViewIfNeeded();
  }
  report.interactions.push('Sticky CTA shows correct price, focuses registration, hides at form, and fits 320/390/1440.');
  const visibleCopy=await page.locator('.cx').innerText();
  assert.doesNotMatch(visibleCopy,/value stack|pain point|readiness|handoff|placeholder|TODO|evidence log|owner|\bQA\b/i);
  await page.setViewportSize({width:1440,height:1000});
  for(const name of ['Marketer','Freelancer','Nhân viên văn phòng']){
    await page.locator('.cx-choice').getByRole('button',{name,exact:true}).click();
    assert.equal(await page.locator('.cx-choice').getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
  }
  assert.match(await page.locator('.cx-audience-body').innerText(),/Hoàn thành báo cáo/);
  report.interactions.push('Three audience panels change tasks, request, result and review.');
  assert.equal(await page.locator('.cx-outcome-card').count(),8);
  assert.equal(await page.locator('.cx-offer-outcomes>div').count(),8);
  assert.equal(await page.locator('.cx-outcome-card .cx-icon-tile svg').count(),8);
  const sectionOrder=await page.locator('.cx main>section').evaluateAll(nodes=>nodes.map(x=>x.id));
  assert.deepEqual(sectionOrder.slice(0,5),['gioi-thieu','muc-luc','cach-lam','van-de','ung-dung']);
  report.interactions.push('Eight buyer outcomes and matching offer benefits; result-first section order and icons.');
  await page.locator('.cx-work-detail>summary').click();
  await page.getByLabel('Chọn công việc minh họa').selectOption('1');
  await page.getByRole('button',{name:'Xem bước tiếp theo →'}).click();
  await page.getByRole('button',{name:'Xem bước tiếp theo →'}).click();
  assert.match(await page.locator('.cx-demo-content').innerText(),/giá, thời hạn/);
  report.interactions.push('Demo selection and three steps work.');
  await page.locator('.cx-work-detail>summary').click();
  await page.locator('#cx-hours').fill('20');await page.locator('#cx-percent').fill('80');
  assert.match(await page.locator('.cx-calculator-result').innerText(),/16/);
  assert.match(await page.locator('.cx-calculator-result').innerText(),/5 lần/);
  report.interactions.push('Calculator: 20 hours at 80% = 16 saved, 4 remaining, 5x.');
  for(const details of await page.locator('.cx details').all()){
    await details.locator('summary').click();assert.equal(await details.getAttribute('open'),'');
    await details.locator('summary').click();assert.equal(await details.getAttribute('open'),null);
  }
  report.interactions.push('All curriculum and FAQ disclosures open and close.');
  const form=page.locator('#dang-ky');
  await form.locator('[name=studentName]').fill('Kiểm tra giao diện');
  await form.locator('[name=email]').fill('codex-qa@example.invalid');
  await form.locator('[name=phone]').fill('0900000000');
  await form.getByRole('checkbox').check();
  await form.locator('[name=invoiceTaxCode]').fill('0101234567');
  await form.locator('[name=invoiceCompanyName]').fill('Đơn vị kiểm thử');
  await form.locator('[name=invoiceCompanyAddress]').fill('Địa chỉ kiểm thử');
  await form.locator('[name=invoiceEmail]').fill('invoice@example.invalid');
  let payload;let calls=0;
  await page.route('**/api/orders',async route=>{calls++;payload=route.request().postDataJSON();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'Chưa tạo được mã thanh toán. Bạn thử lại giúp mình.'})});});
  await form.getByRole('button',{name:/Đăng ký · 990/}).click();
  await page.getByRole('alert').waitFor();
  assert.equal(payload.courseSlug,'bo-agent-kit-x10-hieu-suat-cong-viec');
  assert.equal(payload.paymentPlan,'agent-kit-offer-990');
  assert.equal(payload.landingPage,'academy/codex-x10-hieu-suat');
  assert.equal(payload.utmSource,'qa');assert.equal(payload.invoice.requested,true);
  assert.equal(await form.getByRole('button',{name:/Đăng ký · 990/}).isEnabled(),true);
  report.interactions.push('Mocked failure recovers; product/plan/attribution/invoice payload correct.');
  assert.equal(calls,1);
  await page.route('**/thanh-toan/MOCKCODEX',route=>route.fulfill({contentType:'text/html',body:'<p>Mock checkout</p>'}));
  await page.unroute('**/api/orders');
  await page.route('**/api/orders',async route=>{payload=route.request().postDataJSON();await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,order:{orderCode:'MOCKCODEX'}})});});
  await form.getByRole('button',{name:/Đăng ký · 990/}).click();
  await page.waitForURL('**/thanh-toan/MOCKCODEX');
  assert.equal(payload.paymentPlan,'agent-kit-offer-990');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('tam:initiate-checkout:MOCKCODEX')),'1');
  report.interactions.push('Mocked success redirects to existing checkout; checkout event dedup marker set.');
  assert.deepEqual(report.errors,[]);
  await writeFile(`${output}browser-audit.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
