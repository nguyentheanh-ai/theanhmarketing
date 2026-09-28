# Đặt lịch hỗ trợ 500K và popup học tập

Trạng thái: LOCAL_VERIFIED, chưa phát hành.

## Phạm vi và quyết định

theanh-main. Worktree `worktrees/support-500k-popup-20260928`, branch `feat/support-500k-popup-20260928`, base `d6db01a`. Theo yêu cầu “toàn bộ là 500K”, mọi loại lịch học viên/khách ngoài và thời lượng hợp lệ đều 500.000đ/buổi, không phụ thu; giữ thời lượng/điều kiện xếp lịch. Đồng bộ constants, wizard, server quote/order/QR và migration `20260928085946_support_booking_flat_500k.sql`. Migration chưa áp dụng production; giữ nguyên lịch và đơn cũ, grants/RLS/khóa chống trùng.

Popup trong LearningRoom: “Bạn gặp vấn đề chưa thể giải quyết?” + “Đặt lịch hỗ trợ 1 kèm 1 ngay”, giá500K. Sau khoảng3phút tab học hiển thị, giữ bộ đếm khi đổi bài, tối đa1lần/24giờ theo trình duyệt, trì hoãn fullscreen, đóng/Escape/tự ẩn45giây, mở đặt lịch tab mới. Có reduced-motion, không tự focus hoặc dừng video. Nếu browser chặn storage, bộ nhớ giữ giới hạn trong lần tải ứng dụng hiện tại; reload không bảo đảm giới hạn.

Kiểm tra:50support/SQL/popup/wizard +34learning/calendar/performance +39revenue-critical =123tests PASS,0skip; TypeScript/scoped ESLint/diff PASS; webpack build108/108 PASS. Đã đọc hàm reserve v2 production chỉ đọc và đối chiếu source. SQL thực thi trong PGlite cô lập xác minh7lựa chọn giá, lịch cũ500K/1M/2.7M, quyền RPC, chống trùng và lịch Chủ nhật. Không tạo đơn/email/lịch thật. Chưa visual QA trong browser, chưa production migration/deploy. Managed UI policy không đổi.

Bằng chứng: `reports/support-500k/{tests.log,learning-tests.log,prebuild.log,typecheck.log,lint.log,build.log}` trong worktree. Bước tiếp: anh duyệt phát hành; tích hợp canonical, chạy doctor/preflight và phối hợp migration+app để tránh cửa sổ giá cũ/mới lệch; đọc lại production amount/grants và smoke landing. Không tự phát hành từ feature root.


## Nguồn đã đọc

Workspace registry, WORKSPACE_RULES, PROJECT_REGISTRY, computer-use-policy, ACTIVE_TASKS; AI_CONTEXT_INDEX, SESSION_STATE, FEATURE_REGISTRY, ROLE_AND_SESSION_PROTOCOL, SESSION_START_CHECKLIST, PAYMENT-FLOW, EMAIL-FLOW, DATABASE-CONTRACT. Repo AGENTS, CURRENT_STATE, FEATURE_MAP, WEBSITE_DEEP_STRUCTURE_HANDOFF, DESIGN_RULES, DATABASE_ARCHITECTURE, SECURITY_HARDENING, SEPAY_SETUP; tài liệu Next.js use-client cục bộ. Source hiện tại và hàm production được ưu tiên hơn ghi chú Windows/lịch sử.

## File chính

- lib/support-booking/constants.ts; components/support-booking/support-booking-form.tsx.
- components/course/learning-room.tsx; support-booking-prompt.tsx và CSS module.
- supabase/migrations/20260928085946_support_booking_flat_500k.sql.
- tests/support-booking*.test.mjs và learning-room-render.test.mjs.

## Phát hành và giới hạn

Migration bổ sung RPC reserve_support_booking_v3 chỉ cho service_role, tính500K; giữ v2 nguyên vẹn cho bản ứng dụng cũ. App mới gọi v3. Áp dụng migration trước, đọc lại giá/quyền/historical rows, rồi phát hành app mới. Nhờ giữ v2, không có khoảng chuyển tiếp app cũ tính1M nhưng RPC tính500K. Rollback app có thể về v2 mà không phá lịch500K đã tạo; không xóa v3/constraint cho phép lịch sử.


Popup chỉ được kiểm hành vi React và CSS/source/build; chưa kiểm bằng mắt trên thiết bị/browser thực. Không có bằng chứng khách đã thấy popup hoặc thanh toán giá mới trên production.


28/09: Anh đã duyệt phát hành và đổi mốc popup thành khoảng3phút. Giữ một lần/24giờ; đang chuẩn bị release.
