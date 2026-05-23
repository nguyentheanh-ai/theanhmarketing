# Website Audit 2026-05-24

## Da xu ly trong phien nay

- Kiem tra lai landing page Facebook Ads route `/academy/facebook-ads-master-2026`: route tra 200, co gia 399K/799K va form order dang hoat dong.
- Xoa du lieu demo/test trong admin sau khi backup ngoai repo tai `C:\Users\12c1t\.codex\work-backups\theanhmarketing\2026-05-23T18-56-48-885Z`.
- Lam gon admin shell theo huong SaaS dashboard sang hon: sidebar khong de logout de len menu, panel trang de doc, badge nho hon.
- Tao landing page AI Master X10 tai `/academy/ai-master-x10-hieu-suat` va sync source `public/ladipage`.
- Test payment API cho Facebook Ads 399K, Facebook Ads 799K va AI Master X10 1.299K. Tat ca tao QR/order thanh cong, sau do xoa order test de admin khong bi ban demo.

## Van de cot loi dang thay

1. **Nguon du lieu khoa hoc dang chia doi**
   - Code dang co course fallback day du, Supabase hien chi co mot phan course that.
   - Rui ro: admin sua DB nhung public/dashboard lai merge voi code fallback, de gay cam giac "mat bai hoc" neu DB co course rong hoac module rong.
   - Huong fix: chon mot source chinh cho khoa hoc, sau do seed Supabase day du va chi dung fallback khi DB that su rong.

2. **Admin tung bi tron giao dien landing-page va CRM**
   - Nhieu page admin dung component dung lai nhung chua co design system rieng cho bang, form, filter, empty state.
   - Da giam rui ro bang `AdminShell`, `AdminPanel`, `StatusBadge`, nhung can tiep tuc gom table/form thanh component chung.

3. **Demo data de bi tron vao du lieu that**
   - Order test truoc do dung ten/email de nhin nhu khach hang that tren admin.
   - Da backup va xoa. Tu lan sau moi order test phai co tien to `codex+...@example.com` va xoa ngay sau khi verify.

4. **Landing page dang phu thuoc HTML tinh**
   - HTML tinh giup len nhanh, nhung de lech source/published neu quen sync.
   - Da them test sync `public/ladipage/ai-master-x10-hieu-suat.html` voi `public/academy/ai-master-x10-hieu-suat.html`.
   - Huong fix sau: tao mot helper sync hoac route static chung de tranh copy tay.

5. **Website can mot vong QA mobile bang anh chup that**
   - HTTP/build test pass duoc loi ky thuat, nhung UI sales page van can check tren mobile that/Browser khi cong cu hoat dong on dinh.
   - Uu tien: overflow ngang, sticky CTA che form, anh thumbnail bi cat, font qua to o section hero/module/pricing.

## Thu tu lam tiep

1. Seed day du Supabase course data that cho Facebook Ads va AI Master X10, gom module/lesson/resource.
2. Chuan hoa admin table/form/filter thanh component dung chung.
3. Lam landing page AI Master X10 ban 2 sau khi anh/chị sua copy/offer.
4. Them route/payment smoke test vao script rieng de kiem tra truoc moi push.
5. QA mobile that sau deploy production va chup lai cac section chinh.
