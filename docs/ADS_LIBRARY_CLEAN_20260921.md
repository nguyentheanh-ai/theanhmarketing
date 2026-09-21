# Thư viện kiến thức Facebook Ads — giao diện gọn


## 21/09/2026 — Landing bán Thư viện kiến thức Facebook Ads (LOCAL_REVIEW)

Anh xác nhận “Landing bán thư viện”, tiếp tục hướng clean của Facebook Ads. App theanh-main; route /academy/ebook-facebook-ads-2026-premium xác minh qua data/courses.ts và next.config.ts. Worktree worktrees/ads-library-clean-20260921, nhánh codex/ads-library-clean-20260921, base2e04d9f. Doctor remote PASS.

Chỉ sửa CSS trong public/ladipage/ebook-facebook-ads-2026-premium.html và public/academy/ebook-facebook-ads-2026-premium.html, mirror byte-identical. Nền than/vàng/kem, bỏ grid/glow dày, thống nhất heading/card/button; section64desktop/40mobile; hero không ép100svh;6preview tile thành2cột mobile; nhóm cơ chế dạng icon+nội dung; mục lục10phần số nhỏ cùng hàng; quyền lợi dạng hàng; form dark/viền mảnh/CTA vàng; section rail capsule desktop rộng/vạch3px mobile; sticky/menu có safe-area. Không thêm ảnh tác giả vì bản này không có ảnh tương ứng.

Giữ mọi phần HTML ngoài style và tất cả script nguyên văn so với HEAD: giá399K, bundle1098K, nội dung, ảnh, trang đọc thử/slider, form/invoice, API order, countdown, Pixel/attribution và quyền đọc/PDF. Không sửa Ebook landing cũ hoặc thư viện đọc bên trong.64/64 ebook+Facebook+payment tests PASS, PostCSS parse PASS, diff check PASS; HTTP200 preview trùngsource. Evidence reports/ads-library-clean-20260921.

Preview http://127.0.0.1:4325/academy/ebook-facebook-ads-2026-premium.html . Chưa deploy, chưa build/TypeScript/full lint (CSS tĩnh), chưa browser visual QA theo managed-off policy. Không giao dịch thật. Context dùng lại registry/AGENTS/design/payment/email/handoff và skill landing-page-builder; đọc thêm catalog/routes/tests/source exact Ebook. Bước tiếp theo: anh xem bản thiết kế, duyệt phát hành; khi deploy chạy build + canonical preflight và live verification.


## 21/09/2026 — Duyệt phát hành và cân bằng nút đọc thử

Anh yêu cầu “deloy đi, nút đọc thử phải dài bằng nút đăng ký”. Hero dùng grid1cột/width100% và các nút full-width; cặp CTA trong phần đọc thử dùng2cột bằng nhau desktop/1cột mobile, hàng cùng chiều cao. Không đổi nhãn/link hoặc logic.64/64 tests, TypeScript, scoped ESLint, PostCSS parse, git diff --check và Next production build108/108 đạt. Mọi HTML ngoài style/JS giữ nguyên so với base2e04d9f; mirror byte-identical.

Rollback trước phát hành: dpl_6C8V1PQk8FUANdDXUHLJJ8kMAntJ (Facebook Ads redesign), phải giữ hash landing Facebook Ads sau deploy. Chưa visual QA do policy hiện hữu; anh đã duyệt bản và yêu cầu deploy. Evidence reports/ads-library-clean-20260921.
