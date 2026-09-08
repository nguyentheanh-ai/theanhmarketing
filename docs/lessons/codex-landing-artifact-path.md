# Đường dẫn có dấu cách khi lưu ảnh kiểm thử

- Áp dụng: script Node ESM tạo artifact từ `import.meta.url` trong workspace có dấu cách.
- Quan sát: `new URL(...).pathname` trả `Kinh%20doanh`; ảnh được lưu ngoài vị trí dự kiến và `view_image` báo không tìm thấy.
- Nguyên nhân: VERIFIED, pathname giữ phần trăm mã hóa; thư mục encoded được kiểm tra tồn tại.
- Sửa: dùng `fileURLToPath(new URL(...))`; chuyển đúng thư mục reports vừa tạo về đường dẫn đã giải mã. Không xóa thư mục hoặc dữ liệu khác.
- Kiểm chứng: bộ ảnh đã đọc được bằng view_image ở path đúng; script cuối chạy lại thành công, ghi ảnh và JSON bằng fileURLToPath tại đúng workspace.
- Giới hạn: chỉ chuyển file URL sang đường dẫn local; không giải mã URL HTTP tùy tiện và không áp dụng như một quy tắc sửa tất cả đường dẫn.
