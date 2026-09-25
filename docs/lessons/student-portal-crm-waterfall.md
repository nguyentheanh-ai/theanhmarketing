# Dashboard học viên không cần tải toàn bộ CRM

Applicability: main-site Next.js portal khi snapshot dùng getLeads/getPaymentOrders cho một phiên học viên.

VERIFIED (source/query tests): getLeads tải đơn lần nữa và email logs; portal đợi xong CRM rồi mới gọi LMS; dashboard chờ ghi activity. Đây là các công việc không cần thiết trên đường trả UI. Chưa có số đo production để quy toàn bộ triệu chứng lag về riêng chúng.

Correction: service portal riêng đọc email literal, paid orders và access overrides, có paging; catalog summary bỏ body/resources; LMS dùng trạng thái/đếm bài; independent reads song song; activity dùng after; dashboard render ở server và có loading/error.

Verification: tests actual query builder, paging, errors, no identity; paid/LMS union, deposit, grant/revoke và expiry; deferred activity; UI responsive. Không chia sẻ cache quyền giữa người dùng.

Limits: không áp dụng summaryOnly cho trang bài học cần video/body/resources. Không dùng CUA screenshot fixture để khẳng định authenticated E2E. RPC enrollment toàn bộ vẫn còn, chỉ tối ưu tiếp khi có schema/identity contract và đo đạc phù hợp.

Observed correction: bọc Auth guard bằng Suspense khiến guest `/dashboard` trả HTTP200 rồi redirect trong stream, khác hợp đồng307 hiện hành. Giữ layout kiểm Auth trước render; loading chỉ bao phần nội dung. Không di chuyển guard vào boundary chỉ để có skeleton sớm.

## 26/09/2026 — Trang bài học PC và danh sách mobile (source verified)

- Trang `/learn/[course]/[lesson]` vẫn gọi global CRM dù dashboard đã có service theo email. Reuse `getStudentPortalAccessRecords`, chạy Auth/course và LMS/records song song, activity sau phản hồi. `getCourseBySlug` lọc slug trước tải bài và tài nguyên. Admin/guest không cần tải enrollment toàn bộ.
- Mobile: danh sách nằm sau thư viện tài liệu và nội dung. Đưa thứ tự hiển thị dưới video, có neo cố định; collapse và chỉ mount tài liệu khi mở. PC vẫn giữ danh sách ở cột phải.
- React state hoàn thành khởi tạo từ props không tự reset khi Next tái sử dụng component. Key theo course/lesson tách state và request cũ khỏi bài mới.
- Có pending link và chuyển động ngắn có reduced-motion; không đặt route loading boundary bao quanh page Auth guard để tránh đổi redirect thành streamed HTTP200. Không dùng animation trên toàn bộ main chứa fixed controls vì transform tạo containing block.
- 84 kiểm tra liên quan đạt, gồm query scope, quyền, deferred log, render 80 bài/lazy thumbnails. Chưa đo độ trễ với session học viên thật; RPC enrollment global cho học viên vẫn còn. Không khẳng định production đã hết lag từ các kiểm tra này.


## 26/09/2026 — giới hạn phép đo admin (VERIFIED)
Áp dụng theanh-main production2a3eb94: admin bỏ enrollment RPC nhưng học viên thường vẫn dùng global RPC. Click-to-heading admin3mẫu trung vị2.202s không chứng minh latency học viên thường: HTTP full-response student3mẫu trung vị4.784s. Hai phép đo khác nhau, không dùng để tính cải thiện chéo. Khi verify, dùng đúng vai trò và giữ cùng loại phép đo. Email provisioning có dispatch ledger riêng; email_logs rỗng không đồng nghĩa chưa gửi. Không áp dụng khi runtime/query path đã thay đổi; đo lại phiên thường.
