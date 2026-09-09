# Landing Codex cho hiệu suất cá nhân

## Đã phát hành và kiểm tra tên miền thật — 08/09/2026

- Live: https://www.theanhmarketing.com/academy/codex-x10-hieu-suat (HTTP 200; tên miền không-www chuyển đúng về www).
- Runtime `1f541590f768b91c879a2b219b9b7115da93f953`, tích hợp fast-forward vào canonical sạch, push và remote preflight đạt. Preview `dpl_888vKg21zgQNooMA5fyhDAExNQd6` READY, đọc qua xác thực Vercel đúng 15 section/8 phần minh họa/form. Production dựng lại từ preview: `dpl_5pNYu49hDr8WdGznt5EVKvsoUccG`, READY, xác nhận www và apex đều trỏ bản mới; SHA đúng runtime.
- Browser production: 4 viewport 1440/768/390/320 không tràn ngang hoặc ảnh hỏng; 15 section, 8 minh họa, 7 video; giá chính thức/đặt trước/cọc/còn lại đúng. CTA ghim đưa tới và focus form, tab nghề hoạt động; 12 tài nguyên và 10 liên kết trả 200; không pageerror. Kiểm tra chuyển động riêng trên live: 8/8 cảnh có animation và nút pause hoạt động.
- Đối chiếu trước/sau: Facebook Ads, Ebook, AI Master và Agent Kit đều 200; ba landing tĩnh đầu giữ nguyên SHA-256. Agent Kit HTML động thay đổi theo markup của bản deploy; source/asset/luồng cũ không nằm trong diff. Login và vào khóa học 200, dashboard/admin chuyển đúng tới đăng nhập. GET orders/SePay/Resend/student-progress vẫn 405; preorder-launch chưa xác thực vẫn 401; availability 200, phản hồi cùng hash.
- Nhật ký error/fatal của đúng bản production trong cửa sổ 15 phút kết thúc 08:11:09 UTC không có bản ghi, đã chờ hơn 60 giây sau READY. Đây là kiểm tra ngay sau phát hành, không phải cam kết không phát sinh lỗi về sau.
- Không tạo đơn, thanh toán, gửi mail hoặc đăng nhập học viên thật trong audit. Không migration hoặc thay đổi dữ liệu khách. Các lỗi full-suite baseline và giới hạn LMS ở mục dưới vẫn được giữ, không gọi toàn dự án là hoàn toàn xanh.
- Rollback ứng dụng: `dpl_DqPdx7bkGZ7BdidxrYHvWzWc297F`. Các đoạn LOCAL/chưa deploy/chuẩn bị dưới đây là lịch sử, được thay thế bởi trạng thái LIVE này.

### Bàn giao

App sửa: main-site `theanh-main`, không phải app học viên. Context đối chiếu gồm control-plane registry/rules/project registry/chính sách trình duyệt/ACTIVE_TASKS; repo AGENTS, CURRENT_STATE, FEATURE_MAP, design/handoff và hợp đồng bảo mật/thanh toán. Nguồn sửa gồm 7 file dưới `app/academy/codex-x10-hieu-suat/`, 4 browser harness, báo cáo/handoff và lesson scoped; không sửa file runtime ngoài route mới. Repo CURRENT_STATE/FEATURE_MAP/handoff và workspace SESSION_STATE/FEATURE_REGISTRY/TASK_LOG/CHANGELOG/ACTIVE_TASKS/PAYMENT-FLOW/NEED_VERIFY đã cập nhật.

Lệnh kiểm tra chính: `next build --webpack`, ESLint 4 TSX, `node --test` 7 file liên quan (71 pass), 4 browser harness; Git diff check, doctor/preflight remote; Vercel preview/promote; live HTTP/browser và runtime error/fatal query. Không cần phát hành thêm cho yêu cầu này. Phiên sau bắt đầu từ canonical mới nhất; chỉ mở xử lý 19 lỗi baseline hoặc test giao dịch thật khi nằm trong yêu cầu được phép.

## Audit cuối và chuẩn bị phát hành — 08/09/2026

Anh yêu cầu kiểm tra toàn bộ và deploy nếu đạt. Audit xác nhận 15 section, 8 kết quả/8 minh họa, 7 video bằng chứng; nội dung hướng về kết quả khách nhận, không có từ nội bộ trong phần khách đọc. Học phí phân biệt 999K chính thức, 799K đặt trước, 399K cọc/400K còn lại; cùng sản phẩm và quyền học hiện hữu. Các phần lịch sử ghi LOCAL/chưa deploy phía dưới là trạng thái trước vòng phát hành này.

- Đã tái hiện và sửa hai lỗi giới hạn ở form mới: cookie tracking URI lỗi làm kẹt đăng ký; ViewContent lỗi làm mất form. Attribution/analytics hiện là tùy chọn, không chặn đặt hàng. Không thay shared tracking/backend.
- Bản cuối: Webpack 108/108 và TypeScript đạt; ESLint bốn TSX và diff check đạt; 71/71 kiểm tra Agent Kit/preorder/invoice/SePay/payment/landing đạt.
- Browser hồi quy: 15 section, 4 viewport 1440/768/390/320, 10 nhóm tương tác, 7 video phát được; không lỗi trang, ảnh hỏng, liên kết neo thiếu hoặc tràn ngang. Motion 8/8, tạm dừng/tiếp tục và reduced-motion đạt. Kiểm tra riêng cookie lỗi/analytics lỗi/gửi lặp/thử lại đạt. Kiểm tra release chỉ đọc: 12 tài nguyên, 10 liên kết đều 200; CTA đúng giá/focus form.
- Full Node baseline: 706 tests, 685 pass, 19 fail, 2 skip trên cả feature và canonical b9eee18; danh sách 19 lỗi trùng nhau. Các lỗi ở harness admin/CRM/support và bốn contract Facebook cũ; không khẳng định toàn dự án xanh. Không sửa ngoài phạm vi để che lỗi baseline.
- Backend đọc nguồn và kiểm tra hợp đồng: máy chủ chọn giá, giới hạn API, xác thực form/invoice, cùng checkout/SePay và entitlement; đơn cọc không cấp đủ quyền học; Lead/Checkout dùng mã đơn cho dedup. Không thêm API, migration hoặc thay dữ liệu khách.
- Giới hạn: các submit chỉ được giả lập, không tạo đơn/thanh toán/email thật; không kiểm tra đăng nhập học viên thật hoặc đối chiếu từng video LMS. Nội dung số lượng và thành tích dùng thông tin chủ dự án đã xác nhận.
- Phát hành chỉ qua canonical, remote preflight và preview READY; cần ghi production/live readback sau khi hoàn tất. Rollback trước phát hành: dpl_DqPdx7bkGZ7BdidxrYHvWzWc297F.

## Minh họa chuyển động cho 8 quyền lợi

- Kết quả kiểm tra: build 108/108, lint/diff check PASS; motion test 8/8 cảnh có khung hình thay đổi, pause/resume và reduced-motion PASS, 4 viewport không tràn ngang, không pageerror. Browser hồi quy 15 section/10 nhóm tương tác PASS. Đã xem ảnh cả 8 cảnh, ba thời điểm email (400/1800/3000ms) và card mobile 320px. Bản local cổng 3108 đã cập nhật, chưa phát hành.

- Thêm `outcome-motion.tsx` + CSS: tám minh họa SVG/CSS tự lặp 4 giây, không tải GIF/video mới hoặc thư viện. Email bay A→B; video ghép cảnh/phụ đề/playhead; web ráp khối; ads chuyển đến nhóm khách; research quét nguồn/tổng hợp; Facebook lịch→bài; finance thu chi→biểu đồ; plan mục tiêu→lịch tuần.
- Chuyển động mang thông tin theo nguyên tắc motion-first; không phải sản xuất video có âm thanh/voiceover, không dùng hình người hoặc thay bằng chứng thật. Có nhãn minh họa, accessible name, checkbox tạm dừng toàn bộ và reduced-motion tĩnh. Đơn vị thời gian 4s là chu kỳ minh họa, không phải tốc độ thực hiện tác vụ.
- `tests/codex-motion-browser.mjs` kiểm tra khác biệt khung hình từng cảnh, animation count, pause/resume, reduced motion, bốn viewport; chụp mẫu từng cảnh và ba thời điểm lá thư. Không request API thật. Không thay offer/giá/thanh toán.

## Bổ sung email và kế hoạch

Kiểm tra bản 8 nhóm: build 108/108, lint/diff check và browser 4 viewport/10 nhóm tương tác PASS. Đã xem ảnh card desktop, hai mục mới cân đôi hàng cuối. Local cổng 3108 đã cập nhật.

Theo yêu cầu tiếp theo, danh sách nay có 8 nhóm: tách nghiên cứu thị trường khỏi lên kế hoạch và thêm gửi email bán hàng/chăm sóc khách theo lịch. Đồng bộ hero, số nhóm, offer và browser assertions. Hai card mới chiếm hàng cuối cân đôi trên desktop, mobile xếp dọc. Chỉ cập nhật nội dung khóa học, không gửi email thật hoặc cấu hình automation.

## 08/09 — Thiết kế lại theo kết quả khách nhận được

- Bản cuối: build Webpack 108/108, TypeScript trong build, lint riêng và diff check PASS; browser harness PASS 4 viewport/15 section/10 nhóm tương tác/7 video, không pageerror, ảnh lỗi hoặc overflow. Đã xem ảnh của cả 15 section qua hai vòng audit và các ảnh mobile cận cảnh hero/kết quả/nhóm nghề/học phí. Thanh ghim, form giả lập và đổi phase vẫn đạt. Server local cổng 3108 đang chạy bản cuối; không deploy.

- Chủ dự án yêu cầu bố cục chuyên nghiệp hơn và cung cấp sáu nhóm ứng dụng: edit video, website, lên quảng cáo, nghiên cứu/kế hoạch, đăng Facebook và báo cáo tài chính. Dùng các quyền lợi này làm nội dung bán khóa học, không trình bày chúng như dịch vụ làm hộ trọn gói hoặc kết quả tài chính đã đo.
- Mạch mới: hero → sáu kết quả → vấn đề → lợi ích theo nghề → bằng chứng website → thời gian → sản phẩm thật → nội dung học → nhân viên riêng → bộ Agent → bắt đầu → người hướng dẫn → offer → FAQ → CTA. Giữ 15 section; `cach-lam` nay là sáu nhóm kết quả, demo thao tác ở disclosure dưới bằng chứng.
- Thêm `outcomes.tsx`: dữ liệu sáu quyền lợi dùng chung với offer, SVG icon nhẹ, hero sử dụng poster sản phẩm thật. `redesign.css` bổ sung phân cấp thị giác, các tông nền nhẹ, thẻ kết quả/nhãn đầu ra, package, panel theo nghề, responsive và reduced-motion. Không thêm thư viện hoặc API.
- Viết lại phần nhóm nghề và nội dung học theo sản phẩm/lợi ích; giữ số video và product contract. Phần học phí nhắc đủ sáu ứng dụng, 20+ video, 8 Agent, hướng dẫn tạo Agent và mẫu tài liệu. Giá và nghiệp vụ đặt cọc không đổi.
- Bản đầu redesign build 108/108, lint, browser 15 section/4 viewport/10 nhóm tương tác đạt, không lỗi ảnh/overflow/pageerror. Audit ảnh phát hiện nhãn tối trên panel xanh do màu label cũ `!important`; sửa riêng label của panel, không thay màu toàn site. Bản cuối kiểm tra lại trước bàn giao.
- Ảnh từng section ẩn thanh fixed chỉ trong phép chụp để đọc đủ nội dung; ảnh toàn trang và ảnh sticky riêng vẫn giữ giao diện thật. Không suy diễn thanh ghim che cố định giữa section từ ảnh element dài.

## Góp ý tiếp theo ngày 08/09 — Marketing, bằng chứng, giá và CTA ghim

- Chủ dự án xác nhận kết quả/cam kết đã làm được, yêu cầu dùng headline “thiết kế hàng trăm landing page với nhân viên AI chỉ bằng một click”, không hỏi lại. Claim này là xác nhận trực tiếp của chủ dự án trong task, không phải số lượng do phép thử website đo được. Đã đưa vào headline phần demo và đặt ví dụ trang thật kế bên; không thêm bảo đảm hoàn tiền hoặc doanh thu mới.
- Viết lại hero, demo, gallery, bộ Agent, offer/final CTA theo lợi ích và ứng dụng thương mại. Thêm hai video landing Ebook/Agent Kit, ba video Editor và bảng ảnh vận hành quảng cáo đã che định danh từ landing gốc. Bộ bằng chứng mở rộng bằng disclosure, giữ đúng 15 section.
- Giá tách rõ: giá chính thức 999K từ 16/09, giá riêng cho người đặt trước 799K, tiết kiệm 200K, hạn cọc hết 15/09; cọc 399K và còn lại 400K vẫn giữ contract.
- Thêm thanh ghim đáy với giá và CTA theo phase; tự ẩn khi form xuất hiện/đang nhập, bấm đưa tới form và focus ô họ tên; safe-area và khoảng trống cuối trang trên mobile. Kiểm tra mở rộng trong browser harness. Chưa deploy.

## Phạm vi và nguồn

- Bản làm việc: `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/codex-landing-20260908`, nhánh `feat/codex-personal-landing-20260908`, base canonical `b9eee183bdeb236cf5891f9bfc8a8045e6357cb8`. Doctor canonical đối chiếu remote đạt ngày 08/09/2026. Root mới chỉ dùng dựng/test, không có quyền deploy.
- Route mới: `/academy/codex-x10-hieu-suat`. Chủ dự án duyệt 15 section; ba nhóm marketer, freelancer, nhân viên văn phòng; thông điệp tự động hóa 80% công việc, X10 hiệu suất cá nhân; gộp vấn đề thành một section sâu; văn phong theo stop-slop.
- Cùng sản phẩm `bo-agent-kit-x10-hieu-suat-cong-viec`. Giá/phase lấy từ `lib/agent-kit-preorder.ts`; cọc 399K, tổng 799K, còn lại 400K từ 16/09/2026; sau mốc mở bán dùng giá 999K. Cọc không hoàn lại, không cấp đủ quyền học từ đơn cọc. Không tạo course, sửa giá global hoặc entitlement.
- Hơn 20 video và hướng dẫn tạo Agent: thông tin chủ dự án xác nhận trong task. Năm mục mở rộng là nhóm nội dung trình bày, không gán số/tên bài học LMS chưa đọc được. Chưa đối chiếu danh sách từng video trên LMS.
- Vai trò Agent, VAT, quyền dùng, điều kiện cọc: `Hệ thống quảng cáo/05_Ke_hoach_Marketing/landing-pages/doi-ngu-nhan-su-ai/src/content.js` và checkout/source server hiện có. Nguồn ảnh/video và tài liệu thuộc public assets của website. Không sao chép testimonial, số học viên, thành tích hoặc bảo đảm của đối thủ.
- Tham khảo nội dung WeSuccess và bundle nội dung công khai TopExpert đã đọc trong cùng task. Chưa xác nhận toàn bộ giao diện/hiệu ứng rendered của hai site đối thủ. Các file CONTENT_SOURCE_OF_TRUTH/DESIGN_SOURCE_OF_TRUTH Windows chưa có trên Mac, trạng thái này đã được ghi trong workspace NEED_VERIFY; dùng nội dung chủ dự án và source/contract hiện hữu.

## Source và hợp đồng

- `app/academy/codex-x10-hieu-suat/page.tsx`: 15 section, metadata/canonical riêng, noindex giống mục đích landing ads. Server component chứa nội dung.
- `sections.tsx`: chọn nhóm nghề, ví dụ từng bước, bảng tính thời gian, form dùng `/api/orders`, attribution và invoice chung.
- `codex.css`: CSS giới hạn dưới `.cx`, Be Vietnam Pro kế thừa root, nền kem/xanh đậm/cam, mobile và reduced motion.
- Form giữ course slug, payment plan server-known, Lead/InitiateCheckout event ID theo order code, sessionStorage marker tránh phát checkout trùng. Analytics lỗi không được ngăn chuyển tới mã đơn đã tạo. Mốc giá được kiểm tra trước submit, yêu cầu xem lại khi phase thay đổi. Giữ dữ liệu form khi lỗi.
- Tình huống demo được ghi rõ là minh họa. Video và liên kết sản phẩm là kết quả của chủ dự án, không gắn thành thành tích học viên. Giữ thông điệp 80%/X10 chủ dự án xác nhận; bỏ câu tự phủ định thông điệp ở hero và FAQ, thay bằng cách ứng dụng. Bảng tính vẫn tính đúng tỷ lệ thời gian, không nhầm giảm 80% thành 10 lần.
- Không sửa route/asset landing cũ, order API, payment, SePay, email, Auth, CAPI hay dữ liệu học viên. Không copy .vercel hoặc credentials.

## Audit từng section

| Section | Đánh giá và quyết định |
|---|---|
| 1 Giới thiệu | Tên khóa, nhóm khách, 80%/X10 và 20+ video rõ; minh họa giao việc có nhãn, không dùng số đo giả. |
| 2 Demo | Đổi tiêu đề ngắt câu cứng sang câu hướng hành động; ba bước đổi theo nghề; video là sản phẩm mẫu chứ không giả thành recording thao tác Codex. |
| 3 Vấn đề | Một section, ba tình huống có nguyên nhân và hệ quả; loại thuật ngữ vận hành nội bộ; các cột cân nhịp chữ. |
| 4 Ứng dụng | Mỗi nghề có yêu cầu, kết quả và phần cần kiểm tra; nút chọn đổi toàn bộ nội dung liên quan. |
| 5 Cách làm | Bốn bước, số thứ tự riêng, không trùng số trang trí. |
| 6 Hiệu suất | Slider thay đổi phép tính; chỉ mô phỏng thời gian; 80% = 5x, 90% = 10x cùng công việc/chất lượng. |
| 7 Sản phẩm | Dùng tài liệu/video/page có sẵn; thêm poster video sau kiểm tra hình; không hứa kết quả tài chính. |
| 8 Nội dung | 20+ được chủ dự án xác nhận; năm nhóm trình bày mở rộng; không bịa danh sách từng bài hoặc thời lượng. |
| 9 Tạo Agent | Một tình huống hướng dẫn viết bài, có mẫu góp ý và cách dùng lại. |
| 10 Bộ Agent | Đủ tám vai trò từ source, chuyển mô tả sang việc khách nhận được; nói rõ cùng sản phẩm. |
| 11 Bắt đầu | Các bước chuẩn bị/thực hành/kiểm tra thực tế; tài khoản công cụ riêng được nêu rõ. |
| 12 Người hướng dẫn | Dùng ảnh thật có sẵn; không thêm số năm, doanh thu hoặc danh hiệu chưa xác minh. |
| 13 Quyền lợi/đăng ký | Phase/giá/điều kiện cọc/VAT rõ; tên field đầy đủ, invoice optional, lỗi có thể thử lại. |
| 14 FAQ | Trả lời phí công cụ, người mới, lập trình, quyền học, cùng sản phẩm; sửa liên hệ sang email từ siteConfig. |
| 15 Cuối trang | Sửa câu ngắt cứng; một bước về form, thông điệp cùng quyền học. |

## Kiểm chứng

- Bản cuối sau chỉnh hero/FAQ/calculator đã build lại 108/108, lint và browser harness PASS: 15 section trên 4 viewport, 9 nhóm tương tác, 7 video, không lỗi. Local server đang phục vụ bản này tại cổng 3108.

- Bản góp ý marketing: build 108/108, lint đạt; browser kiểm bốn viewport 1440/768/390/320, chín nhóm tương tác và cả bảy video phát được, không pageerror/ảnh lỗi/tràn ngang. CTA ghim hiển thị đúng giá, đưa tới/focus form và tự ẩn. Đã xem ảnh giá mobile, CTA ghim 320/390 và gallery desktop. Hai câu hero/FAQ và lời dẫn calculator tiếp tục chỉnh theo yêu cầu mới nhất, kiểm tra lại bản build trước bàn giao.

- Bản đầu: TypeScript đạt; ESLint sửa một anchor logo sang Link, sau đó đạt. 55/55 kiểm tra Agent Kit, preorder, Facebook Ads và payment UI đạt.
- Production build Webpack cuối đạt 108/108 sau chỉnh copy/poster/contact/skip link; TypeScript và ESLint riêng đạt.
- Browser harness `tests/codex-landing-browser.mjs`: mọi request ngoài localhost bị chặn, `/api/*` mặc định trả giả lập. Payload không được gửi tới API thật; không tạo đơn, gửi email, CAPI hoặc giao dịch.
- Bản đầu bốn viewport 1440/768/390/320 đều đủ 15 section, không overflow, ảnh lỗi hoặc anchor thiếu; chọn nghề, demo, tất cả disclosures, calculator, invoice, lỗi/success form và chuyển phase đạt; không pageerror.
- Đã xem riêng ảnh cả 15 section desktop, năm ảnh cận cảnh mobile của hero/vấn đề/form/nội dung/ứng dụng. Browser bản production cuối PASS: 15 section trên bốn viewport, không overflow/ảnh hỏng/anchor thiếu/pageerror; hai video giải mã/phát, tám nhóm tương tác đạt. Kết quả máy đọc và screenshots: `reports/codex-landing-20260908/`.
- Phép thử video đầu chờ cố định 500ms khi phần tử nằm ngoài viewport không chứng minh playback; sửa test đưa video vào vùng nhìn thấy và đợi điều kiện currentTime > 0 + videoWidth > 0, cả hai video đạt. Không sửa asset hoặc suy diễn video hỏng từ phép thử đầu.
- Chưa deploy, chưa đo quảng cáo/chuyển đổi và chưa thực hiện thanh toán thật. Muốn phát hành phải tích hợp scoped diff vào root release, preflight và xác nhận tại thời điểm deploy theo workspace policy.

## Chạy lại

Node: `/Users/theanh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
Chạy `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3108` sau build; `node tests/codex-landing-browser.mjs` để kiểm tra trên localhost. Chromium headless dùng bản Chrome cài sẵn, không điều khiển cửa sổ/profile đang mở của người dùng.

## 09/09/2026 — Làm rõ preorder dưới tiêu đề Codex

LOCAL_REVIEW: thêm khối giá dưới h1 tại /academy/codex-x10-hieu-suat theo ảnh chủ dự án: chính thức 999.000đ gạch ngang, preorder 799.000đ hết 15/09/2026, cọc399.000đ không hoàn lại, còn400.000đ ngày16/09/2026, VAT. Dùng hằng số và phase hiện có; tự chuyển giá chính thức sau hạn. Không đổi form/payment/tracking. Candidate hiện hữu `.codex-local/codex-landing-20260908`, cùng HEAD2262eff với canonical. Sửa page.tsx, sections.tsx, redesign.css. Remote doctor, targeted ESLint, TypeScript,16tests và diff check đạt. Build Webpack đạt; tổng55/55 kiểm tra liên quan và bảo vệ landing/checkout đạt. Chưa deploy, chưa QA browser do policy; chờ chủ dự án duyệt phát hành theo WORKSPACE_RULES/computer-use-policy.

## 09/09/2026 — Preorder dưới tiêu đề Codex ĐÃ PHÁT HÀNH

Chủ dự án duyệt “oke làm đi em”. Runtime c5e6ceb7af2e7ad86fe662d2bb27eb6f12160f68, preview dpl_CWZHcUJoLdrJm7VkvoykWHoFjZX7 READY; remote preflight PASS; production dpl_3EN2iCuqXyBCGBD34n3DjJFdY12o READY. Khối preorder nằm giữa h1 và mô tả hero, dùng giá/phase hiện có, hiển thị đủ hạn15/09, cọc399K không hoàn lại, còn400K ngày16/09 và VAT.

Build Webpack/TypeScript/ESLint và55tests đạt ở candidate đã duyệt. Live www/apex200, xác minh vị trí HTML, chuỗi nội dung client và CSS trong14assets. Facebook Ads/Ebook/AI Master200 và giữ nguyên SHA256; Agent Kit200, source/commerce/tracking không đổi. Runtime error/fatal query15m scoped deployment mới không có kết quả. Chưa kiểm tra trực quan bằng browser do policy; không tạo đơn hoặc gửi giao dịch/sự kiện thử. Rollback: dpl_5Rb61wiJraXsjNj7fre9E9jKFkWt. Evidence: reports/codex-preorder-20260909/live-readback.json trong workspace điều phối. Các trạng thái LOCAL_REVIEW/chờ duyệt của sửa preorder trước đây đã được thay thế.
