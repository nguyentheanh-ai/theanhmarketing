import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output=fileURLToPath(new URL('../reports/codex-landing-20260908/motion/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'&&!new URL(route.request().url()).pathname.startsWith('/api/')?route.continue():route.abort());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3108/academy/codex-x10-hieu-suat',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.cx-motion').count(),8);
  const motion=[];
  for(const kind of ['video','web','ads','research','social','finance','mail','plan']){
    const scene=page.locator(`.cx-motion-${kind}`);await scene.scrollIntoViewIfNeeded();
    const animations=await scene.evaluate(el=>el.getAnimations({subtree:true}).length);assert.ok(animations>0,kind);
    const before=await scene.screenshot();await page.waitForTimeout(600);const after=await scene.screenshot();
    assert.notDeepEqual(before,after,`${kind}: visible foreground must change`);
    motion.push({kind,animations,framesDiffer:true});
    await scene.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=2300;}));
    await scene.screenshot({path:`${output}${kind}.png`});
    await scene.evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.play()));
  }
  await page.locator('#cx-motion-pause').check();
  assert.equal(await page.locator('.cx-flying-mail').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
  await page.locator('#cx-motion-pause').uncheck();
  assert.equal(await page.locator('.cx-flying-mail').evaluate(el=>getComputedStyle(el).animationPlayState),'running');
  const mail=page.locator('.cx-motion-mail');await mail.scrollIntoViewIfNeeded();
  for(const t of [400,1800,3000]){
    await mail.evaluate((el,t)=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=t;}),t);
    await mail.screenshot({path:`${output}mail-${t}.png`});
  }
  for(const width of [1440,768,390,320]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    for(const kind of ['mail','plan'])await page.locator(`.cx-outcome-${kind}`).screenshot({path:`${output}${width}-${kind}-card.png`,style:'.cx-sticky{visibility:hidden!important}'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.cx-motion').evaluateAll(nodes=>nodes.reduce((sum,n)=>sum+n.getAnimations({subtree:true}).length,0)),0);
  assert.deepEqual(errors,[]);
  const report={motion,pause:true,reducedMotion:true,viewports:[1440,768,390,320],errors};
  await writeFile(`${output}audit.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
