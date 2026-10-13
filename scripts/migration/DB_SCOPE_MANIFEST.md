# Danh sách bảng A tại thời điểm audit

`main-business-tables.manifest.json` là danh sách chỉ đọc của 81 bảng nghiệp vụ thuộc hai schema `public` và `crm_v2` trong Supabase project A ngày 13/10/2026. Mỗi phần tử gồm schema, tên bảng và cột khóa chính. Danh sách này giúp bộ xuất và đối soát phát hiện bảng bị bỏ sót, đặc biệt `crm_v2` chứa đơn hàng, quyền học và tiến độ.

Danh sách không bao gồm schema do Supabase quản lý (`auth`, `storage`), dữ liệu, policy, function, trigger hoặc thứ tự nhập theo khóa ngoại. Đây không phải bản sao lưu hay schema D1. Trước backup và trước chuyển nguồn ghi, chạy lại kiểm kê SQL và so sánh với manifest; mọi chênh lệch phải được giải thích. Không xuất hàng thật vào Git.
