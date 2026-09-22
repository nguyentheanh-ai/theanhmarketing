# Outline landing chuyên gia — V6 / 22.09.2026

Giá 1.290.000đ; sử dụng khóa Facebook Ads hiện có. Bản local, chưa production.

Thiết kế: nhận diện The Anh Marketing có sẵn; đen–trắng–cam; tiêu đề gọn, nhấn cụm chính; ảnh đúng người tham chiếu, chân dung cắt nửa người.

1. **Đã có khóa học. Biết cách quảng cáo để tuyển sinh.** — `top`
2. **Nhìn vào dữ liệu. Hiểu cách cả hệ thống vận hành.** — `ket-qua`
3. **Khóa học đã sẵn sàng. Người đăng ký thì chưa.** — `phu-hop`
4. **Bạn giỏi chuyên môn. Bạn muốn chủ động tuyển sinh.** — `doi-tuong`
5. **Khách đã nhấp. Điều gì khiến họ đăng ký?** — `quang-cao-chuyen-doi`
6. **Nên chạy lượt truy cập, đăng ký hay lượt mua?** — `muc-tieu`
7. **Một quy trình tuyển sinh. Rõ việc ở từng bước.** — `quy-trinh`
8. **Từ setup Dataset đến tracking chuyển đổi chuyên sâu.** — `pixel-capi`
9. **Xem số liệu thật. Hiểu cách đọc trước khi tăng chi.** — `chien-dich`
10. **Cùng một lượng truy cập. Trang tốt hơn giúp ích thế nào?** — `dau-ra`
11. **Biết chọn chỗ cần sửa trước khi làm lại mọi thứ.** — `doc-so`
12. **Một bộ kế hoạch. Từ câu hỏi của khách đến nội dung tuyển sinh.** — `ke-hoach-tuyen-sinh`
13. **Đọc đúng câu hỏi, viết đúng điều người mua cần.** — `research`
14. **Biết hôm nay làm gì. Biết khi nào mới nên chạy Ads.** — `marketing`
15. **Hết cảnh mở trang trắng rồi nghĩ “hôm nay viết gì?”.** — `content`
16. **Mỗi mẫu quảng cáo trả lời một câu hỏi cụ thể.** — `ads`
17. **Người chưa mua hôm nay có thể vẫn đang cần lời giải đáp.** — `email`
18. **Cho khách một nơi để hiểu và quyết định.** — `landing-da-lam`
19. **Học để tự triển khai trên chính khóa học của bạn.** — `noi-dung`
20. **Nguyễn Thế Anh** — `giang-vien`
21. **Những câu hỏi thật. Những trao đổi trong lúc làm.** — `ho-tro`
22. **Mang khóa học của bạn vào từng phần thực hành.** — `cach-hoc`
23. **Sẵn sàng làm bài bản cho khóa học của bạn?** — `dang-ky`
24. **Bạn có thể đang băn khoăn những điều này.** — `cau-hoi`
25. **Để lần quảng cáo tiếp theo, bạn biết mình đang làm gì.** — `closing`

## Nội dung và nguồn

Thêm tổng quan 3 tháng: 350 triệu chi tiêu, 1,2 tỷ doanh thu, 3+ nhóm đầy 1.000 thành viên, ghi rõ số do chủ dự án cung cấp ngày 22/09, không phải Meta attributed revenue/lợi nhuận/cam kết học viên. Không chia nhỏ thành số tháng giả. Tạo analytics từ đúng 3 dòng Meta 08/2026: bảng, donut tỷ trọng, bộ lọc tính lại, nhận xét và hướng dùng AI. Ẩn tên ở HTML, JSON và trực tiếp trong cả ba ảnh tháng8/tháng9/Tối đa bằng chụp trang local có vùng che; bản gốc chỉ nằm reports/industry-v6, không public. Các số trong ảnh giữ nguyên.

Thêm section tốc độ/chất lượng/CTA của landing; lựa chọn Traffic, CompleteRegistration, InitiateCheckout, Purchase tương tác; mở rộng Dataset/Pixel/CAPI/Test Events/đối soát. Phân biệt mục tiêu chiến dịch với sự kiện. Nội dung mới là diễn giải ứng dụng, không tạo giáo trình quay mới. Tài liệu Meta công khai bị login/429, không dùng nguồn thứ ba để khẳng định thay đổi UI hoặc chính sách mới.


## Kiểm tra

 doctor remote PASS sau chạy ngoài sandbox do DNS; 49/49 tests industry/Facebook/payment PASS; ESLint hai JS PASS, PostCSS parse PASS, diff check PASS. IAB 1440 và mobile390/320: logo, màu, không tràn ngang; bộ lọc CD01 12.309.666đ/35/351.705đ, CD03 5.181.304đ/9/575.700đ; mục lục, mục tiêu Purchase, Zalo tự chạy và dừng khi bấm tiếp, form ẩn sticky khi input vào màn hình. Không tạo đơn/email/Ads mutation/deploy. Chưa full build mới hoặc giao dịch thật; preview4326. Google Sheets từ V5 vẫn chờ xác nhận tài khoản đích; không retry.

Files: public/industry-ads/{chuyen-gia.html,style.css,experience.js,campaign-snapshot.json}, proof/ads-*.png và plans/*.html/*-capture.png. Đã cập nhật outline và handoff. Ảnh kiểm tra reports/industry-proof-20260922/v6-*.png.


## 23/09/2026 — Landing chuyên gia V7: thanh dưới, form và chuyển động lặp (LOCAL_REVIEW)

Đã bỏ chú thích ảnh AI và ghi chú nguồn trên giao diện chính; giữ nhận diện mô phỏng và thông tin cần thiết của gói học. Logo/header phía trên không còn ghim. Mục lục nằm cạnh nút đăng ký trong thanh dưới; thanh ẩn khi form vào màn hình. Form có khung trắng bo32px, viền cam nhạt, thanh bước01/02, ô nhập và tổng tiền đóng khung. Giá vẫn1.290.000đ.

Zalo đổi thành track hai nhóm giống nhau chạy translateX liên tục sang trái (80s/vòng), không thanh trượt/nhảy về đầu; nút tạm dừng, pause khi hover/focus/mở ảnh/ngoài khung nhìn, reduced-motion dùng bản tĩnh kéo được. Sự kiện Pixel/CAPI lặp2.5s khi nhìn thấy, reduced-motion tắt chuyển động.

Chủ dự án nói có5tài khoản tương tự nhưng chưa đưa số từng tài khoản. Thêm bộ chọn dữ liệu gốc/ước tính5tài khoản trong analytics: nhân chi tiêu và lượt mua5lần, CPA không đổi. Có nhãn ước tính và cách tính rõ, không đổi ảnh Meta, không nhân học phí, tổng doanh thu đã cung cấp hoặc thành viên Zalo thành kết quả chưa xác minh. Gốc28.513.898đ/64/445.530đ; ước tính142.569.490đ/320/445.530đ.

Kiểm tra:10tests industry PASS, scoped ESLint, PostCSS và diff PASS. IABdesktop/mobile320:headerrelative,toc nằm trong mobile-cta, không tràn ngang; menu mở và đến form; stickyHidden=true khi input vào khung nhìn; formradius32px; Zalo transform từ0đến-327.84px, infinite/running, pause hoạt động; cả hai tín hiệu tracking infinite/running. BrowserQA từng bị usage-review chặn hôm trước, đã tiếp tục thành công ngày23/09. Không tạo đơn/email/Ads mutation/deploy; không full build mới. Docs/outline và handoff cập nhật.


### 23/09/2026 — Báo cáo mới và giá trị chuyển đổi chủ dự án xác nhận
Thay toàn bộ bảng quy mô ×5 bằng báo cáo từ ảnh mới do anh cung cấp: 24 quảng cáo, 921 lượt mua, CPA71.782đ; ảnh thêm public/industry-ads/proof/ads-september-owner-report.png, mở lightbox được. Tổng giá trị chuyển đổi dùng735.000.000đ theo correction trực tiếp của chủ dự án (cột giá trị trong ảnh setup sai); không sửa ảnh gốc. Bảng chi tiết dùng11dòng nhìn thấy: lượt mua, impressions, CPA; không dùng/phân bổ giá trị chuyển đổi sai. Bỏ toàn bộ chế độ và nhãn ước tính. Giữ bảng3chiến dịch tháng8 độc lập. 10tests industry và ESLint PASS trước correction; JS syntax/diff PASS sau correction. IAB xác nhận735triệu/921/71782và ảnh mở thành công. Restart local4326 session78433, chưa deploy.
