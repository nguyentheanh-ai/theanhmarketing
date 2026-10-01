# Bố cục bảng sale — xác nhận từ phản hồi người dùng

Áp dụng: dashboard sale riêng của repo, 01/10/2026.
Quan sát: bản có card bộ lọc riêng/KPI lớn và hai nhãn đơn trên một khách bị chủ dự án từ chối.
Nguyên nhân: bố cục không khớp thao tác kiểm khách theo hàng; không phải lỗi dữ liệu thanh toán.
Sửa đã yêu cầu: lọc cùng thanh đầu danh sách;6cột Ngày,Tên,SĐT,Tình trạng,Sản phẩm viết tắt,Email. Chỉ Paid xanh/Unpaid đỏ.
Quy tắc triển khai: khách có >=1đơn paid là Paid; còn lại Unpaid. Không đổi trạng thái các đơn bên dưới.
Xác minh: model/filter/CSV/render và tương tác đạt34tests; chưa xác nhận thẩm mỹ của chủ dự án cho bản sửa.
Giới hạn: chỉ áp dụng view khách hàng này; không suy ra trạng thái đơn hàng hoặc doanh số theo ngày.
