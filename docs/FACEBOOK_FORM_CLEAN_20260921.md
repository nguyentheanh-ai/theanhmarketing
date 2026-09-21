# Form Facebook Ads — giao diện theo ảnh mẫu


## 21/09/2026 — Form Facebook Ads tối giản theo ảnh mẫu (LOCAL_REVIEW)

App theanh-main; base 6edb4dc; nhánh codex/facebook-form-clean-20260921 tại worktrees/facebook-form-clean-20260921. Chỉ thêm CSS giới hạn #hoc-phi vào hai file public/ladipage/facebook-ads-2026.html và public/academy/facebook-ads-master-2026.html. Form nền tối, viền mảnh, CTA vàng, quyền lợi bỏ khung nặng, cột đơn dưới 980px. Thông báo gói lặp giữ cho trình đọc màn hình; summary động vẫn hiển thị. Giữ toàn bộ HTML, nội dung, giá, JS, form, invoice, tracking và backend theo so sánh với HEAD.

Doctor remote PASS; 39/39 landing/payment tests PASS; PostCSS parse PASS; git diff --check PASS; mirror byte-identical. Preview http://127.0.0.1:4324/academy/facebook-ads-master-2026.html#hoc-phi (static server). Không tạo đơn thật, không deploy. Chưa chạy full build/typecheck/lint vì chỉ CSS trong HTML tĩnh; chưa kiểm tra trực quan desktop/mobile do chính sách Computer Use managed-off của workspace. Phần form hóa đơn đã đọc và bổ sung CSS scoped cùng tông.

Context: registry/rules/policy, AGENTS, active/state/feature/start/role docs, payment/email contract, repo current/feature/design/handoff, skill landing-page-builder và using-git-worktrees. Handoff chi tiết: worktrees/facebook-form-clean-20260921/docs/FACEBOOK_FORM_CLEAN_20260921.md. Bước tiếp: kiểm tra trực quan khi có quyền UI thích hợp; duyệt giao diện rồi phát hành qua canonical preflight.

Ảnh tham chiếu: IMG_0241.PNG và IMG_0242.PNG. Chỉ áp dụng ngôn ngữ hình ảnh: nền tối, viền mảnh, khoảng cách thoáng, CTA vàng. Không lấy thông tin offline/ngày/địa điểm/hỗ trợ hoặc cảnh báo của bên tham chiếu. Không thêm trường nhập.

Giới hạn nguồn: không tìm thấy CONTENT_SOURCE_OF_TRUTH.md / DESIGN_SOURCE_OF_TRUTH.md tại CodexProjects và Documents/ChatGPT, Documents/Codex. Dùng nội dung hiện hữu của canonical làm nguồn và chứng minh mọi phần ngoài style giữ nguyên. Registry macOS quyết định root thay các đường dẫn Windows trong repo AGENTS.

Ghi nhận kiểm tra: doctor lần đầu lỗi DNS trong sandbox, chạy cùng doctor có quyền mạng PASS. Static server bind bị sandbox từ chối; quyền mở localhost được chấp thuận, server hoạt động cổng 4324. node_modules dùng cây dependency gián tiếp: require postcss từ root không có; resolve qua package Next hiện hữu parse thành công. Không suy ra module thiếu là package hỏng.


## 21/09/2026 — Đồng bộ toàn bộ section và mobile (LOCAL_REVIEW, tiếp nối form)

Theo ảnh và yêu cầu tiếp theo của anh: ảnh giảng viên crop bằng khung CSS từ hông trở lên (nguồn ảnh giữ nguyên), max400px desktop/300px mobile; hero mobile giảm khung ảnh590→300px; nhịp section64px desktop/40px mobile; chữ, card, nút, màu nhấn vàng đồng bộ; giảm glow/grid nền. Thanh chấm xanh được thay bằng capsule vàng nhỏ trên desktop rộng; <=1279px/coarse pointer dùng vạch tiến độ3px phía trên và mục lục ở sticky hiện hữu. Sticky mobile thu một hàng. Các nhóm vấn đề/kết quả/công cụ/giá trị/FAQ bố trí gọn, giữ mọi nội dung.

Phát hiện source: rule @media(max-width:1020px) dùng .course-outcomes trong nhóm display:none!important, vô tình ẩn cả12 kết quả. Sửa selector thành .hero-pillars đúng phạm vi hero; parser kiểm tra không còn rule ẩn mọi outcome. Trên mobile12 kết quả dùng danh sách đánh số, giữ nguyên văn bản.

Đã sửa hai HTML mirror, cập nhật kỳ vọng màu/cách hiển thị của test section-progress hiện có, cập nhật handoff.39/39 tests PASS; PostCSS parse PASS; so sánh với HEAD chứng minh toàn bộ phần ngoài style của HTML giữ nguyên; git diff --check PASS. HTTP200 và byte equality file served/candidate, ảnh/script tương đối tồn tại. Chưa full build/typecheck/lint (CSS tĩnh; không TS/JS runtime thay đổi), chưa đo chiều cao thực tế hoặc visual QA trình duyệt do policy managed-off. Chưa deploy. Preview: http://127.0.0.1:4324/academy/facebook-ads-master-2026.html?rev=compact2#giang-vien . Mục này thay trạng thái scope “chỉ #hoc-phi” trước đó.


## 21/09/2026 — Anh duyệt deploy, kiểm tra trước phát hành PASS

Owner yêu cầu “Deloy luôn đi em”.39/39 tests, TypeScript, scoped ESLint test file, PostCSS parse, git diff --check và Next production build --webpack108/108 đạt. Build cần quyền mạng để tải Google Fonts; sandbox DNS fail đã được xử lý bằng quyền mạng được chấp thuận, không đổi code. Mọi phần ngoài style của HTML vẫn giống baseline6edb4dc; hai mirror byte-identical. Rollback production trước phát hành: dpl_8ffJ5HrJQsVcnEymv1K3n9BPB7Jp. Visual QA vẫn chưa thực hiện theo policy; anh đã duyệt bản xem thử và yêu cầu deploy. Evidence local reports/facebook-form-clean-20260921.
