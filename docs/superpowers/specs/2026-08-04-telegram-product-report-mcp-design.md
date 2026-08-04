# Telegram Product Report via MCP — Design

## Mục tiêu

Mở rộng báo cáo Telegram 08:00 và 14:00 để có số liệu theo sản phẩm, báo cáo 7 ngày và doanh thu tháng. Chi phí quảng cáo phải lấy từ Facebook Ads MCP, không phụ thuộc `META_ADS_ACCESS_TOKEN` của website.

## Nguồn dữ liệu

- Doanh thu: `public.orders` của Supabase production website, chỉ lấy đơn `status = 'paid'` theo `paid_at`.
- Ads: tài khoản MCP `1255736315302940` (`Greezhub 01`), lấy spend theo campaign và theo giờ quảng cáo.
- Website không gọi MCP trực tiếp. Một Codex automation chạy trước kỳ báo cáo sẽ đồng bộ snapshot campaign/giờ vào bảng nội bộ Supabase website. Vercel cron chỉ đọc snapshot đã đồng bộ và gửi Telegram bằng bot hiện có.
- Snapshot phải ghi thời điểm đồng bộ, campaign ID/tên, giờ bắt đầu/kết thúc, spend và trạng thái dữ liệu. Bảng chỉ dành cho `service_role`; bật RLS và thu hồi quyền `anon`/`authenticated`.

## Phân loại sản phẩm

Tên campaign được chuẩn hóa không phân biệt hoa thường:

- Có `Ebook` hoặc `Ebook FB Ads 2026` → `Ebook`.
- Có `FBA` hoặc `FB Ads 2026` nhưng không có `Ebook` → `Khóa Facebook Ads`.
- Campaign không khớp → `Chưa phân loại`.

Thứ tự trên là bắt buộc để `Ebook FB Ads 2026` không bị gộp vào khóa Facebook Ads. Doanh thu lấy tên/slug sản phẩm canonical từ order; quy tắc tương đương được dùng để ghép vào hai nhóm trên.

## Kỳ báo cáo

- Báo cáo 08:00: kỳ hiện tại từ 14:00 hôm trước đến 08:00 hôm nay.
- Báo cáo 14:00: kỳ kinh doanh hoàn chỉnh từ 14:00 hôm trước đến 14:00 hôm nay.
- Khối 7 ngày: bảy kỳ kinh doanh hoàn chỉnh gần nhất, từ 14:00 cách bảy ngày đến 14:00 tại mốc đóng kỳ gần nhất.
- Khối tháng: từ 00:00 ngày đầu tháng theo `Asia/Ho_Chi_Minh` đến thời điểm báo cáo.
- Mọi khoảng thời gian dùng quy ước nửa mở `[start, end)` để không đếm trùng.

## Chỉ số

Cho toàn kỳ và từng sản phẩm:

- Số đơn đã thanh toán.
- Tiền thực thu.
- VAT Facebook = 8% × tiền thực thu.
- Chi phí Ads = tổng spend campaign đã gắn vào sản phẩm.
- Phí chuyển đổi = 2% × chi phí Ads.
- Lãi/lỗ tạm tính = tiền thực thu − VAT − Ads − phí chuyển đổi.

Doanh thu tháng hiển thị tổng và theo từng sản phẩm. Campaign `Chưa phân loại` hiển thị thành dòng riêng, không phân bổ giả sang sản phẩm khác.

## Chất lượng dữ liệu và gửi Telegram

- Chỉ công bố lãi/lỗ khi snapshot MCP phủ đủ các giờ của kỳ và không có trạng thái `partial`/`missing`.
- Nếu thiếu dữ liệu Ads, vẫn gửi doanh thu/đơn nhưng ghi rõ Ads chưa đủ và không coi Ads bằng 0.
- Tin nhắn gồm: tổng kỳ, chi tiết sản phẩm, 7 ngày theo sản phẩm, doanh thu tháng đến hiện tại.
- Nếu vượt giới hạn Telegram, tách thành nhiều tin theo đúng thứ tự; một lần chạy chỉ được đánh dấu thành công khi tất cả phần đã gửi.
- Giữ ledger/idempotency hiện có để không gửi trùng báo cáo production.

## Kiểm thử chấp nhận

- Mapping `Ebook` và `FBA` không gộp lẫn nhau.
- Khung 14:00 hôm trước → 14:00 hôm nay lọc đúng cả order và Ads theo giờ.
- Tổng Ads theo sản phẩm cộng với `Chưa phân loại` bằng tổng Ads của tài khoản trong cùng kỳ.
- Khối 7 ngày và tháng không đếm trùng ở ranh giới thời gian.
- Khi Ads thiếu giờ, Telegram không hiển thị lãi/lỗ như thể Ads bằng 0.
- Gửi `[TEST]` vào nhóm Telegram hiện có sau khi deploy.
