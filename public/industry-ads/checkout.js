(function () {
  'use strict';
  const form = document.getElementById('payment-form');
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('form-status');
  const originalButton = button.innerHTML;
  let submitting = false;
  const cookie = (name) => {
    try { return decodeURIComponent((document.cookie.split('; ').find((entry) => entry.startsWith(name + '=')) || '').slice(name.length + 1)); }
    catch { return ''; }
  };
  const track = (name, data, eventID) => {
    try { if (typeof window.fbq === 'function') window.fbq('trackSingle', '1315653423712065', name, data, eventID ? { eventID } : undefined); }
    catch { /* Analytics must not block checkout. */ }
  };
  // Reuse the Facebook Ads pixel only on the production domain.
  if (['theanhmarketing.com', 'www.theanhmarketing.com'].includes(window.location.hostname)) {
    if (!window.fbq) {
      const fbq = function () { if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments); };
      fbq.queue = []; fbq.loaded = true; fbq.version = '2.0';
      window.fbq = fbq; window._fbq = fbq;
      const script = document.createElement('script'); script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
      fbq('init', '1315653423712065');
    }
    track('PageView');
    track('ViewContent', { content_ids: ['facebook-ads-2026'], content_name: 'Khóa học quảng cáo chuyển đổi dành cho chuyên gia', content_type: 'course', currency: 'VND', value: 1290000 });
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting || !form.reportValidity()) return;
    const value = (key) => String(form.elements[key].value || '').trim();
    const params = new URLSearchParams(window.location.search);
    const attribution = {};
    Object.entries({ utmSource:'utm_source', utmMedium:'utm_medium', utmCampaign:'utm_campaign', utmContent:'utm_content', utmId:'utm_id', utmTerm:'utm_term', campaignId:'campaign_id', campaignName:'campaign_name', adsetId:'adset_id', adId:'ad_id', adName:'ad_name' }).forEach(([key, query]) => { attribution[key] = params.get(query) || ''; });
    const fbclid = params.get('fbclid') || '';
    const controller = new AbortController();
    let timeout;
    submitting = true; button.disabled = true; form.setAttribute('aria-busy', 'true');
    button.textContent = 'Đang tạo mã thanh toán…'; status.dataset.error = 'false';
    status.textContent = 'Vui lòng đợi trong giây lát.';
    try {
      if (typeof window.getInvoiceRequest !== 'function') throw new Error('Biểu mẫu chưa tải đầy đủ. Vui lòng tải lại trang trước khi đăng ký.');
      timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ studentName:value('studentName'), email:value('email'), phone:value('phone'), courseSlug:'facebook-ads-2026', paymentPlan:'industry-expert-1290', invoice:window.getInvoiceRequest(form), landingPage:'academy/quang-cao-chuyen-gia', pageUrl:window.location.href, referrer:document.referrer, ...attribution, fbclid, fbp:cookie('_fbp'), fbc:cookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : '') })
      });
      const payload = await response.json();
      if (!response.ok || !payload.order || !payload.order.orderCode) throw new Error(payload.message || 'Chưa tạo được mã thanh toán. Vui lòng kiểm tra thông tin và thử lại.');
      const order = payload.order;
      track('Lead', { content_ids:['facebook-ads-2026'], currency:'VND', value:1290000 }, order.orderCode);
      status.textContent = 'Đã tạo đơn. Đang chuyển đến trang thanh toán…';
      window.location.assign('/thanh-toan/' + encodeURIComponent(order.orderCode));
    } catch (error) {
      status.dataset.error = 'true';
      status.textContent = error.name === 'AbortError' ? 'Kết nối mất nhiều thời gian. Vui lòng kiểm tra email xem đã có mã thanh toán trước khi gửi lại.' : (error.message || 'Kết nối gián đoạn. Vui lòng kiểm tra email trước khi thử lại.');
      button.innerHTML = originalButton; button.disabled = false; submitting = false;
    } finally {
      clearTimeout(timeout); form.setAttribute('aria-busy', 'false');
    }
  });
  const sticky = document.querySelector('.mobile-cta');
  if (sticky && typeof IntersectionObserver === 'function') {
    new IntersectionObserver((entries) => { sticky.hidden = entries[0].isIntersecting; }, { threshold: 0 }).observe(form);
  }
})();
