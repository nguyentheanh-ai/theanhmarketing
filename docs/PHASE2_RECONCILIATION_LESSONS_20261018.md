# Bài học giai đoạn 2 — phạm vi có kiểm chứng

## VERIFIED — Keychain có thể bị phiên sandbox che mất

Áp dụng: công cụ backup tenant này trên macOS; không suy rộng sang mọi lỗi credential. `backup-secrets.py check pat` trong sandbox báo chưa có secret, nhưng kiểm tra có quyền thực thi bên ngoài sandbox đọc được cùng mục và SELECT1 `read_only=true` qua Management API đạt. Không tạo token mới, không thay permission hoặc ACL. Khi lỗi giống vậy, phân biệt không đọc được với thực sự không tồn tại; chỉ dùng cơ chế cấp quyền công cụ được phép, không sửa bảo mật để vượt lỗi. Không ghi giá trị secret.

## VERIFIED — SQLite WAL mode=ro cần companion files hợp lệ

Áp dụng: fixture SQLite3.54 ở máy này. Chỉ `PRAGMA journal_mode=WAL` rồi mở reader mode=ro gây `unable to open database file` khi chưa có WAL/SHM. Bài test được sửa để writer đọc khởi tạo companion files trước reader; sau đó reader giữ snapshot trong lúc writer thay đổi dữ liệu và test đạt. Không sửa query_only hoặc quyền file để vượt lỗi; không dùng immutable=1 để giả định một DB đang thay đổi là bất biến. Export thực phải là tệp hoàn chỉnh và có nguồn snapshot rõ ràng.

## VERIFIED — Rà SDK phải theo dõi alias client và tách Storage

Áp dụng: mã A/B hiện hành. Chỉ dò tên receiver supabase/client bỏ sót `db=getSupabaseAdmin()!`, dẫn đến thiếu RPC nhận automation/cấp workspace B. Bộ quét AST bổ sung alias factory/import/parameter và regression test; tìm được các RPC thật. Storage.from(bucket) phải tách khỏi database.from(table). Đây vẫn là heuristic, không chứng minh runtime độc lập hoặc bao phủ fetch/SQL động/barrel/destructuring.

## VERIFIED — PK INCLUDE không phải toàn bộ khóa định danh

Áp dụng: exporter catalog PostgreSQL17. Reviewer chỉ ra pg_index.indkey gồm cả cột INCLUDE. Đã dùng unnest WITH ORDINALITY và giới hạn ord<=indnkeyatts; kiểm SQL thật trên hai project và giữ schema PK khi xuất đạt. Không suy ra mọi cách đọc index khác đều sai.

## VERIFIED — Mirror có cột redacted không thể làm bản final

Áp dụng: snapshot ứng dụng18/10,139bảng/40.274hàng. Tám bảng có cột bị lược bỏ, gồm orders. Importer/delta chặn chúng;131bảng còn lại roundtrip cục bộ đạt. Không dùng số dòng/checksum của dữ liệu đã lược bỏ để tuyên bố Auth/thanh toán/rollback production hoàn tất. Secret có thể còn nhúng trong JSON/value nên toàn bộ snapshot chỉ ở image mã hóa. Không có dữ liệu khách hoặc giá trị secret trong bài học này.
