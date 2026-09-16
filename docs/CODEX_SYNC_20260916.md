# Đồng bộ giá, mục lục và thành quả video Codex


## 16/09/2026 — Đồng bộ landing Codex với Bộ Kit doanh nghiệp

Nguồn main-site tại `.codex-local/codex-sync-20260916`, branch `fix/codex-sync-20260916`, base `7079eb178358bff2b1f08a271102959a39919445`. Chỉ sửa landing `/academy/codex-x10-hieu-suat`; chưa tích hợp canonical/push/deploy.

Giá gốc 2.599.000đ; giá chính thức 990.000đ tại hero, offer và CTA ghim. Form dùng gói đã có `agent-kit-offer-990`, cùng slug/quyền học; ViewContent/Lead/InitiateCheckout theo990000. Không sửa các gói999000/cọc lịch sử, API/SePay/email/entitlement/Pixel routing. Mục lục16phần có tiêu đề theo lợi ích; khu vực Thành quả Agent Video dùng đúng7video và5poster của landing Bộ Kit, khung điện thoại, phát theo yêu cầu.

Doctor remote PASS; TypeScript/scoped ESLint PASS;6tests giá/Pixel và39prebuild PASS; Next Webpack108/108 PASS. Build tải font cần network escalation vì DNS sandbox; không thay font hay cấu hình để né lỗi. Bằng chứng tại `reports/codex-sync-20260916` trong worktree; kiểm tra trình duyệt cuối đang hoàn tất. Chưa tạo đơn/email thật.

File sửa: app/academy/codex-x10-hieu-suat/{page.tsx,sections.tsx,redesign.css,offer.ts,showcase.tsx}, tests/{codex-offer-sync.test.mjs,codex-landing-browser.mjs}. Tham khảo giá/video từ source và bundle Agent Kit hiện hành, không áp dụng ghi nhớ giá cũ999000. Đã đọc registry/rules/policy/active tasks, context/session/feature/role/checklist; child AGENTS/CURRENT_STATE/FEATURE_MAP/handoff/design/security; Next client directive và hai skill landing.

Bước tiếp: hoàn tất QA và anh duyệt phát hành theo AGENTS.md/control-plane policy; kiểm tra concurrent changes, tích hợp exact diff, chạy preflight đúng release root, phát hành và kiểm tra live. Không deploy trực tiếp từ candidate.


### QA cuối — READY_FOR_RELEASE_APPROVAL
Chrome headless trên bản dựng localhost đạt1440/768/390/320px: không overflow/ảnh hỏng/anchor thiếu;17section,16liên kết mục lục. Toàn bộ video trên trang decode/phát được, gồm7video trong khu vực mới. Sticky CTA focus form/ẩn đúng chỗ, invoice/attribution/plan990 giữ đúng, mock503 phục hồi và mock200 chuyển checkout/dedup marker đạt. Resilience test malformed cookie/analytics outage/double submit/retry đạt, không pageerror. Đã xem ảnh desktop mục lục/video và mobile320 offer. Không gọi API tạo đơn thật; local build và QA không phải bằng chứng đã live.

Tổng:45kiểm tra Node đạt (6giá/Pixel+39prebuild), TypeScript/scoped ESLint/diff check và Next108/108 đạt; browser/resilience đạt. Chưa chạy full lint/full suite vì thay đổi giới hạn landing. Log /tmp/codex-sync-*.log đã được sao lưu vào reports/codex-sync-20260916; handoff docs/CODEX_SYNC_20260916.md. Chờ anh duyệt phát hành theo workspace AGENTS.md; chưa push/deploy. Preview http://localhost:3108/academy/codex-x10-hieu-suat .


## Phê duyệt phát hành và nút mục lục cuối trang
Anh đã yêu cầu “Thêm cái mục lục nữa - bên cạnh nút đăng ký ngay ở chân trang luôn. Đẩy lên đi em”. Đây là phê duyệt phát hành toàn bộ bản sửa giá/mục lục/video và nút mới; không còn chờ xác nhận. Nút Mục lục tại thanh sticky dẫn #muc-luc. Desktop cùng hàng; mobile giá ở trên, hai nút cạnh nhau ở dưới; giữ điều kiện ẩn thanh khi form đang hiện/focus. Next Webpack108/108, TypeScript và scoped lint bản cuối đạt. Đang hoàn tất browser cuối trước tích hợp canonical.


### Bản cuối trước tích hợp
Browser audit bản có nút Mục lục đạt:1440/768/390/320 không overflow; nút Mục lục và Đăng ký cùng hàng tại1440/390/320, bấm đến #muc-luc đúng; form mock error/success/giá/invoice/attribution đạt; toàn bộ video phát được; không pageerror. Đã xem screenshot desktop1440 và mobile320 sticky. Build cuối108/108 và TypeScript/scoped ESLint PASS. Tiến hành tích hợp và phát hành theo phê duyệt của anh.


## 16/09/2026 — Codex: giá, mục lục và video ĐÃ LIVE

DONE. Anh duyệt “Đẩy lên đi em” và yêu cầu nút Mục lục cạnh Đăng ký ngay ở chân trang. Commit `d2f048010718bd2e44e1a83a82ea6cdf10dfa4f7` đã fast-forward vào canonical/push; preflight exact-root/remote đạt. Preview `dpl_7St9sRc7uTRNX6hB87Y5pY8GiyNt` READY; promote tạo production `dpl_43P1wwXLKwqhybb493YWDa7Rg5XX` READY. API xác minh cả www/apex đúng commit và deployment.

Giá gốc2.599.000đ, giá chính thức990.000đ tại hero/offer/sticky; gói thanh toán hiện có agent-kit-offer-990. Mục lục16phần viết theo lợi ích; Thành quả Agent Video7video dùng nguồn Bộ Kit; nút Mục lục cạnh Đăng ký trong thanh cuối màn hình, dẫn #muc-luc; mobile hai nút cùng hàng dưới giá. Không đổi backend/payment/SePay/email/quyền hoặc Pixel routing.

45Node tests trên canonical đạt; TypeScript/scoped ESLint/diff check, local build108/108 và remote preview/production builds đạt. Chrome production1440/768/390/320 không overflow/ảnh hỏng/anchor thiếu;17sections; video decode/play đạt; nút mục lục và đăng ký cùng hàng và điều hướng đúng; mock API xác minh giá/plan/slug/invoice/attribution, lỗi phục hồi, checkout/dedup đạt; không pageerror. Đã xem ảnh live320px sticky.16HTTP smoke giữ status/destination;5landing tĩnh giữSHA256. Runtime error/fatal scan15phút theo đúng deployment tại07:27:40UTC không có kết quả.

Không tạo đơn thật, không gửi email, không mutation DB; các thử form đều bị chặn và giả lập trong browser. Không tuyên bố có giao dịch thanh toán thật sau phát hành. Full lint/full suite không chạy trong scope này. Rollback `dpl_8kEzWymZXoZntxFAk5BkVVGyLVvv`. Evidence `reports/codex-sync-20260916/` tại workspace điều phối: deployment.json,live-browser-audit.json,live-320-sticky.png,live-smoke-before/after.json,release-tests.log. Handoff nguồn `docs/CODEX_SYNC_20260916.md`. Không còn bước chờ phê duyệt hoặc phát hành; các trạng thái chờ ở trên là lịch sử.


## 16/09/2026 — Sửa mục lục nổi và thanh đăng ký theo ảnh
Owner yêu cầu bảng mục lục nổi như ảnh Bộ Kit và thanh ghim mọi vị trí, chỉ ẩn tại form. Phạm vi tiếp nối bản đã được duyệt phát hành; không cần xác nhận lại. Thay mục lục dạng section bằng native dialog16liên kết theo lợi ích; nút tròn cạnh CTA, nền tối/font Big Shoulders dùng lại tài nguyên Bộ Kit, active section, danh sách cuộn, CTA, X/Escape/focus trap. Thanh vẫn position fixed; chỉ dựa IntersectionObserver form, bỏ điều kiện formFocused gây ẩn kéo dài.

Tái hiện live trước sửa: focus studentName rồi cuộn về #van-de, formTop21768px/viewport844px nhưng sticky absent. Không tìm thấy ancestor transform/contain ở các vị trí đo; cả default/reduced motion ban đầu đều fixed đúng. Nguyên nhân xác minh là focus giữ nguyên sau khi cuộn, không phải CSS transform.

45Node tests, scoped ESLint, TypeScript/Next Webpack108/108 và diff check đạt. Browser1440/390/320 x default/reduced motion:30vị trí ghim đúng viewport, modal16links/scroll/active, bounds, X/Escape/focus trap/return, link tới video, CTA focus form/hide và focus-then-scroll restore đạt; không pageerror/overflow. Đã xem ảnh popup390/default và sticky320/default. Bản build, giá2.599.000/990.000, order plan, video, payment/tracking không đổi ngoài navigation. Không tạo đơn/email thật.

Nguồn thêm navigation-items.ts,sticky-navigation.tsx; cập nhật page/sections/showcase/redesign và tests/codex-landing-browser.mjs; test mới tests/codex-sticky-navigation-browser.mjs. Đang tích hợp/phát hành. Rollback trước sửa dpl_43P1wwXLKwqhybb493YWDa7Rg5XX. Evidence candidate reports/codex-floating-navigation-20260916. Lesson docs/lessons/codex-floating-navigation-20260916.md.
