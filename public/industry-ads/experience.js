(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const animate = (el) => {
    if (!el || reduced.matches || typeof el.animate !== 'function') return;
    el.animate([{ opacity: .45, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 550, easing: 'cubic-bezier(.2,.7,.2,1)' });
  };
  const activate = (selector, button) => document.querySelectorAll(selector).forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  const money = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed'); animate(entry.target); observer.unobserve(entry.target);
    }), { threshold: .08 });
    document.querySelectorAll('.section-intro,.dashboard,.pain-photo,.pain-stories article,.audience-grid article,.method-steps li,.document-frame,.showcase-grid article,.feedback-grid figure,.mentor-grid,.prep-list article').forEach(el => observer.observe(el));
  }
  const progress = document.createElement('div'); progress.className = 'read-progress'; progress.setAttribute('aria-hidden', 'true'); document.body.append(progress);
  let pending = false;
  const readProgress = () => { const extent = document.documentElement.scrollHeight - innerHeight; progress.style.transform = 'scaleX(' + (extent > 0 ? scrollY / extent : 0) + ')'; pending = false; };
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(readProgress); } }, { passive: true });
  addEventListener('resize', readProgress); readProgress();

  const rateInput = document.getElementById('conversion-rate');
  if (rateInput) {
    rateInput.addEventListener('input', () => {
      const rate = Math.min(15, Math.max(1, Number(rateInput.value) || 1));
      const leads = 1000 * rate / 100;
      document.getElementById('conversion-label').textContent = rate + '%';
      document.getElementById('model-leads').textContent = String(leads);
      document.getElementById('model-rate').textContent = rate + '% người xem trang';
      document.getElementById('model-cpl').textContent = money(3000000 / leads);
      // Stage width is illustrative; the numerical conversion ratio is stated explicitly.
    });
  }
  const snapshot = JSON.parse(document.getElementById('campaign-data').textContent);
  document.querySelectorAll('[data-chart]').forEach(button => button.addEventListener('click', () => {
    activate('[data-chart]', button);
    const cpa = button.dataset.chart === 'cpa';
    const values = snapshot.rows.map(row => cpa ? row.spend / row.purchases : row.purchases);
    const max = Math.max(...values);
    document.getElementById('campaign-chart-title').textContent = cpa ? 'Chi phí / lượt mua theo chiến dịch' : 'Lượt mua theo chiến dịch';
    document.querySelectorAll('.bar-row').forEach((row, index) => {
      row.querySelector('i').style.setProperty('--bar', (values[index] / max * 100) + '%');
      row.querySelector('strong').textContent = cpa ? money(values[index]) : String(values[index]);
    });
  }));
  const events = {
    view: ['Khách mở landing','Trang tải thành công','PageView','Chỉ gửi khi trang được tải. Một lượt xem trang chưa thể hiện nhu cầu tư vấn.','Đúng Dataset, đúng URL và có sự kiện nhận được trong công cụ kiểm tra.'],
    lead: ['Khách gửi form','Thông tin được tiếp nhận','Lead','Ghi nhận sau khi form gửi thành công. Nhấn nút nhưng gửi lỗi không phải một lead hoàn tất.','Đối chiếu sự kiện với form đã nhận. Nếu browser và server cùng gửi Lead, cần chung mã sự kiện để chống trùng.'],
    purchase: ['Thanh toán xác nhận','Giao dịch được xác thực','Purchase','Chỉ ghi nhận mua hàng sau xác nhận thanh toán. Mở QR hoặc tạo đơn chưa phải thanh toán thành công.','Đối chiếu số tiền, tiền tệ, mã đơn và trạng thái trả tiền; tránh gửi lặp khi khách tải lại trang.']
  };
  document.querySelectorAll('[data-event]').forEach(button => button.addEventListener('click', () => {
    activate('[data-event]', button);
    ['event-action','event-trigger','event-name','event-condition','event-check'].forEach((id, i) => { document.getElementById(id).textContent = events[button.dataset.event][i]; });
    animate(document.querySelector('.event-explainer'));
  }));
  const diagnoses = {
    click: ['ad','Kiểm tra thông điệp trước khi sửa trang.','Người xem có hiểu bạn đang giúp ai và giải quyết điều gì không? Xem lại câu mở đầu, hình ảnh và lời đề nghị trong quảng cáo.','Thử một góc nội dung khác, giữ rõ khóa học và người học.'],
    form: ['landing','Kiểm tra trải nghiệm sau lượt nhấp.','Nội dung đầu trang có khớp quảng cáo không? Form có dễ tìm, dễ điền và gửi được trên điện thoại không? Đừng bỏ qua tốc độ tải và bằng chứng.','Kiểm tra form trước, sau đó thử một cách trình bày lời đề nghị rõ hơn.'],
    quality: ['lead','Đọc chất lượng đăng ký cùng số lượng.','Khách để lại thông tin có đúng nhu cầu, nội dung khóa học và khả năng sử dụng không? CPL thấp chưa đủ để gọi là hiệu quả.','Làm rõ đối tượng phù hợp trên landing và hỏi một câu sàng lọc cần thiết.']
  };
  document.querySelectorAll('[data-diagnosis]').forEach(button => button.addEventListener('click', () => {
    activate('[data-diagnosis]', button);
    const [node,title,body,action] = diagnoses[button.dataset.diagnosis];
    document.querySelectorAll('[data-node]').forEach(el => el.classList.toggle('selected', el.dataset.node === node));
    document.getElementById('diagnosis-title').textContent = title;
    document.getElementById('diagnosis-body').textContent = body;
    document.getElementById('diagnosis-action').textContent = action;
    animate(document.querySelector('.diagnostic-panel'));
  }));
  document.querySelectorAll('[data-proof]').forEach(button => button.addEventListener('click', () => {
    activate('[data-proof]', button);
    document.querySelectorAll('.report-panel').forEach(panel => { panel.hidden = panel.id !== 'report-' + button.dataset.proof; if (!panel.hidden) animate(panel); });
  }));
  const rail=document.querySelector('.feedback-grid');
  if(rail){
    const track=document.createElement('div');track.className='marquee-track';
    const group=document.createElement('div');group.className='marquee-group';
    while(rail.firstChild)group.append(rail.firstChild);
    const duplicate=group.cloneNode(true);duplicate.setAttribute('aria-hidden','true');
    duplicate.querySelectorAll('a').forEach(a=>a.tabIndex=-1);
    track.append(group,duplicate);rail.append(track);
  }
  const viewer = document.getElementById('proof-viewer');
  let sourceLink;
  if (viewer && typeof viewer.showModal === 'function') {
    document.querySelectorAll('[data-lightbox]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault(); sourceLink = link;
      const sourceImage = link.querySelector('img');
      const image = viewer.querySelector('img'); image.src = link.href; image.alt = sourceImage.alt;
      viewer.querySelector('p').textContent = sourceImage.alt;
      viewer.showModal(); document.body.classList.add('viewer-open');
    }));
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => { document.body.classList.remove('viewer-open'); if (sourceLink) sourceLink.focus({ preventScroll: true }); });
  }
  const objectiveCopy = {
    traffic: ['TRAFFIC / LANDING PAGE VIEWS','Bạn cần người xem trang.','Phù hợp khi mục đích là đưa người đến nội dung. Cần đọc lượt xem landing cùng chất lượng truy cập; nhiều lượt nhấp chưa đồng nghĩa có đăng ký hoặc doanh thu.','Trang mở được, tốc độ tải ổn và có đo hành động sau lượt vào trang.'],
    registration: ['COMPLETE REGISTRATION','Bạn cần người hoàn tất đăng ký.','Dùng tín hiệu hoàn tất một quy trình đăng ký đã xác định, chẳng hạn đăng ký tham dự buổi học. Form tư vấn có thể phù hợp với Lead; cần chọn sự kiện đúng với hành động thực tế.','Chỉ ghi nhận khi đăng ký thành công; không đếm lượt bấm nút hoặc form gửi lỗi.'],
    checkout: ['INITIATE CHECKOUT','Bạn cần biết ai bắt đầu thanh toán.','Theo dõi bước khách bắt đầu quy trình thanh toán để tìm chỗ bị bỏ dở. Đây là tín hiệu gần mua hơn lượt xem trang nhưng chưa phải đơn trả tiền.','Định nghĩa rõ điểm bắt đầu checkout và kiểm tra luồng chuyển trang, mã đơn, lỗi form.'],
    purchase: ['PURCHASE','Bạn cần đo giao dịch đã hoàn tất.','Ghi nhận khi có xác nhận thanh toán. Khi dùng sự kiện này để tối ưu, cần kiểm tra tín hiệu đúng, ổn định và phù hợp với cách bán khóa học của bạn.','Đối chiếu số tiền, tiền tệ, mã đơn và trạng thái trả tiền; chống trùng khi Pixel và CAPI cùng gửi.']
  };
  document.querySelectorAll('[data-objective]').forEach(button => button.addEventListener('click', () => {
    activate('[data-objective]',button);
    ['objective-code','objective-title','objective-body','objective-check'].forEach((id,i) => { document.getElementById(id).textContent = objectiveCopy[button.dataset.objective][i]; });
    animate(document.querySelector('.objective-detail'));
  }));
  const filter = document.getElementById('analysis-filter');
  const report=JSON.parse(document.getElementById('ad-report-data').textContent);
  const renderAnalysis=()=>{
    const selected=filter.value==='all'?report.rows:[report.rows[Number(filter.value)]];
    const purchases=selected.reduce((n,r)=>n+r.purchases,0);
    const impressions=selected.reduce((n,r)=>n+r.impressions,0);
    document.getElementById('analysis-rows').replaceChildren(...selected.map(row=>{
      const tr=document.createElement('tr');
      [row.label,String(row.purchases),row.impressions.toLocaleString('vi-VN'),money(row.cpa)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});return tr;
    }));
    document.getElementById('analysis-purchases').textContent=String(purchases);
    document.getElementById('analysis-impressions').textContent=impressions.toLocaleString('vi-VN');
    const share=purchases/report.totalPurchases*100;
    document.querySelector('.spend-donut').style.background=`conic-gradient(#f87931 0 ${share}%,#e5e5e5 ${share}% 100%)`;
    document.getElementById('analysis-share').innerHTML=share.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%<small>trong 921 lượt mua</small>';
    document.getElementById('analysis-insight').textContent=selected.length===1?selected[0].label+': '+money(selected[0].cpa)+' / lượt mua.':'Đọc lượt mua cùng chi phí chuyển đổi.';
  };
  if(filter){filter.addEventListener('change',renderAnalysis);renderAnalysis();}
  const toc=document.getElementById('course-toc');
  const tocTrigger=document.querySelector('.toc-trigger');
  if(toc && tocTrigger){
    tocTrigger.addEventListener('click',()=>{toc.showModal();tocTrigger.setAttribute('aria-expanded','true');});
    toc.querySelector('button').addEventListener('click',()=>toc.close());
    toc.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>toc.close()));
    toc.addEventListener('click',e=>{if(e.target===toc)toc.close();});
    toc.addEventListener('close',()=>tocTrigger.setAttribute('aria-expanded','false'));
  }
  const autoplayButton=document.querySelector('.feedback-autoplay');
  let autoplay=!reduced.matches, railVisible=false;
  const updateAutoplay=()=>{
    if(!rail||!autoplayButton)return;
    autoplayButton.textContent=autoplay?'Tạm dừng':'Tự chạy';
    autoplayButton.setAttribute('aria-pressed',String(autoplay));
    rail.classList.toggle('is-running',autoplay&&railVisible&&!document.hidden&&!document.querySelector('dialog[open]'));
  };
  if(rail&&autoplayButton){
    new IntersectionObserver(entries=>{railVisible=entries[0].isIntersecting;updateAutoplay();},{threshold:.1}).observe(rail);
    autoplayButton.addEventListener('click',()=>{autoplay=!autoplay;updateAutoplay();});
    reduced.addEventListener('change',()=>{autoplay=!reduced.matches;updateAutoplay();});
    document.addEventListener('visibilitychange',updateAutoplay);
    document.querySelectorAll('dialog').forEach(dialog=>new MutationObserver(updateAutoplay).observe(dialog,{attributes:true,attributeFilter:['open']}));
    updateAutoplay();
  }
  const tracking=document.querySelector('.tracking-dashboard');
  if(tracking)new IntersectionObserver(entries=>tracking.classList.toggle('signals-running',entries[0].isIntersecting),{threshold:.1}).observe(tracking);
  const videos = [...document.querySelectorAll('video')];
  videos.forEach(video => video.addEventListener('play', () => videos.forEach(other => { if (other !== video) other.pause(); })));
})();
