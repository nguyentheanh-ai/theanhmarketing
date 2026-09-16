import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CODEX_QA_URL || 'http://127.0.0.1:3108';
const folder = process.env.CODEX_QA_OUTPUT || 'reports/codex-floating-navigation-20260916';
await mkdir(folder,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for (const reducedMotion of ['no-preference','reduce']) for (const width of [1440,390,320]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
  await context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin!==base || u.pathname.startsWith('/api/')?route.abort():route.continue();});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/academy/codex-x10-hieu-suat',{waitUntil:'domcontentloaded'});
  await page.locator('.cx-sticky-toc').waitFor();
  const sticky=page.locator('.cx-sticky');const dialog=page.locator('#cx-toc-dialog');
  for (const id of ['gioi-thieu','van-de','thanh-qua-video','noi-dung','buoc-tiep-theo']) {
   await page.locator('#'+id).evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
   await sticky.waitFor({state:'visible'});await page.waitForTimeout(120);
   const box=await sticky.boundingBox();assert.ok(Math.abs(box.y+box.height-900)<2,`${reducedMotion}/${width}/${id}: fixed to viewport`);
  }
  await page.locator('#van-de').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  await page.locator('.cx-sticky-toc').click();await dialog.waitFor({state:'visible'});
  assert.equal(await dialog.locator('nav a').count(),16);
  assert.equal(await dialog.locator('[aria-current=location]').getAttribute('href'),'#van-de');
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<900);
  assert.ok(await dialog.locator('nav').evaluate(el=>el.scrollHeight>el.clientHeight),'Scrollable contents');
  await page.screenshot({path:`${folder}/${width}-${reducedMotion}-open.png`});
  // The native dialog must retain keyboard focus and restore the trigger on Escape.
  await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)));
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await page.locator('.cx-sticky-toc').evaluate(el=>el===document.activeElement),true);
  await page.locator('.cx-sticky-toc').click();
  await dialog.locator('a[href="#thanh-qua-video"]').click();await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(()=>Math.abs(document.getElementById('thanh-qua-video').getBoundingClientRect().top-96)<5);
  await sticky.waitFor({state:'visible'});
  await page.locator('.cx-sticky-toc').click();await dialog.getByRole('button',{name:'Đóng mục lục'}).click();await dialog.waitFor({state:'hidden'});
  await page.locator('.cx-sticky-toc').click();await dialog.locator('.cx-toc-cta').click();
  await sticky.waitFor({state:'hidden'});
  assert.equal(await page.locator('#dang-ky input[name=studentName]').evaluate(el=>el===document.activeElement),true);
  // Regression: keep form input focused and scroll away. The bar must reappear.
  await page.locator('#van-de').evaluate(el=>el.scrollIntoView({behavior:'instant',block:'start'}));
  await sticky.waitFor({state:'visible'});
  await page.screenshot({path:`${folder}/${width}-${reducedMotion}-sticky.png`});
  const metrics=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,formTop:document.getElementById('dang-ky').getBoundingClientRect().top}));
  assert.ok(metrics.scrollWidth<=width);assert.deepEqual(errors,[]);
  results.push({width,reducedMotion,stickyPositions:5,dialogLinks:16,focusTrap:true,escape:true,navigation:true,formHide:true,focusedScrollRestore:true,errors});
  await context.close();
 }
 await writeFile(`${folder}/audit.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}
