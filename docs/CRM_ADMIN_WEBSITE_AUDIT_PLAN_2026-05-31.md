# Website + Admin CRM Audit Plan - 2026-05-31

Mục tiêu: audit và nâng cấp toàn bộ website `theanhmarketing.com`, đặc biệt khu vực admin/CRM, để tránh lỗi cơ bản về content, màu chữ, layout, trạng thái rối, và chuẩn bị được nền tảng remarketing + Facebook Ads.

## Phạm vi audit

- Public website: homepage, khóa học, academy, blog, đăng ký, liên hệ, thanh toán, SEO, header/footer, popup/sticky CTA, responsive mobile.
- Admin platform: dashboard, lead CRM, đơn hàng, học viên, remarketing, CMS, SEO/tracking, database, feedback, tài liệu.
- Tracking/ads: Meta Pixel, Meta Conversions API, event deduplication, UTM, `fbp`/`fbc`, remarketing segments, Custom Audiences, Ads Insights.
- Data/admin operation: quyền truy cập, dữ liệu cá nhân, export/import, cache, loading/error states, audit log.

## Nguồn tham chiếu CRM và Ads

Không thiết kế CRM bằng cảm tính. Các chuẩn layout cần bám theo:

- HubSpot CRM: object index page có saved views, filters, table/board, columns; record page có left sidebar, middle activity/overview, right sidebar associations; activity timeline gồm notes, email, calls, tasks, meetings.
- Pipedrive: pipeline là trung tâm quản lý deal; deal card cần title, contact, value, label, owner, activity; deal detail có progress bar, sidebar summary, history, changelog, focus items.
- Salesforce Sales Cloud: mô hình dữ liệu cốt lõi gồm Leads, Accounts, Contacts, Opportunities, Activities; activity timeline áp dụng cho lead/contact/opportunity; list views dùng để lọc và thao tác bản ghi.
- Meta Marketing API: Custom Audiences cần nguồn dữ liệu hợp lệ, xử lý dữ liệu khách hàng server-side và trạng thái sync; Ads Insights cần lấy chỉ số theo account/campaign/adset/ad.
- Meta CAPI: sự kiện server cần `event_name`, `event_time`, `event_id`, `action_source`, user data đã hash khi cần, và đồng bộ `event_id` với Pixel để tránh đếm trùng.

## Checklist lỗi phải kiểm tra

### 1. Content và ngôn ngữ

- Không có `lorem`, `demo`, `sample`, `placeholder`, `TODO`, `test`, nội dung copy nháp xuất hiện trên trang thật.
- Không lẫn tiếng Anh trong admin nếu không phải thuật ngữ kỹ thuật bắt buộc. Ví dụ cần đổi các label kiểu `Total Students`, `Active Access`, `Add New Student`.
- Không có câu chung chung như "CRM cơ bản", "website builder cơ bản" nếu không nói rõ người dùng làm được gì.
- Không có giá, ưu đãi, lịch workshop, tên khóa học, CTA, đường dẫn thanh toán bị cũ hoặc mâu thuẫn giữa các trang.
- Không có internal note, đường dẫn local, tên file dev, dữ liệu giả, thông tin test lộ ra public.
- H1/H2 phải đúng ngữ nghĩa: mỗi trang public quan trọng có H1 rõ, không chỉ dùng H2 vì component chung.
- CTA phải nhất quán: người dùng biết bấm để đăng ký, xem khóa học, liên hệ, hoặc quản lý dữ liệu.

### 2. Text, màu sắc, độ đọc

- Text không bị tràn, cắt dòng xấu, che bởi sticky CTA/popup/coupon.
- Không dùng màu chữ quá nhạt trên nền sáng hoặc text trắng trên nền nhạt.
- Không trộn dark panel vào admin light shell nếu không có chủ đích thiết kế rõ ràng.
- Trạng thái badge phải đọc được và phân biệt được: lead mới, đang xử lý, đã mua, hủy, đồng bộ lỗi, chờ sync.
- Placeholder/input/help text đủ tương phản và không bị coi là nội dung chính.
- Button disabled, active, hover, focus phải khác nhau rõ nhưng không làm layout nhảy.

### 3. Layout public website

- Header mobile không bị overflow ngang; nav quan trọng không bị cắt ở viewport 390px.
- Popup không tự che hero/CTA chính ngay lần đầu nếu chưa có intent rõ.
- Sticky CTA/coupon không che form đăng ký hoặc nút thanh toán.
- Không có horizontal overflow ở 390px, 768px, 1365px.
- Card/section không lồng quá nhiều lớp gây rối; spacing và max-width nhất quán.
- Trên mobile, bảng/price block/form phải có thứ tự đọc tự nhiên, không cần zoom.
- Hero trang bán hàng phải cho thấy rõ sản phẩm/offer trong viewport đầu và vẫn hé phần nội dung tiếp theo.

### 4. Layout admin/CRM

- Sidebar/nav admin phải phân nhóm theo việc người vận hành cần làm, không theo cấu trúc code.
- Dashboard không được là một app thứ hai trùng Lead CRM/Đơn hàng/Học viên làm người dùng bối rối.
- Global search nếu chưa hoạt động thì không để như tính năng thật; hoặc phải tìm được lead/order/student.
- Mỗi module cần có: metric tóm tắt, saved view/filter, search, table ổn định, empty/loading/error state, thao tác chính.
- Bảng desktop cần column rõ, không giấu thông tin quan trọng bằng truncate quá mạnh.
- Mobile admin cần ưu tiên danh sách card hoặc table scroll có nhãn, không ép người dùng rê ngang để hiểu dữ liệu.
- Record detail phải có drawer/page riêng: thông tin chính, lịch sử hoạt động, ghi chú, nhiệm vụ tiếp theo, tracking/UTM, đơn hàng liên quan.
- Pipeline cần stage rõ: New lead, Qualified, Consulted, Checkout, Paid, Lost/Archived.
- Không dùng tab quá nhiều trong một màn hình nếu đã có route riêng cho module đó.

### 5. CRM data model

- Lead/contact/deal/order/student phải có quan hệ rõ, tránh cùng một người bị nhân bản rời rạc.
- Cần dedupe theo email/phone/order code và hiển thị cảnh báo bản ghi trùng.
- Cần owner/assignee, priority/score, next action, next follow-up date.
- Cần activity timeline: form submit, call/note/task, checkout, payment, CAPI event, audience sync.
- Cần audit log cho thao tác nhạy cảm: đổi trạng thái, export data, sync audience, sửa quyền học viên.
- Cần phân quyền admin/editor/support nếu nhiều người cùng vận hành.

### 6. Remarketing và Facebook Ads

- Pixel ID có thể public, nhưng access token, app secret, dataset token, service role key phải chỉ nằm server-side.
- Không để `test_event_code` trong production lâu dài.
- Pixel và CAPI phải dùng cùng `event_id` cho Lead/Purchase để tránh đếm trùng.
- Phải lưu `fbp`, `fbc`, UTM, landing page, referrer, user agent/IP theo chính sách phù hợp để tăng khả năng attribution.
- Customer list Custom Audience phải hash/chuẩn hóa email/phone server-side, có consent/legal basis, có trạng thái sync và lỗi sync.
- Không sync tất cả lead bừa bãi; cần segment rõ: high-intent checkout, lead chưa mua, khách đã mua, học viên active, exclude purchasers.
- Ads Insights phải tách read-only reporting với thao tác thay đổi chiến dịch; không để admin vô tình sửa campaign live.
- Cần rate limit, retry, batch size, idempotency, và log lỗi khi gọi Meta API.

### 7. SEO, crawl, tracking

- Canonical phải đúng từng route, không canonical toàn site về homepage.
- Sitemap/robots phải sạch, không đưa route test, markdown sample, admin/private vào index.
- Mỗi trang public có title/description vừa đủ, không quá dài và không trùng lặp.
- Open Graph image/link phải hiện đúng khi share Facebook/Zalo.
- Tracking script không làm hỏng performance hoặc chặn render.
- Form submit/payment phải phát event đúng một lần.

### 8. Performance và ổn định

- Admin không load tất cả dữ liệu không giới hạn nếu số bản ghi tăng.
- Query cần phân trang, filter server-side, cache có invalidation rõ.
- Không để client component lớn ôm toàn bộ CRM nếu có thể chia route/module.
- Loading skeleton và error state phải xuất hiện đúng, không trắng màn hình.
- Build, route verification, tracking verification, screenshot QA phải chạy trước khi nói hoàn tất.

### 9. Security và dữ liệu cá nhân

- Admin phải `noindex`, có auth guard ở production, session timeout hợp lý.
- Không log email/phone/token đầy đủ trong console/server logs.
- Export CSV cần giới hạn quyền và ghi audit.
- Supabase RLS/service role phải tách rõ client/server.
- Webhook thanh toán cần verify signature/secret và idempotency.

## Phát hiện ban đầu trong repo/live site

- Public route check hiện không thấy lỗi 404/500 thật; `robots.txt`, `sitemap.xml`, build và tracking verification đang pass.
- Public mobile header đang có rủi ro overflow/cắt nav ở viewport 390px.
- Một số trang public như `/gioi-thieu`, `/blog`, `/lien-he` thiếu H1 vì component section heading đang render H2.
- `app/layout.tsx` đang có canonical mặc định `/`, dễ làm nhiều route canonical về homepage nếu không override.
- Offer popup desktop có thể che hero/CTA đầu trang trong lần xem đầu.
- Trang đăng ký mobile có rủi ro sticky CTA/coupon che nội dung form và overflow ngang.
- Admin hiện có nhiều nền tảng tốt: Lead CRM, Orders, Students, Remarketing, CMS, SEO/Tracking, CAPI server-side.
- Admin còn rủi ro lớn: dashboard trùng chức năng với route riêng, vài label tiếng Anh trong Học viên, global search giống placeholder, dashboard con có dark panel lẫn light shell, chưa có record detail/timeline CRM chuẩn.
- Remarketing hiện mới là phân đoạn nội bộ từ lead/order; chưa có Custom Audience sync, Ads Insights, sync status, consent/audit log đầy đủ.

## Kế hoạch làm

### Phase 0 - Baseline audit và nguồn chuẩn

- Chốt checklist này làm chuẩn QA.
- Chạy lại route/build/tracking verification.
- Chụp screenshot desktop/mobile các route public và admin nếu có quyền truy cập.
- Ghi snapshot lỗi hiện tại: text, color, overflow, popup/sticky, H1/canonical, admin labels.

Done khi: có danh sách lỗi tái hiện được, ảnh/số liệu rõ, không sửa cảm tính.

### Phase 1 - Quality gates tự động

- Thêm script/test kiểm tra content cấm: lorem/demo/placeholder/TODO lộ UI, label tiếng Anh trong admin quan trọng.
- Thêm check H1/canonical cho public routes.
- Thêm Playwright visual smoke cho viewport 390px và 1365px: overflow, text clipped, sticky che CTA/form.
- Thêm contrast/manual checklist cho component admin trọng yếu nếu chưa đủ tooling tự động.

Done khi: lỗi cơ bản có test hoặc checklist bắt buộc trước build.

### Phase 2 - Public website cleanup

- Sửa mobile header để không cắt nav.
- Sửa H1 semantic cho các trang thiếu H1.
- Sửa canonical route-level.
- Điều chỉnh popup/sticky CTA để không che hành động chính.
- Dọn title/description quá dài và link sample không nên crawl.

Done khi: build pass, route/tracking pass, mobile screenshots sạch.

### Phase 3 - Admin shell và thông tin vận hành

- Chuẩn hóa admin visual system: light operational UI, contrast tốt, spacing/table/button/badge thống nhất.
- Biến dashboard thành command center: chỉ tóm tắt KPI và việc cần làm hôm nay, không trùng route quản trị chi tiết.
- Nếu search chưa làm thật, đổi thành quick switch/link hoặc triển khai search thật trên lead/order/student.
- Chuẩn hóa tiếng Việt trong toàn bộ admin.
- Thêm empty/loading/error states rõ cho từng module.

Done khi: admin dễ scan trong 30 giây, không còn copy lẫn tiếng Anh hoặc tính năng giả.

### Phase 4 - CRM hoàn chỉnh

- Thiết kế object model: Contact, Lead, Deal/Opportunity, Order, Student, Activity, Task, Segment.
- Lead CRM có list/saved views, filters, pipeline stage, priority, owner, next action.
- Thêm record detail drawer/page theo chuẩn 3 vùng: summary, activity timeline, associations/tracking.
- Dedupe email/phone và hiển thị related records.
- Activity timeline ghi form submit, note, status change, checkout, payment, CAPI, audience sync.

Done khi: admin không chỉ xem lead, mà quản lý được quy trình follow-up.

### Phase 5 - Remarketing + Meta integration

- Chuẩn hóa event schema cho Pixel + CAPI: Lead, InitiateCheckout nếu cần, Purchase.
- Thêm bảng/metadata cho consent, fbp/fbc, UTM, event_id, last_synced_at, sync_status.
- Xây Custom Audience sync service server-side: tạo/cập nhật audience theo segment, batch, retry, log lỗi, không lộ token.
- Thêm Ads Insights read-only dashboard: spend, impressions, clicks, CTR, CPC, CPM, leads, purchases, CPA, ROAS nếu có value.
- Mapping segment CRM -> audience: checkout bỏ dở, lead chưa mua, khách đã mua, học viên active, exclude purchasers.

Done khi: remarketing có thể vận hành từ CRM mà vẫn an toàn về token, quyền, consent và kiểm soát lỗi.

### Phase 6 - Hardening và vận hành dài hạn

- Phân quyền admin theo vai trò.
- Audit log cho export/sync/status changes.
- Data retention và privacy note cho PII.
- Monitoring cho build, routes, tracking, webhook, Meta sync jobs.
- Tài liệu vận hành ngắn cho người quản trị.

Done khi: có checklist vận hành hằng tuần và cách xử lý lỗi.

## Rủi ro và khó khăn dự trù

- Admin production có thể cần credential/session thật để chụp đủ screenshot; nếu không có quyền, chỉ kiểm được source/local.
- Meta Marketing API cần app, ad account, quyền `ads_read`/`ads_management` tùy tác vụ, business verification hoặc app review tùy use case; không thể chỉ code là chạy live ngay.
- Custom Audience dùng dữ liệu khách hàng nên phải xử lý consent, hashing, điều khoản Meta và quyền truy cập nội bộ.
- Ads Insights và Audience API có rate limit, batch limit, lỗi async, thay đổi version API; cần retry và log tốt.
- Database hiện có thể chưa đủ bảng/field cho CRM chuẩn; migration cần làm cẩn thận để không hỏng lead/order/student đang có.
- Shared admin shell có blast radius lớn; sửa UI shell có thể ảnh hưởng tất cả trang admin.
- Worktree đang có thay đổi sẵn trong `app/page.tsx` và vài screenshot untracked; không được revert hoặc trộn nhầm.
- Một số lỗi như contrast/text clipping cần kiểm bằng screenshot thật, không thể chỉ đọc code.
- Public site đang có nhiều landing page bán hàng; sửa component chung có thể làm lệch conversion nếu không kiểm mobile/desktop.

## Thứ tự ưu tiên ngay

1. Thêm quality gates cho lỗi cơ bản: content cấm, H1/canonical, mobile overflow, admin English label.
2. Sửa public lỗi ít rủi ro: H1, canonical, mobile header, popup/sticky che nội dung.
3. Chuẩn hóa admin shell/copy/table states trước khi thêm CRM feature mới.
4. Thiết kế CRM record detail + activity timeline.
5. Sau khi data model ổn, mới làm Custom Audience sync và Ads Insights.

## Definition of Done cho mỗi đợt sửa

- `npm.cmd run build` pass.
- Route verification pass.
- Tracking verification pass.
- Screenshot desktop/mobile của route bị sửa không overflow, không text clipped, không màu khó đọc.
- Không có secret/token trong diff/log/docs.
- Không có nội dung nháp hoặc label tiếng Anh không chủ ý trên UI admin/public.
- Nếu sửa tracking/Meta: có dry-run/test event rõ, không để `test_event_code` trong production.
