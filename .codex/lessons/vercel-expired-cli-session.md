# Vercel CLI session hết hạn — VERIFIED trong phiên 15/09/2026

Áp dụng: macOS có Vercel CLI đã đăng nhập bằng phiên có refresh token; API thủ công dùng access token hiện tại.
Quan sát: GET deployment trả403 với invalidToken=true và Not authorized. Bản preview được connector xác minh READY.
Nguyên nhân: access token đọc từ phiên CLI không còn hợp lệ. Không suy ra user thiếu quyền project từ403 này.
Sửa: dùng Vercel CLI đã cài, cho CLI tự xử lý phiên xác thực; promote đúng preview đã duyệt và qua preflight thành công, tạo production build. Không in hoặc chép token sang log/docs/script.
Giới hạn: chỉ áp dụng khi invalidToken được xác minh và CLI có phiên hợp lệ có thể refresh; không áp dụng cho forbidden do quyền project hoặc để bypass approval. Không đổi grant/credential settings.
