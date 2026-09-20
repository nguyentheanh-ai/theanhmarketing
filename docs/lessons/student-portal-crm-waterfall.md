# Dashboard học viên không cần tải toàn bộ CRM

Applicability: main-site Next.js portal khi snapshot dùng getLeads/getPaymentOrders cho một phiên học viên.

VERIFIED (source/query tests): getLeads tải đơn lần nữa và email logs; portal đợi xong CRM rồi mới gọi LMS; dashboard chờ ghi activity. Đây là các công việc không cần thiết trên đường trả UI. Chưa có số đo production để quy toàn bộ triệu chứng lag về riêng chúng.

Correction: service portal riêng đọc email literal, paid orders và access overrides, có paging; catalog summary bỏ body/resources; LMS dùng trạng thái/đếm bài; independent reads song song; activity dùng after; dashboard render ở server và có loading/error.

Verification: tests actual query builder, paging, errors, no identity; paid/LMS union, deposit, grant/revoke và expiry; deferred activity; UI responsive. Không chia sẻ cache quyền giữa người dùng.

Limits: không áp dụng summaryOnly cho trang bài học cần video/body/resources. Không dùng CUA screenshot fixture để khẳng định authenticated E2E. RPC enrollment toàn bộ vẫn còn, chỉ tối ưu tiếp khi có schema/identity contract và đo đạc phù hợp.

Observed correction: bọc Auth guard bằng Suspense khiến guest `/dashboard` trả HTTP200 rồi redirect trong stream, khác hợp đồng307 hiện hành. Giữ layout kiểm Auth trước render; loading chỉ bao phần nội dung. Không di chuyển guard vào boundary chỉ để có skeleton sớm.
