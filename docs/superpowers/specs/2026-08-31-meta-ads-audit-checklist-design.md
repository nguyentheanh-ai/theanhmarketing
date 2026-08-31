# Thiết kế tài liệu Checklist Audit Tài Khoản Quảng Cáo Meta

Ngày: 2026-08-31  
Phạm vi: tài liệu tải miễn phí trên `theanhmarketing.com/tai-lieu`  
Trạng thái: chờ chủ dự án duyệt bản thiết kế trước khi sản xuất tài liệu

## 1. Mục tiêu

Hoàn thiện tài liệu đang được giới thiệu trên trang với tên “Checklist audit tài khoản quảng cáo” thành một checklist Meta Ads có thể dùng ngay. Tài liệu giúp người tự chạy quảng cáo rà soát nhanh tài khoản, phát hiện lỗi ưu tiên và lập kế hoạch sửa trong 7 ngày.

Tài liệu phải dễ đọc trên điện thoại, tải nhanh, không chứa dữ liệu khách hàng, bí mật tài khoản, cam kết kết quả hoặc ngưỡng hiệu suất được trình bày như chân lý cho mọi ngành.

## 2. Đối tượng và tình huống sử dụng

- Chủ doanh nghiệp, người bán hàng và marketer đang tự vận hành Meta Ads.
- Tài khoản đã hoặc đang có chiến dịch, cần biết nên kiểm tra phần nào trước khi tăng ngân sách.
- Thời gian hoàn thành một lượt audit: khoảng 30–45 phút nếu người dùng đã có quyền xem tài khoản.

## 3. Định dạng bàn giao

- Một PDF A4 đúng 7 trang, tối ưu để tải và đọc trên điện thoại.
- Một DOCX có cùng nội dung để chủ dự án chỉnh sửa sau này.
- Tên file khách hàng: `checklist-audit-tai-khoan-quang-cao-meta.pdf`.
- Chỉ gửi file nội bộ để duyệt ở vòng đầu. Không upload, không gắn `file_url`, không thay đổi website và không deploy trước khi có xác nhận riêng.

## 4. Cấu trúc nội dung

### Trang 1 — Bắt đầu audit

- Tài liệu dùng để làm gì và không thay thế điều gì.
- Cách đánh dấu: Đạt, Cần kiểm tra, Cần sửa ngay, Không áp dụng.
- Thang ưu tiên: P0 ảnh hưởng khả năng đo lường hoặc an toàn; P1 ảnh hưởng hiệu quả; P2 là tối ưu tiếp theo.
- Thông tin phiên audit: ngày, người thực hiện, tài khoản, mục tiêu kinh doanh chính.

### Trang 2 — Tài khoản, phân quyền và bảo mật

- Business Portfolio, tài khoản quảng cáo, Trang, Instagram và phương thức thanh toán thuộc đúng doanh nghiệp.
- Quyền truy cập theo vai trò; không dùng chung mật khẩu.
- Xác thực hai yếu tố và người quản trị dự phòng.
- Trạng thái tài khoản, giới hạn chi tiêu, cảnh báo thanh toán và tài sản không còn sử dụng.

### Trang 3 — Pixel, CAPI và tracking chuyển đổi

- Dataset/Pixel đúng website và đúng doanh nghiệp.
- Sự kiện chính xuất hiện theo đúng hành vi thật; không bắn trùng Purchase.
- Browser và server event có `event_id` để khử trùng khi dùng CAPI.
- Giá trị, tiền tệ, URL và thời gian sự kiện hợp lý.
- Domain, Aggregated Event Measurement và trang cảm ơn/đích chuyển đổi được kiểm tra.
- Phân biệt “có sự kiện” với “đo lường đủ tin cậy để ra quyết định”.

### Trang 4 — Campaign và Ad Set

- Mục tiêu chiến dịch phù hợp hành động kinh doanh cần tối ưu.
- Sự kiện tối ưu, vị trí chuyển đổi và ngân sách nhất quán với mục tiêu.
- Cấu trúc không bị chia nhỏ quá mức; nhóm quảng cáo không chồng chéo vô lý.
- Đối tượng, vị trí hiển thị, lịch chạy, khu vực và loại trừ phù hợp.
- Thay đổi lớn có ghi nhận để tránh kết luận sai trong giai đoạn phân phối lại.

### Trang 5 — Ads và creative

- Mỗi mẫu quảng cáo có một góc tiếp cận rõ, thông điệp khớp đối tượng và offer.
- Nội dung, hình/video, tiêu đề, CTA và URL đích nhất quán.
- Kiểm tra hiển thị ở các placement quan trọng, chữ bị cắt, ảnh sai tỷ lệ và link lỗi.
- Phân biệt creative đang thử nghiệm với creative đang mở rộng.
- Ghi nhận dấu hiệu mỏi quảng cáo bằng xu hướng dữ liệu, không dựa vào một chỉ số đơn lẻ.

### Trang 6 — Landing page, offer và luồng chuyển đổi

- Quảng cáo và trang đích hứa cùng một điều.
- Trang tải ổn trên điện thoại; CTA chính dễ thấy và biểu mẫu hoạt động.
- Giá, ưu đãi, điều kiện, bằng chứng và thông tin liên hệ rõ ràng.
- Luồng từ click đến lead/order/payment không có bước chết.
- Kiểm tra bằng một lượt thử không tạo giao dịch thật nếu chưa được phép.

### Trang 7 — Tổng hợp và kế hoạch sửa 7 ngày

- Bảng ghi lỗi gồm: vấn đề, bằng chứng, mức P0/P1/P2, người phụ trách, hạn xử lý và trạng thái.
- Chọn tối đa ba việc quan trọng nhất thay vì sửa đồng loạt.
- Kế hoạch 7 ngày: sửa đo lường/an toàn trước, sau đó cấu trúc và creative, cuối cùng mới quyết định tăng hoặc giảm ngân sách.
- Ô ghi ngày audit lại và kết luận sau thay đổi.

## 5. Mẫu mỗi tiêu chí

Mỗi tiêu chí có bốn phần ngắn:

1. Câu hỏi kiểm tra.
2. Ô lựa chọn trạng thái.
3. Bằng chứng cần xem hoặc ghi lại.
4. Hành động đề xuất nếu chưa đạt.

Các bảng dùng cột có độ rộng theo nội dung, vùng đánh dấu đủ lớn và câu chữ ngắn để không bị chật trên màn hình nhỏ.

## 6. Hệ thống trình bày

- Phong cách checklist thực hành, sạch và chuyên nghiệp; dùng nhận diện xanh đậm, xanh sáng và điểm nhấn vàng của The Anh.
- Cỡ chữ thân bài đủ lớn để đọc trên điện thoại; tiêu đề phân cấp rõ.
- Không dùng ảnh trang trí nặng. Ưu tiên icon đơn giản, dải màu phân khu và hộp cảnh báo.
- Header ngắn, footer có tên tài liệu và số trang.
- PDF mục tiêu dưới 1 MB nếu không làm giảm độ sắc nét của chữ.

## 7. Kiểm tra chất lượng

- Đối chiếu thuật ngữ Meta hiện hành trước khi xuất bản.
- Kiểm tra toàn bộ checklist không có tiêu chí trùng, câu mơ hồ hoặc lời hứa hiệu suất.
- Render DOCX và PDF thành ảnh, kiểm tra từng trang ở 100% để phát hiện chữ cắt, bảng tràn, khoảng trắng bất thường và lỗi tiếng Việt.
- Kiểm tra PDF mở được, tìm kiếm được chữ, đúng 7 trang và không chứa metadata nhạy cảm.
- Sau khi chủ dự án duyệt nội dung, bước upload/gắn link và deploy phải được xác nhận riêng tại thời điểm thực hiện.

## 8. Ngoài phạm vi vòng này

- Không tạo Google Sheet chấm điểm tự động.
- Không lấy dữ liệu thật từ tài khoản quảng cáo hoặc khách hàng.
- Không thay đổi database, trang `/tai-lieu`, CMS hoặc production.
- Không gửi email, đăng bài hoặc công bố file ra bên ngoài.
