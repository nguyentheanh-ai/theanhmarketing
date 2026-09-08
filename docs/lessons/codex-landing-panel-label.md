# Nhãn trên panel tối của landing Codex

- Phạm vi: `.cx-example-sheet` tại `/academy/codex-x10-hieu-suat`, CSS redesign local ngày 08/09/2026.
- Quan sát: screenshot desktop cho thấy nhãn nâu tối trên panel xanh. Quy tắc `.cx-label` hiện hữu dùng `!important`, làm màu sáng trong override thường không có hiệu lực.
- Nguyên nhân: VERIFIED từ CSS và ảnh render, không phải lỗi font hoặc trình duyệt.
- Sửa: override màu sáng `#d4e5c0!important` chỉ cho label trong panel này; không đổi toàn bộ màu label của website.
- Kiểm tra: chụp lại panel desktop/mobile và kiểm tra tương phản trong bản cuối. Không áp dụng cho các panel nền sáng hoặc nhãn ngoài route này.
