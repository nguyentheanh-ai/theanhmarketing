# Kiểm tra mã số thuế tại checkout

Áp dụng: main-site, shared normalizeInvoiceInput và form Bộ Kit ngày16/09/2026.
Quan sát: regex hiện tại chỉ nhận10chữ số hoặc10-3; chuỗi12chữ số bị từ chối trước tạo đơn. Bộ Kit đặt nút trước các ô hóa đơn.
Nguyên nhân VERIFIED ở source/test; chưa chứng minh phiên thao tác cụ thể của khách.
Quyết định owner: bỏ kiểm tra định dạng MST, vẫn cần nhập thông tin hóa đơn. Không suy diễn quy tắc thuế pháp lý.
Sửa: MST văn bản không rỗng sau cleanText; CTA sau toàn bộ hóa đơn; lỗi role=alert trước CTA.
Xác minh: kiểm tra mã10/12/chi nhánh/tự do, giữ số0đầu, không rỗng, các ô còn lại, thứ tựform và coupon/countdown;100tests đạt.
Giới hạn: không xác thực MST với cơ quan thuế, không tạo đơn hoặc email thử. Bản sửa12số trong ghi nhớ cũ chưa deploy không đại diện mã đang chạy.

Production verification:81459c5/dpl_Bnt7rGWoY4wQAxoBffiVD64nbSsp READY. Mã12chữ số/văn bản qua invoice validation, MST trống bị chặn; tất cả request dừng trước tạo đơn do cố ý thiếu khóa học. Bundle live byte-match,16route/4static hashes giữ nguyên.
