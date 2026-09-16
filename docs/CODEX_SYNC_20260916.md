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
