# CRM Sales: thao tác độc lập với lịch sử — VERIFIED cục bộ

Áp dụng: SalesCareEditor ở CRM Sales, React 19.3, phản hồi người dùng ngày 19/10/2026.
Quan sát: select/note/Lưu đều disabled khi history GET chậm hoặc lỗi. Hai test điều khiển promise tái hiện đúng trạng thái khóa trước sửa.
Nguyên nhân đã xác minh: form dùng loading/ready của history làm điều kiện; history response cũng ghi đè status/note.
Sửa: seed form từ summary đang có trên bảng; history tải riêng, không sửa draft hoặc khóa form. Abort history khi lưu để ngăn phản hồi cũ thay lịch sử mới. Lỗi history có thông báo riêng.
Xác minh: 61 kiểm thử liên quan đạt, gồm edit/save khi history pending, late response không ghi đè draft/lần lưu, history lỗi không khóa form. TS và lint đạt.
Giới hạn: chỉ tách bước đọc lịch sử khỏi thao tác. Lỗi ghi chưa rõ kết quả vẫn cần đọc đối soát trước khi gửi lại; không bỏ phân quyền hoặc kiểm tra server.
