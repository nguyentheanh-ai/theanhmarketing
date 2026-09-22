# Landing mẫu theo ngành — 22/09/2026

Trạng thái: LOCAL_REVIEW. Project `theanh-main`, base `1718eb9`, nhánh `codex/industry-landing-20260922`. Chưa deploy, chưa tạo đơn/gửi email/cấp quyền học thật.

## Phạm vi đã chốt

Anh yêu cầu một mẫu trước cho 4 nhóm: chuyên gia, bất động sản, sale ô tô, B2B; cùng giá 1.290.000đ. Chưa có giáo trình riêng; anh xác nhận học như khóa Facebook Ads hiện có. Chọn chuyên gia làm mẫu. Chưa tạo 3 landing còn lại.

## Thiết kế và nguồn

Route `/academy/quang-cao-chuyen-gia` rewrite tới `public/industry-ads/chuyen-gia.html`. CSS/checkout dùng file riêng để tái sử dụng; chỉ nội dung mẫu chuyên gia được xuất bản trong bản local. Nền than/vàng/kem, Be Vietnam Pro; hero, vấn đề, hành trình khách, 6 nhóm kiến thức dạng accordion, giảng viên, cách học, form và FAQ. Mobile có CTA ghim, ẩn khi form xuất hiện; hỗ trợ reduced motion.

Ảnh `the-anh-studio.webp` (53.920 bytes) do imagegen tạo từ `public/doi-ngu-nhan-su-ai/images/generated/founder-the-anh.webp`, đã xem ảnh nguồn và kết quả. PNG gốc lưu cùng thư mục. Trang ghi rõ ảnh AI; không dùng làm bằng chứng sự kiện hay học viên. Không thêm testimonial, doanh thu, cam kết, Zoom hoặc giáo trình riêng chưa có.

Đã đọc registry/control/policy, AGENTS hai cấp, active/state/feature/start/role, Payment/Email contracts, CURRENT_STATE/FEATURE_MAP/handoff/design/database/SePay docs và mã nguồn checkout hiện tại. Không tìm thấy file CONTENT_SOURCE_OF_TRUTH.md/DESIGN_SOURCE_OF_TRUTH.md tại các root macOS đã tra; không suy ra đường dẫn Windows. Dùng xác nhận của anh + nội dung landing Facebook Ads hiện hành và DESIGN_RULES.md làm nguồn trực tiếp.

## Thanh toán

Gói `industry-expert-1290` trong `services/orderService.ts` cho `facebook-ads-2026`, amount 1290000; order item/title “Khóa học quảng cáo chuyển đổi dành cho chuyên gia”. Quyền học vẫn Facebook Ads; đây là gói giá riêng trên khóa hiện tại, chưa phải sản phẩm LMS riêng. Nội dung này được công khai ở giá và FAQ.

Form gọi POST `/api/orders`, gửi invoice qua helper hiện có, giữ UTM/fbclid/fbc/fbp; giá do server xác định. Nhận orderCode rồi tới `/thanh-toan/[code]`. Chặn gửi lặp, phục hồi khi lỗi, timeout 30s nhắc kiểm tra email trước khi gửi lại. Pixel Facebook Ads hiện hành 1315653423712065 chỉ tải trên domain production; Lead dedupe theo orderCode. Không thêm dataset hay đổi API/webhook/email/provisioning.

## Bằng chứng

- Doctor remote PASS sau khi vượt giới hạn DNS sandbox bằng quyền mạng cho lệnh đọc.
- 72/72: industry landing, Facebook landing, payment page, payment success email, order-created flow.
- Các test mới thực thi hàm buildOrderPackage thật trích qua TypeScript AST và JS checkout trong VM với API giả lập; kiểm tra giá cố định, sai khóa/gói, gói cũ, invoice/attribution, double submit, lỗi, email render. Chưa phải browser E2E hay transaction thật.
- TypeScript PASS; ESLint scoped PASS không warning; JS syntax/PostCSS/diff check PASS.
- Next 16.2.6 webpack build PASS, 108/108 static pages. Lần sandbox đầu không tải được font Google; lần có mạng build thành công.
- Next start localhost 127.0.0.1:4326. GET route khớp byte với source; image/script HTTP200. Không POST API thật. Không có env production trong worktree.
- Chưa visual QA desktop/mobile do workspace quản lý Computer Use. Không coi HTTP/parse là bằng chứng render.

## Xem và tiếp tục

http://127.0.0.1:4326/academy/quang-cao-chuyen-gia

Anh xem mẫu trước. Bước tiếp: góp ý/duyệt giao diện; khi được yêu cầu phát hành, tích hợp đúng canonical root, preflight và kiểm chứng live. Không deploy worktree này trực tiếp. Muốn nhân bản ngành: giữ CSS và cấu trúc, đổi nội dung theo nhu cầu thật; khai báo đúng gói giá/tên/ngành và quyền học trước khi nối CTA. Chưa có quyết định tạo course slug riêng cho 4 nhóm.


## 22/09/2026 — Mở rộng landing chuyên gia (LOCAL_REVIEW)

Theo góp ý của anh: bản mẫu tăng lên 18 section; mô tả 6 nhóm kiến thức chi tiết và bài thực hành; thêm 3 báo cáo Ads chụp trong Codex IAB (tháng8, tháng9, Tối đa), 3 ảnh Zalo đã có, 4 video landing showcase, ảnh founder/hero-operator từ Agent Kit, quy trình Pixel/CAPI kèm video giải thích có nhãn minh họa. Outline đầy đủ: docs/INDUSTRY_LANDING_OUTLINE_20260922.md trong feature worktree. Không gọi 6 nhóm là chương mới đã ghi hình; quyền học Facebook Ads hiện có.

Ảnh Ads sắp xếp cột Kết quả giảm dần. Các kỳ01–31/08/2026,01–21/09/2026,Tối đa21/08/2023–21/09/2026, giờ Thái Bình Dương. Kết quả gồm nhiều loại; không xem tất cả là mua hàng hoặc đã đối soát. Chỉ đọc/filter/sort/capture, không sửa/bật quảng cáo. Source reports/industry-proof-20260922; public copies public/industry-ads/proof. Theo correction của anh, dùng trình nội bộ Codex đã đăng nhập, không tiếp tục Chrome.

Runtime đổi thêm public/industry-ads/chuyen-gia.html, style.css, experience.js và proof/*.png. Motion finite reveal/hover, report switch, dialog phóng ảnh có Escape/focus return, reduced-motion fallback, video chỉ một phát; checkout.js và backend giữ nguyên từ bản trước. Đã viết mô tả đầy đủ vào outline, mở bằng Codex.

Kiểm tra mới: doctor remote PASS;48/48 industry+Facebook landing+payment UI tests PASS; scoped ESLint2JS, node --check, PostCSS parse, git diff --check PASS. Browser IAB desktop1600, mobile390/320:18sections, không tràn ngang, không ảnh lỗi ở trạng thái tải; chọn tháng9/Tối đa và dialog mở/đóng PASS; form hiển thị và sticky tự ẩn khi form vào viewport; không console error sau reload. Preview Next start4326 đã restart để nhận public files mới. Full TypeScript/build108/108 của bản trước vẫn là evidence trước thay đổi static; không chạy lại build ở lần chỉ mở rộng HTML/CSS/JS này. Không tạo đơn, gửi email, replay event hoặc deploy.

Còn giới hạn: phần Pixel/CAPI là quy trình + video giải thích minh họa, chưa bộ ảnh setup thực tế từng bước. Không tự thay cấu hình Meta để tạo bằng chứng. Video showcase lưu từ phiên bản cũ, được ghi chú trên landing; không coi là ưu đãi hiện tại. Chưa đo Lighthouse, thiết bị thật hoặc giao dịch thật.


## 22/09/2026 — Thiết kế lại theo quy trình landing + 4 dashboard (LOCAL_REVIEW)

Thay bản18 section đơn điệu theo góp ý của anh. Nội dung lấy quảng cáo qua landing làm trung tâm: lời đề nghị → landing/form → Pixel/CAPI → setup campaign → đọc phễu. Giữ18 section nhưng thay hero, quy trình tương tác5 bước, curriculum6 nhóm ứng dụng và4 dashboard: mô phỏng tỷ lệform/CPL; phân tích3 chiến dịch nguồn thật; bản đồ sự kiện; chẩn đoán từng bước. Bảng màu xanh mực/xanh rêu/kem/vàng/màu đất. CSS viết lại đồng bộ, ảnhheight:auto, avatarcrop cover; giữ nguyên ảnh nguồn. Thanh biểu đồ, chuyển panel, reveal và signal animation có reduced motion, không ẩn nội dung mặc định.

Nguồn campaign:3 dòng đầu ảnhtháng8,64 purchase Meta/28.513.898đ/445.530đmỗi purchase; cùng loạiwebsitepurchase, không tổng tài khoản, không paidrevenue. campaign-snapshot.json + embeddedJSON được kiểm tra khớp. Không có số liệu live người xem; mô phỏng/phân tích nguồn/sơđồ ghi riêng rõ. Pixel/CAPI vẫn là sơđồ giảng giải, không ảnhsetup thật hay kết nối mới.

Runtime sửa public/industry-ads/chuyen-gia.html/style.css/experience.js, thêm campaign-snapshot.json; bổ sung1 regression test nguồn/sum. Giữ checkout.js/backend/API/email/access từ bản trước. Outline đã viết lại tại docs/INDUSTRY_LANDING_OUTLINE_20260922.md.

Doctor remote PASS;49 tests PASS,scoped ESLint 2 JS/JS syntax/PostCSS/diff PASS. Browser Codex IAB 1440/390/320 kiểm tra tương tác thực; slider10%→100form/30.000đ;CPA351.705/551.146/575.700đ;Lead/Purchase vàdiagnosis đổiđúng;dialog vàformsticky đúng. Không tràn, ảnhloadedkhông méo:614×384 từ1586×992;355×533 từ900×1351;Zalo286×619 từ640×1386. Chưa đo thiết bị thật/Lighthouse, không rebuildfull vì chỉstatic; không tạo đơn, gửi email, sự kiện hoặc deploy thật. Preview4326 giữ hoạt động. Context/skills: registry,doctor,AGENTS/design/handoff hiệncó;landing-page-builder vàbuild-dashboard cho địnhnghĩa/chọnnguồn/QA, dashboardnhúng trực tiếp trang người dùng yêu cầu.


## 22/09/2026 — Landing chuyên gia V4: insight, kế hoạch và phản hồi (LOCAL_REVIEW)

Đã sửa bản mẫu theo insight có chuyên môn, có khóa học nhưng ít hoặc chưa có học viên dù đã thử quảng cáo. Có 21 section; thêm câu chuyện tuyển sinh, 5 tab research / plan marketing / plan content / plan ads / email marketing với nội dung và khung thực hành riêng. Giữ 4 dashboard giải thích phễu, chiến dịch, tracking và chẩn đoán. Tham khảo cấu trúc trang topexpert.vn/ai-business-automation qua Codex IAB; không dùng số liệu, quyền lợi hay cam kết của bên đó.

Dùng ảnh AI mới Thế Anh ngồi bàn làm việc, có nhãn AI, giữ tỷ lệ 3:2; thêm nguyên bản hai ảnh phản hồi anh cung cấp, mở phóng lớn được. Phân biệt phản hồi áp dụng hướng dẫn với trao đổi hỗ trợ đọc báo cáo; không suy diễn thành doanh thu hoặc kết quả khóa chuyên gia. Đổi bảng màu navy / vàng cam / kem, bỏ mũi tên trang trí, giữ chuyển tab và hiệu ứng hữu hạn. Outline chi tiết đã viết lại: docs/INDUSTRY_LANDING_OUTLINE_20260922.md; prompt và nguồn ảnh: docs/INDUSTRY_IMAGEGEN_V4.md trong feature.

Runtime thay đổi V4: public/industry-ads/chuyen-gia.html, style.css, experience.js và ảnh bàn làm việc / hai ảnh phản hồi. Giữ giá 1.290.000đ và hợp đồng thanh toán, khóa Facebook Ads hiện có; không gọi các ví dụ là chương mới đã ghi hình hoặc quà tặng đã có. Không thay backend, gửi email, tạo đơn thật, sửa Ads hoặc deploy.

Kiểm tra: 49/49 tests industry / Facebook landing / payment UI PASS; ESLint, PostCSS và git diff --check PASS. Codex IAB desktop 1440, mobile 390/320: 21 section, không tràn ngang; ảnh bàn làm việc và phản hồi giữ đúng tỷ lệ; tab Ads/Email và hộp ảnh hoạt động. Preview port 4326 đã restart nhận ảnh mới. Chưa chạy lại full build cho thay đổi static V4; chưa xác minh giao dịch thật, thiết bị thật hoặc Lighthouse. Pixel/CAPI vẫn là sơ đồ giảng giải, không phải ảnh cấu hình live từng bước. Trạng thái bản local đã sửa; production chưa thay đổi.


## 22/09/2026 — Landing chuyên gia V5: viết lại từng section và tài liệu thật (LOCAL_REVIEW)

Góp ý mới: gom Zalo, sửa ngôn ngữ gượng, đổi bảng màu/bố cục, dùng ảnh Thế Anh và đưa bản kế hoạch đã soạn lên trang. Đã làm lại 22 section trong cùng feature; palette trắng/tím/cam san hô; bỏ section Zalo trùng, giữ 5 ảnh trong một section. Nỗi đau dùng ảnh mới tạo từ founder-the-anh.webp theo correction của anh; ảnh người lạ ở lần đầu không được dùng. Hero, đối tượng, quy trình, 5 phần tài liệu, dashboard, showcase, nội dung học, giảng viên, phản hồi, chuẩn bị, form và FAQ được viết/trình bày lại. Giá 1.290.000đ và backend/checkout hiện có giữ nguyên.

Đã soạn dữ liệu thực cho bộ kế hoạch này: 6 điểm nghiên cứu từ brief và phản hồi (giả thuyết đánh dấu riêng), marketing 14 ngày/6 giai đoạn, content 14 chủ đề, Ads 2 thông điệp với nguyên tắc thử, 5 email đầy đủ. Chưa có khảo sát thị trường, chưa chạy kế hoạch, chưa gửi email. public/industry-ads/plans có dữ liệu JSON, 5 bản đọc responsive và 6 ảnh chụp Codex IAB 1440×900 đầy đủ (content 2 trang). Người xem mở ảnh lớn hoặc bản đọc trên điện thoại. Không trình bày chúng là doanh thu hay kết quả học viên.

Google Sheets: workbook đã tạo bằng artifact-tool. Bước import bị automatic approval review chặn vì sensitive egress và thiếu xác nhận tài khoản đích cụ thể. Đã xác định tài khoản và gửi câu hỏi; chưa nhận phê duyệt, chưa retry qua đường khác, chưa có URL Sheets. Tiếp tục hoàn tất landing/tài liệu local theo yêu cầu; không thay đầu ra thành Excel. Chỉ xử lý tiếp upload sau khi anh xác nhận.

Kiểm tra: doctor remote PASS; 49 tests liên quan PASS; scoped ESLint và PostCSS/diff PASS. IAB desktop 1440, mobile 390/320: không tràn ngang, ảnh tải đúng tỷ lệ; ảnh phóng lớn, link tài liệu, chỉ số CPA (351.705/551.146/575.700đ), sự kiện Purchase, chọn kỳ Tối đa, form và hóa đơn hoạt động. Thanh đăng ký mobile ẩn khi form vào khung nhìn. CSS giữ reduced motion; ảnh có kích thước gốc để giảm xê dịch bố cục. Không tạo đơn thật, gửi email, sửa Ads, grant hoặc deploy. Không chạy lại full build cho thay đổi static; Pixel/CAPI vẫn là sơ đồ giảng giải, chưa ảnh setup live từng bước.

Source V5: public/industry-ads/chuyen-gia.html, style.css, experience.js, ảnh thinking-v5 và plans/. Outline hiện tại docs/INDUSTRY_LANDING_OUTLINE_20260922.md; prompt docs/INDUSTRY_IMAGEGEN_V5.md; tài liệu và builder reports/industry-v5; ảnh QA reports/industry-proof-20260922/v5-*.png. Preview port 4326 đang hoạt động. Bước tiếp: xem bản local, xử lý duyệt Google Sheets nếu có; production chưa đổi.


## 22/09/2026 — Landing chuyên gia V6: đen trắng cam, analytics và chuyển đổi (LOCAL_REVIEW)

Theo yêu cầu mới, thay logo chữ tự dựng bằng asset nhận diện hiện có /zalo-zns/ta-zbs-logo-light.svg. Toàn bộ CSS và tài liệu kế hoạch chuyển sang đen/trắng/cam; tiêu đề nhấn cụm từ quan trọng. Chân dung giảng viên cắt nửa người bằng khung CSS, không tạo người mới. Có mục lục dialog, CTA ghim dưới trên desktop/mobile (ẩn khi form xuất hiện), Zalo một dải ngang tự chuyển 5 giây, dừng khi hover/focus, thao tác tay, reduced motion hoặc ra ngoài màn hình; có nút tạm dừng.

Thêm tổng quan 3 tháng: 350 triệu chi tiêu, 1,2 tỷ doanh thu, 3+ nhóm đầy 1.000 thành viên, ghi rõ số do chủ dự án cung cấp ngày 22/09, không phải Meta attributed revenue/lợi nhuận/cam kết học viên. Không chia nhỏ thành số tháng giả. Tạo analytics từ đúng 3 dòng Meta 08/2026: bảng, donut tỷ trọng, bộ lọc tính lại, nhận xét và hướng dùng AI. Ẩn tên ở HTML, JSON và trực tiếp trong cả ba ảnh tháng8/tháng9/Tối đa bằng chụp trang local có vùng che; bản gốc chỉ nằm reports/industry-v6, không public. Các số trong ảnh giữ nguyên.

Thêm section tốc độ/chất lượng/CTA của landing; lựa chọn Traffic, CompleteRegistration, InitiateCheckout, Purchase tương tác; mở rộng Dataset/Pixel/CAPI/Test Events/đối soát. Phân biệt mục tiêu chiến dịch với sự kiện. Nội dung mới là diễn giải ứng dụng, không tạo giáo trình quay mới. Tài liệu Meta công khai bị login/429, không dùng nguồn thứ ba để khẳng định thay đổi UI hoặc chính sách mới.

Kiểm tra: doctor remote PASS sau chạy ngoài sandbox do DNS; 49/49 tests industry/Facebook/payment PASS; ESLint hai JS PASS, PostCSS parse PASS, diff check PASS. IAB 1440 và mobile390/320: logo, màu, không tràn ngang; bộ lọc CD01 12.309.666đ/35/351.705đ, CD03 5.181.304đ/9/575.700đ; mục lục, mục tiêu Purchase, Zalo tự chạy và dừng khi bấm tiếp, form ẩn sticky khi input vào màn hình. Không tạo đơn/email/Ads mutation/deploy. Chưa full build mới hoặc giao dịch thật; preview4326. Google Sheets từ V5 vẫn chờ xác nhận tài khoản đích; không retry.

Files: public/industry-ads/{chuyen-gia.html,style.css,experience.js,campaign-snapshot.json}, proof/ads-*.png và plans/*.html/*-capture.png. Đã cập nhật outline và handoff. Ảnh kiểm tra reports/industry-proof-20260922/v6-*.png.


## 23/09/2026 — Landing chuyên gia V7: thanh dưới, form và chuyển động lặp (LOCAL_REVIEW)

Đã bỏ chú thích ảnh AI và ghi chú nguồn trên giao diện chính; giữ nhận diện mô phỏng và thông tin cần thiết của gói học. Logo/header phía trên không còn ghim. Mục lục nằm cạnh nút đăng ký trong thanh dưới; thanh ẩn khi form vào màn hình. Form có khung trắng bo32px, viền cam nhạt, thanh bước01/02, ô nhập và tổng tiền đóng khung. Giá vẫn1.290.000đ.

Zalo đổi thành track hai nhóm giống nhau chạy translateX liên tục sang trái (80s/vòng), không thanh trượt/nhảy về đầu; nút tạm dừng, pause khi hover/focus/mở ảnh/ngoài khung nhìn, reduced-motion dùng bản tĩnh kéo được. Sự kiện Pixel/CAPI lặp2.5s khi nhìn thấy, reduced-motion tắt chuyển động.

Chủ dự án nói có5tài khoản tương tự nhưng chưa đưa số từng tài khoản. Thêm bộ chọn dữ liệu gốc/ước tính5tài khoản trong analytics: nhân chi tiêu và lượt mua5lần, CPA không đổi. Có nhãn ước tính và cách tính rõ, không đổi ảnh Meta, không nhân học phí, tổng doanh thu đã cung cấp hoặc thành viên Zalo thành kết quả chưa xác minh. Gốc28.513.898đ/64/445.530đ; ước tính142.569.490đ/320/445.530đ.

Kiểm tra:10tests industry PASS, scoped ESLint, PostCSS và diff PASS. IABdesktop/mobile320:headerrelative,toc nằm trong mobile-cta, không tràn ngang; menu mở và đến form; stickyHidden=true khi input vào khung nhìn; formradius32px; Zalo transform từ0đến-327.84px, infinite/running, pause hoạt động; cả hai tín hiệu tracking infinite/running. BrowserQA từng bị usage-review chặn hôm trước, đã tiếp tục thành công ngày23/09. Không tạo đơn/email/Ads mutation/deploy; không full build mới. Docs/outline và handoff cập nhật.
