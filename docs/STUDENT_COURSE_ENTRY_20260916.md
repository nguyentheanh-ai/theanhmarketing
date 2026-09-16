# Vào khóa học từ khu vực học viên


## 16/09/2026 — Vào trực tiếp các khóa học đã mở quyền

READY_FOR_OWNER_RELEASE_APPROVAL. Project `theanh-main`; worktree `worktrees/student-course-entry-20260916`, branch `fix/student-course-entry-20260916`, base canonical `73e32283d4f8e8f059a8593fe627d55bae30647b`. Chưa tích hợp canonical/push/deploy.

Khu vực `/dashboard` có danh sách chọn nhanh toàn bộ khóa đã mở quyền ở đầu trang. Ảnh, tên và nút Vào học của khóa sở hữu dùng cùng đường dẫn; danh sách khóa tại `/tai-khoan` cũng vào thẳng từng khóa. FBA dùng `/learn/facebook-ads-2026`, route hiện có chọn bài published theo thứ tự chương/bài; Agent Kit dùng `/learn/bo-agent-kit-x10-hieu-suat-cong-viec/agents`; Ebook giữ reader/PDF. Không lấy khóa chưa sở hữu làm khóa đang học. Giữ cách gộp quyền paid-order/LMS, các kiểm quyền ở trang đích, tiến độ, Auth, payment/email/tracking và landing. Không mutation DB, đơn, quyền khách, tài khoản hay gửi thông báo để QA.

Nguồn sửa: `components/app/student-dashboard.tsx`, `app/tai-khoan/page.tsx`, `lib/student-dashboard-courses.ts`, `lib/student-course-navigation.ts`; test mới `tests/student-course-entry.test.mjs`. 4 lỗi hành vi đã tái hiện trước sửa, 7 kiểm tra hành vi mới đạt sau sửa; tổng 90 kiểm tra liên quan đạt. TypeScript, ESLint cả 5 file thay đổi, diff check và Next Webpack build108/108 đạt. Full lint 119 errors/8724 warnings: toàn bộ errors nằm trong 7 public JS bundles và test lifecycle không thay đổi so với HEAD; không tuyên bố full lint đạt. Chưa browser visual/authenticated customer E2E hay live của bản sửa này.

Đã đọc registry/rules/policy/active tasks, context index/session state/feature registry/role/checklist; child AGENTS/CURRENT_STATE/FEATURE_MAP, handoff, DESIGN_RULES/SECURITY_HARDENING, student/database contracts và tài liệu Next use-client/Link. Bước sau: anh duyệt production; kiểm lại canonical/concurrent changes, tích hợp exact diff, preflight đúng release root, build/phát hành rồi kiểm protected routes và các landing đang chạy. Handoff: `docs/STUDENT_COURSE_ENTRY_20260916.md` trong worktree.

Bằng chứng build: `/Users/theanh/CodexProjects/Kinh doanh/.codex-local/student-course-entry-build-20260916.log`; full lint: cùng thư mục `student-course-entry-lint-20260916.log`.


### 16/09/2026 — Bổ sung yêu cầu: khóa đã mua đứng đầu, khóa khác màu xám

Thay thế cách hiển thị danh sách chọn nhanh của lượt trước: toàn bộ phần thẻ `Khóa học của tôi` chuyển lên ngay dưới lời chào, trước thẻ học tiếp/hỗ trợ. Nhóm Đã mở quyền hiển thị trước nhóm Khóa học khác. Thẻ chưa sở hữu hoặc status không phải open dùng grayscale + opacity75; nhãn Chưa mua/Chưa mở bán/Đã đóng đăng ký theo trạng thái. Giữ link học với quyền đã cấp, kể cả khóa đã đóng đăng ký; màu xám không thu hồi quyền. Giữ đủ FBA và Agentkit cùng danh sách, bấm vào đúng nơi học như bản trước.

15 kiểm tra dashboard/account/hành vi đạt, gồm thứ tự thực tế của cây giao diện và trạng thái màu xám; TypeScript/scoped lint/diff check và bản dựng Next Webpack108/108 đạt sau thay đổi. Các kiểm tra quyền/landing90tests ở lượt trước vẫn là bằng chứng cho phần mã không đổi; không gọi đó là90tests được chạy lại ở lượt này. Full lint119errors baseline theo biên bản trước. Chưa phát hành, chưa browser/phiên học viên thật; chờ xác nhận production đã hỏi trước đó. Build log: `.codex-local/student-course-entry-owned-first-build-20260916.log` tại workspace điều phối.


## 16/09/2026 — Dashboard khóa đã mua trước ĐÃ LIVE

DONE, thay thế các trạng thái chờ duyệt/chưa phát hành phía trên. Owner đã yêu cầu “đưa lên đi” trực tiếp trong task. Runtime `b48f6bf1564e8f561c4a5830351788328bf3a74c` đã fast-forward canonical/push; preflight exact-root/remote đạt. Preview `dpl_A3LZuQXJQgHUS29qu8xYtgUBmVBM` READY, promote qua CLI thành production `dpl_DRuXSPXoNKovEijL6EHNuD4tukWf` READY. API xác minh cả www/apex trỏ đúng SHA.

Dashboard đặt toàn bộ thẻ khóa đã mở quyền ở đầu, tiếp theo là Khóa học khác màu xám; khóa chưa mở bán cũng xám/có nhãn theo trạng thái. FBA/Agentkit xuất hiện cùng nhau nếu đều có quyền; ảnh/tên/nút và danh sách tài khoản vào trực tiếp đích học. Không thay quyền, DB, Auth, tiến độ, thanh toán, email, tracking hay landing.

91tests liên quan trên canonical đạt; TypeScript/scoped ESLint/local Webpack108 và remote preview/production build đạt. Full lint còn119errors trên file baseline không đổi như phần trên; không tuyên bố full lint đạt. 16HTTP readbacks giữ nguyên trạng thái/đích: dashboard/account/FBA/library về đăng nhập khi guest, download401/unknown404;7landing200,5static SHA-256 giữ nguyên. HTML động Agentkit/Codex thay đổi theo bản dựng, source các route không đổi. Runtime error/fatal query15phút đúng deployment tại06:34:34UTC không trả dòng lỗi. Chưa visual hoặc authenticated student browser E2E; không tạo khách/đơn/email thử.

Evidence: `/Users/theanh/CodexProjects/Kinh doanh/reports/student-course-entry-20260916/` gồm deployment.json, live-aliases.json, live-smoke-before/after.json, runtime-errors.json, release-tests.log. Rollback `dpl_6eVQv8woSw3tcJowaHApxFCJsMcw`. Không còn bước phát hành chờ xử lý; giới hạn QA đăng nhập thật được ghi rõ.
