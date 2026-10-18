# Giai đoạn 2 — bỏ phụ thuộc Supabase

## Trạng thái hiện tại

**IN PROGRESS.** Nhánh riêng `codex/cloudflare-native-phase2-20261018`, tách từ A `538889f`; không thay mã hoặc nguồn ghi production. A bao gồm `/learn`; B là App riêng. Hosting Cloudflare đã LIVE theo bàn giao, nhưng database/Auth/Storage vẫn dùng Supabase và B còn cầu tương thích Vercel. Chưa có điều kiện hủy Supabase hoặc Vercel.

Đã thêm công cụ xuất snapshot nhất quán, đối soát và diễn tập đồng bộ chênh lệch cục bộ, công cụ rà phụ thuộc mã nguồn, SQL đọc catalog hiện hành. Đã xuất bản chụp mới 139 bảng/40.274 hàng vào image AES-256 và kiểm checksum toàn bộ; khôi phục mirror cục bộ 131 bảng không có cột bị lược bỏ đạt. Đây là dữ liệu ứng dụng chuẩn bị migration; chưa nối vào runtime hay đồng bộ production.

## Dữ liệu đã đọc lại

Nguồn: `reports/cloudflare-phase2-20261018/source-catalog.json`, truy vấn chỉ đọc lúc 11:07 UTC ngày 18/10/2026. Không xuất hàng dữ liệu khách hàng, password hash hoặc secret qua connector.

| Thành phần | A | B |
| --- | ---: | ---: |
| Bảng public | 43 | 58 |
| Bảng crm_v2 | 38 | 0 |
| Chính sách RLS | 95 | 66 |
| Function public/crm_v2 | 55 | 14 |
| Trigger nghiệp vụ | 9 | 31 |
| Tài khoản Auth | 447 | 276 |
| Bucket riêng tư | 3 | 1 |
| Metadata file Storage | 508 | 0 |

Tất cả 139 bảng ứng dụng đều bật RLS và có khóa chính ở lần đọc này. Tổng Auth 723 tài khoản; số identity theo provider không phải số người dùng độc lập. Metadata 508 file không chứng minh byte dữ liệu hoặc quyền R2 đã đối soát.

Bản sao D1 ngày 15/10 từng ghi A442/B271 tài khoản: **không dùng bản sao đó như dữ liệu production hiện hành**. Không suy ra số hàng thay đổi trong từng bảng từ chênh lệch số tài khoản.

## Mã vừa hoàn thiện

### 0. Xuất snapshot mới chỉ đọc

`scripts/export-consistent-app-mirror.py` dùng PAT hiện có trong Keychain và Management API với `read_only=true`. Khám phá catalog trước; sau đó **catalog kiểm lại + count + toàn bộ hàng trong một câu SELECT**, kèm `pg_current_snapshot()` và `statement_timestamp()`. Nếu schema thay đổi giữa hai lần đọc hoặc số hàng trả về bị thiếu thì từ chối. Phân biệt cột khóa chính với cột INCLUDE qua `indnkeyatts`.

Chỉ chạy CLI khi image backup cố định đã mount; tạo thư mục mới0700, SQLite0600, không ghi đè. Giới hạn phản hồi256MiB, không retry ghi, không in raw HTTP/SQL error, row hoặc token. Giá trị số chính xác, UUID, JSON/array/bytea/time giữ dạng text PostgreSQL; integer/boolean/real được chuyển kiểu có kiểm tra. Manifest `pg-text-v1` không được ghép delta với export cũ khác biểu diễn.

Cột khớp regex nhạy cảm được NULL ngay trong SQL và ghi rõ trong manifest. **Regex tên cột không bảo đảm loại được secret nhúng trong JSON hoặc cột value/config**, nên mọi byte snapshot vẫn chỉ ở image mã hóa. Không upload các bản sao này lên Git/D1 remote. Auth và byte file Storage không nằm trong snapshot ứng dụng này; không gọi đây là backup toàn bộ Supabase.

Kết quả thật: `reports/cloudflare-phase2-20261018/real-snapshot-rehearsal.json`.

| Bản chụp | A | B |
| --- | ---: | ---: |
| Thời điểm snapshot UTC18/10 | 11:14:25 | 11:15:16 |
| Bảng | 81 | 58 |
| Hàng | 32.392 | 7.882 |
| Bảng có cột bị lược bỏ, chặn apply | 5 | 3 |
| Bảng mirror cục bộ đối soát/khôi phục đạt | 76 | 55 |

Đã đọc lại digest của139bảng khớp manifest, thử copy/khôi phục131bảng còn lại trong image. Đây là **roundtrip của cùng snapshot**, chưa phải bắt kịp hai thời điểm production khác nhau, D1 remote, thử phục hồi đầy đủ Auth/Storage hoặc chứng minh không mất ghi sau cutover. A/B có snapshot riêng, không gộp hoặc cam kết cùng thời điểm chéo hai database. Tám bảng bị chặn gồm `orders`; không được tuyên bố thanh toán đã sẵn sàng chạy D1 vì kết quả này.

### 1. Đối soát và diễn tập delta

`scripts/reconcile-d1-mirror.py` chỉ đọc hai SQLite export ứng dụng; không có API/provider, không hỗ trợ `--remote` hay ghi PostgreSQL. Tách A/B theo project và prefix bảng. Báo cáo chỉ chứa tên bảng, số dòng, số thay đổi, digest và mã chặn; không chứa khóa hàng hay giá trị khách hàng.

- Digest SHA-256 multiset có phân biệt kiểu, NULL, blob, số chính xác lưu dạng text, chuỗi JSON/time nguyên gốc và số lần lặp.
- Khóa chính nhiều cột; phát hiện thêm/sửa/xóa dù tổng số dòng không đổi.
- Chặn schema đổi, bảng thiếu, không có khóa ổn định, khóa NULL/trùng và cột đã bị lược bỏ vì nhạy cảm.
- `prepare-local` chỉ tạo tệp mới quyền0600 trong thư mục riêng tư ngoài Git. Với dữ liệu thật, operator bắt buộc dùng image mã hóa; quyền0600 không thay thế mã hóa.
- `apply-local` chỉ ghi bản diễn tập có marker `offline-only`, không cho dùng source hoặc hardlink của source. Kiểm toàn bộ baseline trước ghi trong `BEGIN IMMEDIATE`; kiểm digest sau cùng và khóa ngoại trước commit.
- Chặn trigger và hoàn tác khi cascade thay đổi bảng ngoài phạm vi. Lỗi một bảng hoàn tác cả lượt.
- Diễn tập delta ngược khôi phục đúng baseline khi không có ghi mới; nếu có đơn mới ở đích thì từ chối rollback thay vì xóa đơn đó. **Đây chưa phải giải pháp bắt kịp ghi mới khi rollback production.**

Giới hạn quan trọng: dùng schema mirror của công cụ cũ, không tái tạo constraint/RLS/function PostgreSQL. Chỉ kiểm trong các bảng được chọn, không chứng nhận toàn bộ database. Hai export đầu vào không tự được coi là snapshot PostgreSQL nhất quán. Manifest cũ chứa số lượng, không có chữ ký chứng nhận nguồn; `readyForCutover` luôn false. Không tạo file SQL chứa dữ liệu để đưa lên Git.

### 2. Rà phụ thuộc Source

`scripts/inventory-supabase-dependencies.mjs` dùng TypeScript AST đọc import/re-export/import động cố định và các lời gọi SDK; có theo dõi biến alias như `db=getSupabaseAdmin()`. Không quét `.env`, không in tham số Auth/payload/URL, bỏ test và type-only import.

Kết quả cuối: `reports/cloudflare-phase2-20261018/supabase-dependencies-final.json`.

| Phép rà tĩnh | A | B |
| --- | ---: | ---: |
| Entrypoint page/layout/route/proxy | 157 | 87 |
| Có đường import tới thành phần phụ thuộc Source | 141 | 59 |
| Module có import/lời gọi Source được phát hiện | 84 | 32 |
| Lời gọi SDK được phát hiện | 549 | 136 |
| Tên bảng/RPC/schema động cần rà thủ công | 6 | 6 |
| Import nội bộ chưa giải quyết | 2 | 0 |

Đây là heuristic và có thể bao gồm nhánh dự phòng đang tắt; không phải số tính năng hỏng hoặc tỷ lệ migration đã hoàn thành. Không thấy tham chiếu tĩnh cũng không chứng minh độc lập khi chạy. Cần audit thêm fetch URL, SQL sinh động, job ngoài app, alias qua barrel/destructuring và hai import A còn thiếu. App B có thêm RPC `ads_os_claim_automation_rules`, `ads_os_ensure_workspace`; không bỏ sót chỉ vì client được đặt tên `db`.

Các file `supabase-dependencies.json`, `-v2.json`, `-v3.json` là đầu ra trung gian của quá trình chỉnh bộ quét; giữ nguyên tại máy, không dùng làm kết quả cuối.

## Kiểm chứng

- Python delta: 16/16 tình huống fixture, gồm drift, delta ngược, khóa nhiều cột, byte/numeric, FK rollback, cascade ngoài phạm vi, tenant, redaction, WAL snapshot cục bộ, sai biểu diễn và manifest digest, không lộ giá trị.
- Python exporter: 5/5 tình huống fixture về SQL chỉ đọc, bảng rộng, giữ kiểu, quyền tệp, schema drift, truncation và redaction. Hai lần thực thi SQL thật A/B cùng kiểm snapshot nêu trên đạt.
- Node: 5/5 tình huống AST, gồm đồ thị có vòng, alias, Storage/Auth, RPC động, proxy, import động và không lộ secret fixture.
- Reviewer độc lập đã chạy delta16/exporter5/Node5 ở các lượt kiểm tương ứng; không thấy lỗi chặn. Reviewer lưu ý PRIMARY KEY INCLUDE và đã sửa truy vấn chỉ lấy `indnkeyatts`; kiểm exporter và SQL A/B thật sau sửa đạt.
- Image backup AES-256 đã được kiểm tra/mount; export SQLite15/10 không còn nên không giả định baseline cũ còn dùng được. Hai snapshot mới và mirror diễn tập được thêm vào thư mục mới, không sửa dump/backup cũ. Đóng image sau khi kết thúc.
- Chưa kiểm D1 remote, delta hai thời điểm thực khác nhau, writer fence, full build/typecheck/lint ứng dụng hoặc trình duyệt trong giai đoạn này: không thay runtime app/dependency/deploy config. Tổng26test cục bộ đạt không thay thế các kiểm chứng còn thiếu này.

## Việc kỹ thuật tiếp theo

1. Bản chụp ứng dụng mới đã có. Tiếp tục đường Auth/cột nhạy cảm mã hóa bảo toàn đầy đủ; sau đó chụp lại để đối soát delta hai thời điểm thật. Không coi baseline18/10 là bản final khi production tiếp tục phát sinh dữ liệu.
2. Từ graph hiện hành, hoàn thiện provider D1 cho admin/CRM/orders/LMS của A và quyền/workspace/resources của B. Dùng bảng và RPC thực tế; so từng kết quả/quyền với Source. Không gộp A/B hoặc sửa Adplan.
3. Kiểm staging native không gọi Source cho luồng đã chuyển, gồm Auth/phiên cũ, cấp quyền và tải file riêng tư. Test âm truy cập chéo user/workspace và cache; không dùng tiến độ học viên thật.
4. Thiết kế bắt kịp ghi, source fence và chiều rollback giữ dữ liệu phát sinh. Công cụ offline mới chỉ là phép diễn tập, không thay thế cơ chế này.
5. Chỉ đề xuất chuyển writer sau khi đủ parity, hiệu năng, bảo mật, backup/restore và rollback. Việc đổi writer/Auth/Storage production hoặc hủy dịch vụ cần anh duyệt riêng. Chưa có yêu cầu tạo/đổi secret trong lượt này.

## Cách chạy lại cho kỹ thuật

```sh
python3 scripts/test-reconcile-d1-mirror.py
python3 scripts/test-export-consistent-app-mirror.py
PHASE2_TYPESCRIPT_ROOT=../main node --test tests/cloudflare-phase2-dependency-inventory.test.mjs
```

Operator dùng `compare --project a|b --baseline <copy.sqlite cũ> --current <copy.sqlite mới> --baseline-manifest <manifest cũ> --current-manifest <manifest mới>`; muốn chọn bảng thêm `--tables ...`. Chuẩn bị bản diễn tập bằng `prepare-local --project a|b --baseline ... --target <tệp mới trong image mã hóa>`, sau đó `apply-local` với cùng cặp snapshot/manifest và target. Không chạy trên database đang phục vụ hoặc đưa bản sao dữ liệu vào repository.
