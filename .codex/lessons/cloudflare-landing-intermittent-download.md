# Landing Cloudflare tải chập chờn

Phạm vi: chẩn đoán ERR_TIMED_OUT trên landing static qua Cloudflare.

VERIFIED: có lần curl đến hostname apex kết nối TCP xong nhưng không nhận HTTP trong 20 giây; lần sau apex trả 307 đúng hostname www. Bản www có lần trả HTTP 200 nhưng body chỉ tải một phần rồi timeout. Đối chiếu cùng URL: HTTP/1.1 tải đủ 203100 byte trong khoảng 1.23 giây; HTTP/2 có lần chỉ tải 57100 byte trong 18 giây. Cloudflare route và quy tắc canonical apex được đọc lại, không có vòng lặp trong cấu hình quan sát.

CANDIDATE: sự cố truyền tải theo kết nối/protocol/đường mạng. Một cặp so sánh HTTP/1.1 và HTTP/2 chưa chứng minh root cause hoặc lỗi HTTP/2 phổ quát. Không đổi DNS, tắt giao thức hay sửa redirect khi chưa có chứng cứ thêm và quyền thay đổi production.

Cách kiểm: tách connect/TLS/TTFB/total/bytes; thử riêng hostname và IP hiện hành, GET body thay vì chỉ HEAD, quan sát Chrome thật. HTTP 200 header không chứng minh body tải đủ. Lỗi tải trang không chứng minh lỗi webhook hay tất cả người dùng đều bị ảnh hưởng.

Giới hạn: không có cấu hình/source nào được sửa trong lượt chẩn đoán; tải thành công sau đó không chứng minh đã khắc phục. Chỉ báo cáo phạm vi quan sát.
