
## 18/10/2026 — Giai đoạn 2: snapshot mới và công cụ delta D1

Project `theanh-main` và `student-resource-app`; nhánh thực hiện riêng `codex/cloudflare-native-phase2-20261018` tại `/Users/theanh/CodexProjects/Kinh doanh/_cloudflare-migration/phase2-main`, base A538889f. Hai release roots A/B không sửa; không deploy, không đổi secret/quyền/DNS/source writer, không sửa Adplan hoặc11filedirty cũ.

Đã đọc lại Source:139bảng ứng dụng/161RLS/723Authuser. Dùng PAT cũ trong Keychain đã xác minh SELECT1 chỉ đọc, xuất snapshot ứng dụng bằng một SELECT/MVCC riêng từng project vào image AES256: A81bảng/32.392hàng lúc11:14:25UTC, B58bảng/7.882hàng lúc11:15:16UTC. Kiểm139digest khớp manifest; clone/khôi phục mirror cục bộ131bảng không có cột bị lược bỏ đạt. Tám bảng gồm orders bị chặn vì redaction; Auth/Storagebytes không nằm trong snapshot mới. Image đã unmount. Không phải backup toàn bộ hoặc dữ liệu final/cutover.

Công cụ mới: `export-consistent-app-mirror.py`, `reconcile-d1-mirror.py`, `inventory-supabase-dependencies.mjs`, SQL catalog và3bộ test. Delta16+exporter5+AST5 đạt; reviewer không phát hiện lỗi chặn trong scope, đã sửa PRIMARY KEY INCLUDE. Rà import tĩnh A141/157entrypoint và B59/87có đường phụ thuộc Source; không phải tỷ lệ chức năng hỏng/đã chuyển. Sourcegatesproduction đọc lại vẫnOFF; homepage200/learn307login/B307login chỉ là HTTP khách chưa đăng nhập.

Trạng thái **IN PROGRESS**; chưa READY FOR CUTOVER dữ liệu. Bước tiếp theo: Auth/cột nhạy cảm bảo toàn mã hóa; delta hai thời điểm thật; native admin/CRM/orders/LMS A và quyền/workspace/resources B; phân quyền/RLS, privateR2, sourcefence và rollback giữ ghi mới. Không hủy Supabase/Vercel. Mọi phê duyệt production mới gom một danh sách khi đủ kết quả kiểm chứng.

Chi tiết và giới hạn: `/Users/theanh/CodexProjects/Kinh doanh/_cloudflare-migration/phase2-main/docs/PHASE2_PROGRESS_20261018.md`; bằng chứng an toàn tại `reports/cloudflare-phase2-20261018/real-snapshot-rehearsal.json`. Không commit bản sao dữ liệu; chỉ commit mã và báo cáo số lượng/digest.
