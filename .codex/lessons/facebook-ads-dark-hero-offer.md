# VERIFIED — Không dùng màu chữ của form sáng trong hero tối

Phạm vi: landing Facebook Ads Master 2026, HTML tĩnh source/published.
Quan sát: banner dùng selected-plan-note có chữ #2c160b; ảnh chủ dự án chứng minh gần như chìm trên hero tối. Kiểm tra HTML/build không phát hiện lỗi tương phản này.
Nguyên nhân đã xác minh: tái sử dụng lớp màu của form nền sáng cho banner trên nền tối.
Sửa: hero-combo-offer riêng, nền #251a10 và chữ #fff3dd; badge/giá vàng #ffbd59.
Xác minh: xem screenshot Chrome headless với font thật desktop/mobile, đo CTA bằng nhau ở 4 viewport; 42 kiểm tra chức năng đạt.
Giới hạn: không đổi selected-plan-note của form sáng; không suy tests chuỗi hay build PASS là kiểm chứng giao diện.
