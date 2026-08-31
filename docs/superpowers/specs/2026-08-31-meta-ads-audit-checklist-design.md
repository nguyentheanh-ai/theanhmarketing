# Thiết kế workbook Checklist Audit Tài Khoản Quảng Cáo Meta

Ngày: 2026-08-31  
Phạm vi: tài liệu tải miễn phí trên `theanhmarketing.com/tai-lieu`  
Trạng thái: chủ dự án đã duyệt triển khai workbook Excel tương tác

## 1. Mục tiêu

Hoàn thiện tài liệu đang được giới thiệu trên trang với tên “Checklist audit tài khoản quảng cáo” thành một workbook Meta Ads có thể check trực tiếp. Workbook giúp người tự chạy quảng cáo rà soát nhanh tài khoản, phát hiện lỗi ưu tiên và lập kế hoạch sửa trong 7 ngày.

Workbook phải dễ dùng trong Excel và nhập được vào Google Sheets, tải nhanh, không chứa dữ liệu khách hàng, bí mật tài khoản, cam kết kết quả hoặc ngưỡng hiệu suất được trình bày như chân lý cho mọi ngành.

## 2. Đối tượng và tình huống sử dụng

- Chủ doanh nghiệp, người bán hàng và marketer đang tự vận hành Meta Ads.
- Tài khoản đã hoặc đang có chiến dịch, cần biết nên kiểm tra phần nào trước khi tăng ngân sách.
- Thời gian hoàn thành một lượt audit: khoảng 30–45 phút nếu người dùng đã có quyền xem tài khoản.

## 3. Định dạng bàn giao

- Một file Excel `.xlsx` tương thích Excel và có thể import vào Google Sheets.
- Tên file khách hàng: `checklist-audit-tai-khoan-quang-cao-meta.xlsx`.
- Không dùng checkbox dạng điều khiển phụ thuộc phiên bản Excel; khách chọn trạng thái bằng dropdown để giữ khả năng tương thích.
- Chỉ gửi file nội bộ để duyệt ở vòng đầu. Không upload, không gắn `file_url`, không thay đổi website và không deploy trước khi có xác nhận riêng.

## 4. Cấu trúc workbook

### Sheet `HƯỚNG DẪN`

- Tài liệu dùng để làm gì và không thay thế điều gì.
- Cách chọn trạng thái: Chưa kiểm tra, Đạt, Cần sửa, Không áp dụng.
- Thang ưu tiên: P0 ảnh hưởng khả năng đo lường hoặc an toàn; P1 ảnh hưởng hiệu quả; P2 là tối ưu tiếp theo.
- Thông tin phiên audit: ngày, người thực hiện, tài khoản, mục tiêu kinh doanh chính.
- Giải thích cách tính điểm và cách đọc kết quả.
- Nguồn tham khảo chính thức của Meta bằng URL thuần văn bản.

### Sheet `CHECKLIST`

Mỗi hàng là một tiêu chí, chia thành năm nhóm.

#### Nhóm 1 — Tài khoản, phân quyền và bảo mật

- Business Portfolio, tài khoản quảng cáo, Trang, Instagram và phương thức thanh toán thuộc đúng doanh nghiệp.
- Quyền truy cập theo vai trò; không dùng chung mật khẩu.
- Xác thực hai yếu tố và người quản trị dự phòng.
- Trạng thái tài khoản, giới hạn chi tiêu, cảnh báo thanh toán và tài sản không còn sử dụng.

#### Nhóm 2 — Pixel, CAPI và tracking chuyển đổi

- Dataset/Pixel đúng website và đúng doanh nghiệp.
- Sự kiện chính xuất hiện theo đúng hành vi thật; không bắn trùng Purchase.
- Browser và server event có `event_id` để khử trùng khi dùng CAPI.
- Giá trị, tiền tệ, URL và thời gian sự kiện hợp lý.
- Domain, Aggregated Event Measurement và trang cảm ơn/đích chuyển đổi được kiểm tra.
- Phân biệt “có sự kiện” với “đo lường đủ tin cậy để ra quyết định”.

#### Nhóm 3 — Campaign và Ad Set

- Mục tiêu chiến dịch phù hợp hành động kinh doanh cần tối ưu.
- Sự kiện tối ưu, vị trí chuyển đổi và ngân sách nhất quán với mục tiêu.
- Cấu trúc không bị chia nhỏ quá mức; nhóm quảng cáo không chồng chéo vô lý.
- Đối tượng, vị trí hiển thị, lịch chạy, khu vực và loại trừ phù hợp.
- Thay đổi lớn có ghi nhận để tránh kết luận sai trong giai đoạn phân phối lại.

#### Nhóm 4 — Ads và creative

- Mỗi mẫu quảng cáo có một góc tiếp cận rõ, thông điệp khớp đối tượng và offer.
- Nội dung, hình/video, tiêu đề, CTA và URL đích nhất quán.
- Kiểm tra hiển thị ở các placement quan trọng, chữ bị cắt, ảnh sai tỷ lệ và link lỗi.
- Phân biệt creative đang thử nghiệm với creative đang mở rộng.
- Ghi nhận dấu hiệu mỏi quảng cáo bằng xu hướng dữ liệu, không dựa vào một chỉ số đơn lẻ.

#### Nhóm 5 — Landing page, offer và luồng chuyển đổi

- Quảng cáo và trang đích hứa cùng một điều.
- Trang tải ổn trên điện thoại; CTA chính dễ thấy và biểu mẫu hoạt động.
- Giá, ưu đãi, điều kiện, bằng chứng và thông tin liên hệ rõ ràng.
- Luồng từ click đến lead/order/payment không có bước chết.
- Kiểm tra bằng một lượt thử không tạo giao dịch thật nếu chưa được phép.

Phần đầu sheet có các ô tổng hợp bằng công thức: số mục đã kiểm tra, số mục đạt, số mục cần sửa, số lỗi P0 và điểm hoàn thành. Màu trạng thái thay đổi tự động bằng conditional formatting.

### Sheet `KẾ HOẠCH 7 NGÀY`

- Bảng ghi lỗi gồm: vấn đề, bằng chứng, mức P0/P1/P2, người phụ trách, hạn xử lý và trạng thái.
- Chọn tối đa ba việc quan trọng nhất thay vì sửa đồng loạt.
- Kế hoạch 7 ngày: sửa đo lường/an toàn trước, sau đó cấu trúc và creative, cuối cùng mới quyết định tăng hoặc giảm ngân sách.
- Ô ghi ngày audit lại và kết luận sau thay đổi.

## 5. Cột dữ liệu của checklist

Mỗi tiêu chí có bốn phần ngắn:

1. Mã tiêu chí.
2. Nhóm audit.
3. Câu hỏi kiểm tra.
4. Bằng chứng cần xem.
5. Mức ưu tiên P0/P1/P2.
6. Trạng thái dạng dropdown.
7. Ghi chú của người audit.
8. Hành động đề xuất nếu chưa đạt.
9. Người phụ trách.
10. Hạn xử lý.

Các bảng dùng cột có độ rộng theo nội dung, freeze pane, filter và wrap text. Ô người dùng nhập có nền vàng nhạt; ô công thức được phân biệt và không yêu cầu nhập tay.

## 6. Hệ thống trình bày

- Phong cách checklist thực hành, sạch và chuyên nghiệp; dùng nhận diện xanh đậm, xanh sáng và điểm nhấn vàng của The Anh.
- Tiêu đề phân cấp rõ; không dùng ảnh trang trí nặng.
- Ẩn gridlines, dùng border nhẹ có chủ đích và giữ bảng trong vùng nhìn hợp lý.
- Màu xanh biểu thị Đạt, đỏ biểu thị Cần sửa, xám biểu thị Không áp dụng và vàng biểu thị ô cần nhập.

## 7. Kiểm tra chất lượng

- Đối chiếu thuật ngữ Meta hiện hành trước khi xuất bản.
- Kiểm tra toàn bộ checklist không có tiêu chí trùng, câu mơ hồ hoặc lời hứa hiệu suất.
- Kiểm tra công thức tổng hợp, dropdown, filter, định dạng ngày và mọi tham chiếu giữa các sheet.
- Quét lỗi công thức `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` và `#N/A`.
- Render toàn bộ ba sheet thành ảnh và kiểm tra chữ cắt, cột quá rộng, hàng quá cao, màu khó đọc và lỗi tiếng Việt.
- Kiểm tra file `.xlsx` mở được và không chứa metadata nhạy cảm.
- Sau khi chủ dự án duyệt nội dung, bước upload/gắn link và deploy phải được xác nhận riêng tại thời điểm thực hiện.

## 8. Ngoài phạm vi vòng này

- Không tạo Google Sheet trực tuyến hoặc link chia sẻ ở vòng duyệt đầu.
- Không lấy dữ liệu thật từ tài khoản quảng cáo hoặc khách hàng.
- Không thay đổi database, trang `/tai-lieu`, CMS hoặc production.
- Không gửi email, đăng bài hoặc công bố file ra bên ngoài.
