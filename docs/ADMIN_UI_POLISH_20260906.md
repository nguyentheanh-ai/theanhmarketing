# Màu sắc và hiệu năng quản trị

Trạng thái: đã phát hành. Bằng chứng và giới hạn kiểm chứng được giữ trong workspace riêng.

Lớp CSS tương thích của màn cũ không còn ép màu lên các vùng quản trị mới. Nút tạo học viên và các hành động chính có nền xanh/chữ trắng; các bước và vùng thông tin dùng nền nhạt. Cảnh báo và hành động nguy hiểm giữ đúng màu riêng. Các quy tắc CSS ngoài phạm vi admin không đổi.

Cửa sổ tạo học viên dùng modal native chung, xử lý focus/cuộn/phím Escape và khóa đóng trong lúc thao tác. Hai chế độ giữ bản nháp khi đổi qua lại; biểu mẫu tải khi mở. Gửi form thanh toán có chặn gửi đồng thời và try/finally; lỗi mạng hoặc phản hồi lỗi giữ input và nhắc kiểm tra kết quả trước khi gửi lại. Không tự retry thao tác tạo đơn hoặc email.

Trang hồ sơ chỉ lấy slug/title cho lựa chọn khóa học, và tóm tắt chương/bài cho thống kê quyền học. Không đọc nội dung bài và tài liệu vào danh bạ. Thứ tự khóa học được giữ, index email tái sử dụng quy tắc quyền hiện có; không cache quyền xuyên yêu cầu. Tìm kiếm lập chỉ mục theo danh sách và trì hoãn cập nhật kết quả để việc gõ không phải chờ; chuyển trang/lọc đưa danh sách về đầu. Tra Auth chỉ khi mở phần tài khoản.

Kiểm chứng gồm selector CSS/độ tương phản palette, React draft/busy/async form và so sánh kết quả quyền học trước–sau tối ưu. Không thao tác khách thật để QA. Mã kiểm thử tại tests/admin-ui-polish.test.mjs; runtime test riêng cần css-select, htmlparser2 và postcss ngoài các dependency production. Bằng chứng phát hành chi tiết giữ trong workspace riêng. Chưa có nghiệm thu trực quan bằng phiên đăng nhập thật do chính sách trình duyệt máy.
