import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const target = new URL(process.argv[2] || 'http://127.0.0.1:3108/academy/codex-x10-hieu-suat');
assert.equal(target.pathname,'/academy/codex-x10-hieu-suat');
const output=fileURLToPath(new URL('../reports/codex-landing-20260908/release/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={url:target.href,viewports:[],assets:[],links:[],errors:[],writesBlocked:0};
try {
  const context=await browser.newContext({reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    const request=route.request();const u=new URL(request.url());
    if(!['GET','HEAD'].includes(request.method())){report.writesBlocked++;return route.abort();}
    if(u.origin!==target.origin && !['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.abort();
    if(u.pathname.startsWith('/api/'))return route.abort();
    return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));
  const response=await page.goto(target.href,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  await page.waitForFunction(()=>!document.querySelector('#dang-ky [type=submit]')?.disabled);
  assert.match(await page.title(),/Codex/);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.theanhmarketing.com/academy/codex-x10-hieu-suat');
  assert.equal(await page.locator('.cx main>section').count(),15);
  assert.equal(await page.locator('.cx-motion').count(),8);
  assert.equal(await page.locator('.cx video').count(),7);
  const copy=await page.locator('.cx').innerText();
  assert.doesNotMatch(copy,/value stack|pain point|readiness|handoff|placeholder|TODO|evidence log|owner|\bQA\b/i);
  for(const marker of ['80% công việc','X10 hiệu suất','20+','gửi email','lên kế hoạch'])assert.ok(copy.toLowerCase().includes(marker.toLowerCase()),marker);
  const preorder=Date.now()<Date.parse('2026-09-15T17:00:00Z');
  for(const amount of preorder?['999.000đ','799.000đ','399.000đ','400.000đ']:['999.000đ'])assert.ok(copy.includes(amount),amount);
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(async()=>{await document.fonts.ready;for(const img of document.querySelectorAll('.cx img')){img.loading='eager';await img.decode().catch(()=>{});}});
    const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,badImages:[...document.querySelectorAll('.cx img')].filter(i=>!i.naturalWidth).map(i=>i.src)}));
    assert.equal(state.scrollWidth,width);assert.deepEqual(state.badImages,[]);report.viewports.push(state);
    await page.screenshot({path:`${output}${target.hostname}-${width}.png`,fullPage:true});
  }
  await page.locator('#gioi-thieu').scrollIntoViewIfNeeded();
  await page.locator('.cx-sticky a').click();
  assert.equal(await page.locator('#dang-ky [name=studentName]').evaluate(el=>el===document.activeElement),true);
  await page.locator('.cx-sticky').waitFor({state:'detached'});
  await page.locator('#dang-ky [name=studentName]').blur();
  await page.locator('.cx-choice').getByRole('button',{name:'Freelancer',exact:true}).click();
  assert.match(await page.locator('.cx-audience-body').innerText(),/Nhận thêm dự án/);
  const resources=await page.locator('.cx').evaluate(el=>({assets:[...new Set([...el.querySelectorAll('img,video source')].map(e=>e.getAttribute('src')))],links:[...new Set([...el.querySelectorAll('a[href^="/"]')].map(e=>e.getAttribute('href')))]}));
  for(const kind of ['assets','links'])for(const path of resources[kind]){
    const res=await fetch(new URL(path,target.origin),{method:'HEAD',redirect:'follow'});
    assert.equal(res.status,200,`${kind}: ${path}`);report[kind].push({path,status:res.status});
  }
  assert.deepEqual(report.errors,[]);
  await writeFile(`${output}${target.hostname}.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
