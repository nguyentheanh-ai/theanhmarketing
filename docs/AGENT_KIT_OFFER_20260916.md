# Landing Agent Kit — bản sửa chờ duyệt phát hành


## 16/09/2026 — Landing Agent Kit: form gọn, ưu đãi và Video Studio

WAITING_OWNER (duyệt phát hành): nguồn và bundle đã sửa cho `/academy/bo-kit-agent-doanh-nghiep`; giá gốc 2.599.000đ, ưu đãi 990.000đ chỉ xuất hiện một cụm trong offer. Form nhỏ gọn nằm cột phải offer, mobile xếp dọc; nền xanh đậm/chữ sáng, rút nội dung, bỏ preorder khỏi bundle/FAQ/SEO. Thêm đúng 5 video từ catalog Studio, tổng 7; giữ poster và không tự phát. Nút mục lục ẩn khi form vào viewport để không che nội dung.

Gói mới `agent-kit-offer-990` trong orderService tính 990000 cho đúng Agent Kit slug. Không sửa standard-999, lịch sử preorder, worker cọc/phần còn lại, checkout/SePay/email/quyền/tracking hay các landing khác. Metadata/catalog chung và các trang pháp lý lịch sử chưa thay đổi vì nằm ngoài landing; component checkout cũ không mount vẫn giữ nguyên. Không tạo đơn thật, không gửi email, không mutation DB.

Kiểm tra: doctor remote PASS (HEAD ban đầu e81f3de); 85 tests PASS; TypeScript PASS; ESLint các file sửa PASS; Vite PASS; Next webpack build108 PASS. Chrome headless localhost1440/390/320: không overflow, đúng1form trong offer, mỗi giá xuất hiện1lần, không preorder/999.000; invoice + lỗi API giả lập phục hồi nút submit PASS.7video đã phát (duration/currentTime/videoWidth kiểm tra). Full eslint không đạt:103errors/7999warnings gồm public JS compiled và test lifecycle cũ; không coi scoped lint là full lint PASS.

Chưa push/deploy/preflight production. Handoff `docs/AGENT_KIT_OFFER_20260916.md`; evidence `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/agent-kit-offer-20260916`. Phải xin xác nhận phát hành theo workspace policy; khi được duyệt chạy exact-root preflight và verify live. Source gốc đã đồng bộ10file, bản trước lưu source-before. Không stage bundle trung gian `index-DRg0gN6G.js` (untracked); bundle cuối `index-CAc6PztN.js`, CSS `index-BthB_yEr.css`.

## Nguồn

- Vite source: /Users/theanh/CodexProjects/Hệ thống quảng cáo/05_Ke_hoach_Marketing/landing-pages/doi-ngu-nhan-su-ai
- Candidate reproducible: /Users/theanh/CodexProjects/Kinh doanh/.codex-local/agent-kit-offer-20260916/landing
- Source diffs: App, content, offerPhase, styles; Hero, RegistrationForm, StickyCta, FloatingToc, RealResultsSection; index.html.
- Website: route metadata/CSS, bundle loader, public HTML/bundle/CSS/media, services/orderService.ts,3 tests.
- Cần giữ đủ10media Studio (5MP4/5poster), không chép project.json/voice/dữ liệu Studio khác vào public.


## Phê duyệt phát hành

Anh đã xác nhận “duyệt” trong task này. Chuẩn bị phát hành bản đã kiểm tra trên canonical HEAD kế thừa6f13878 (sửa căn chỉnh combo đã được task riêng hoàn tất, chờ root hết dirty). Không sửa thêm trang combo. Giữ bundle trung gian index-DRg0gN6G.js như tài nguyên không được tham chiếu: cleanup policy không cho xóa public; không nới policy. Bundle runtime vẫn là index-CAc6PztN.js.


## 16/09/2026 — Agent Kit ưu đãi 990.000đ ĐÃ LIVE

DONE. Thay thế các trạng thái WAITING_OWNER/auto-review-blocked ở trên. Promote bản chung được auto-review chấp nhận trong task Facebook Ads có xác nhận trực tiếp của anh cho cả hai phần. Production `dpl_6eVQv8woSw3tcJowaHApxFCJsMcw` READY, runtime HEAD `b919fc4bfa07d3bdd47627159a05c7ad2b2507b7` gồm Agent Kit `d9432e6`; www/apex đã nhận bản mới. Không có lượt promote song song.

Live Agent Kit: route200 cả www/apex, loader Next chunk trỏ bundle `index-CAc6PztN.js`, CSS `index-BthB_yEr.css`; bundle/CSS byte-match source; 5MP4 và5poster Studio đều200/SHA-256 khớp. Chrome production1440/390/320 không overflow, đúng1form trong offer,2.599.000đ và990.000đ mỗi mức1lần,không preorder/999.000; mục lục ẩn khi form hiện. Cả7video đã phát và currentTime tăng. Đã xem ảnh mobile production. Gói `agent-kit-offer-990` tính990000 đã kiểm source hành vi và provenance production, không tạo giao dịch thật.

85tests trước phát hành và48tests trên HEAD chung đạt; TypeScript/build108/scoped ESLint đạt. Full lint vẫn có lỗi đã ghi ở phần trước, không tuyên bố full lint PASS. Log query đúng production15phút không trả error/fatal.4landing khác đều200; Ebook/AI giữ checksum; Facebook Ads khớp source bản chung đã duyệt; HTML động Codex khác hash theo bản dựng, source Codex không đổi. Không mutation dữ liệu khách, thanh toán, email hoặc Purchase tracking để QA.

Evidence: `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/agent-kit-offer-20260916/live-after.json`, `live-browser.json`, `live-video-playback.json`, `live-offer-1440.png`, `live-offer-390.png`, `live-offer-320.png`. Rollback trước bản chung: `dpl_8Shd2rMCgijqmUDN2tvRBHVA7Bh5`. Không còn chờ duyệt hay bước phát hành cho thay đổi này.
