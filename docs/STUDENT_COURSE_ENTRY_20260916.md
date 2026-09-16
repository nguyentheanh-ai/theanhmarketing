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
