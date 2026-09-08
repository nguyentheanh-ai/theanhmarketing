import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// All network writes are intercepted: never create a real order for this audit.
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const context = await browser.newContext({reducedMotion:'reduce'});
  await context.addCookies([{name:'_fbc',value:'%invalid',url:'http://127.0.0.1:3108'}]);
  let calls = 0;
  await context.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname !== '127.0.0.1') return route.abort();
    if (u.pathname === '/api/orders') {
      calls++;
      assert.equal(route.request().postDataJSON().courseSlug,'bo-agent-kit-x10-hieu-suat-cong-viec');
      await new Promise(resolve=>setTimeout(resolve,300));
      return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,message:'Kết nối chưa thành công. Bạn thử lại giúp mình.'})});
    }
    if (u.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.gtag=(...args)=>{if(args[1]==='ViewContent')throw new Error('Simulated analytics outage');};
  });
  await page.goto('http://127.0.0.1:3108/academy/codex-x10-hieu-suat',{waitUntil:'networkidle'});
  const form = page.locator('#dang-ky');
  await form.locator('[name=studentName]').fill('Kiểm tra giao diện');
  await form.locator('[name=email]').fill('codex-qa@example.invalid');
  await form.locator('[name=phone]').fill('0900000000');
  await form.evaluate(el=>{el.requestSubmit();el.requestSubmit();});
  await page.waitForTimeout(700);
  assert.equal(calls,1,'Malformed tracking cookie must not block registration; double submit sends one request');
  assert.equal(await form.locator('[type=submit]').isEnabled(),true,'Failure allows retry');
  assert.deepEqual(errors,[],'Analytics outage must not crash the landing');
  await form.locator('[type=submit]').click();
  await page.waitForTimeout(700);
  assert.equal(calls,2,'Retry sends exactly one new request');
  console.log(JSON.stringify({malformedCookie:true,analyticsFailure:true,doubleSubmit:true,retry:true,errors}));
} finally { await browser.close(); }
