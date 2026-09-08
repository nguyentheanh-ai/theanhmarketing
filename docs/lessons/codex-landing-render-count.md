# Đếm HTML hiển thị, không đếm chuỗi dữ liệu React

- Áp dụng: smoke test Next.js App Router dùng HTML server-rendered kèm React Flight.
- Quan sát: tìm chuỗi class không giới hạn trong toàn response đếm 16 cảnh, trong khi DOM browser có 8; HTML còn chứa bản sao được escape trong dữ liệu React.
- Cause: VERIFIED trên preview Codex 1f54159. Đây là false positive của script smoke, không phải lỗi giao diện.
- Sửa: kiểm tra DOM browser; khi đọc HTTP, giới hạn vào thuộc tính HTML thật, không tính chuỗi escaped của Flight.
- Kiểm chứng: preview có 8 phần minh họa và 15 section; browser local/live đều 8/15. Không đổi source trang để làm bài test sai trở thành xanh.
- Giới hạn: đếm thuộc tính HTML vẫn chỉ là smoke test; không thay thế kiểm tra render, chức năng hoặc accessibility trong browser.
