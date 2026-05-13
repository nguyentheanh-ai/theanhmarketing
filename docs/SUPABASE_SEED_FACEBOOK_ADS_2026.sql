-- Run this in Supabase SQL Editor after docs/DATABASE_SETUP.md.
-- It enables temporary demo write policies and seeds Facebook Ads 2026 modules/lessons.
-- Replace anon write policies with authenticated admin policies before production.

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.leads enable row level security;
alter table public.testimonials enable row level security;

drop policy if exists "Anon manage courses demo" on public.courses;
create policy "Anon manage courses demo"
on public.courses for all
to anon
using (true)
with check (true);

drop policy if exists "Anon manage modules demo" on public.course_modules;
create policy "Anon manage modules demo"
on public.course_modules for all
to anon
using (true)
with check (true);

drop policy if exists "Anon manage lessons demo" on public.lessons;
create policy "Anon manage lessons demo"
on public.lessons for all
to anon
using (true)
with check (true);

drop policy if exists "Anon manage resources demo" on public.resources;
create policy "Anon manage resources demo"
on public.resources for all
to anon
using (true)
with check (true);

drop policy if exists "Anon insert leads" on public.leads;
create policy "Anon insert leads"
on public.leads for insert
to anon
with check (true);

drop policy if exists "Anon read leads demo" on public.leads;
create policy "Anon read leads demo"
on public.leads for select
to anon
using (true);

drop policy if exists "Public read testimonials" on public.testimonials;
create policy "Public read testimonials"
on public.testimonials for select
to anon, authenticated
using (true);

with upserted_course as (
  insert into public.courses (
    title,
    slug,
    short_description,
    description,
    price,
    original_price,
    status,
    duration,
    lesson_count,
    level,
    updated_at,
    banner_image,
    thumbnail_image,
    preview_video_url,
    cta_text
  ) values (
    'Facebook Ads 2026',
    'facebook-ads-2026',
    'Tự chạy quảng cáo, đọc dữ liệu và tối ưu chiến dịch Facebook Ads theo lộ trình thực chiến.',
    'Học cách tự triển khai Facebook Ads bài bản, hiểu đúng tư duy Marketing & Kinh doanh Online, biết đọc dữ liệu và tối ưu quảng cáo theo tình huống thực tế.',
    799000,
    3995000,
    'open',
    '3 module',
    18,
    'Người mới đến thực chiến',
    '13/05/2026',
    '',
    '',
    'https://youtu.be/8xLstSFsHp8',
    'Đăng ký khóa học'
  )
  on conflict (slug) do update set
    title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    price = excluded.price,
    original_price = excluded.original_price,
    status = excluded.status,
    duration = excluded.duration,
    lesson_count = excluded.lesson_count,
    level = excluded.level,
    updated_at = excluded.updated_at,
    preview_video_url = excluded.preview_video_url,
    cta_text = excluded.cta_text
  returning id
),
deleted_modules as (
  delete from public.course_modules
  where course_id = (select id from upserted_course)
),
module_1 as (
  insert into public.course_modules (course_id, title, description, sort_order)
  values (
    (select id from upserted_course),
    'Tổng quan và nền tảng Facebook Ads',
    'Nắm tư duy chạy quảng cáo, thuật ngữ quan trọng, cách nhận diện khách hàng kém chất lượng và những lỗi thường gặp trước khi triển khai.',
    1
  )
  returning id
),
module_2 as (
  insert into public.course_modules (course_id, title, description, sort_order)
  values (
    (select id from upserted_course),
    'Tài sản Facebook, Fanpage và nội dung nền',
    'Chuẩn bị tài khoản, Fanpage, hình ảnh nhận diện và lịch đăng bài để quảng cáo có nền tảng vận hành rõ ràng.',
    2
  )
  returning id
),
module_3 as (
  insert into public.course_modules (course_id, title, description, sort_order)
  values (
    (select id from upserted_course),
    'Triển khai, đo lường và tối ưu quảng cáo',
    'Lập kế hoạch, quản trị BM, thêm thanh toán, target, đọc chỉ số và scale ngân sách quảng cáo Facebook.',
    3
  )
  returning id
)
insert into public.lessons (
  module_id,
  title,
  description,
  duration,
  youtube_url,
  embed_url,
  access_type,
  sort_order
)
values
  ((select id from module_1), 'CÁCH LOẠI TRỪ 90% TỆP KHÁCH RÁC ( không mua hàng) TRÊN QUẢNG CÁO FACEBOOK', '', 'Video bài học', 'https://youtu.be/8xLstSFsHp8', 'https://www.youtube.com/embed/8xLstSFsHp8', 'free_preview', 1),
  ((select id from module_1), 'Quảng cáo FACEBOOK từ A tới Z | Cập nhật mới nhất 2025', '', 'Video bài học', 'https://youtu.be/xEDLxoS4um0', 'https://www.youtube.com/embed/xEDLxoS4um0', 'enrolled_only', 2),
  ((select id from module_1), 'HỌC CHẠY QUẢNG CÁO FACEBOOK - CẬP NHẬT MỚI NHẤT 2026', '', 'Video bài học', 'https://youtu.be/yRTveHLi9dQ', 'https://www.youtube.com/embed/yRTveHLi9dQ', 'enrolled_only', 3),
  ((select id from module_1), 'Bài 2 - Thuật ngữ chuyên ngành trong Quảng Cáo Facebook', '', 'Video bài học', 'https://youtu.be/rlPDU64iPEw', 'https://www.youtube.com/embed/rlPDU64iPEw', 'enrolled_only', 4),
  ((select id from module_1), 'Bài 3 - Những sai lầm phổ biến khi chạy Quảng cáo Facebook', '', 'Video bài học', 'https://youtu.be/aPDm4pBxkTo', 'https://www.youtube.com/embed/aPDm4pBxkTo', 'enrolled_only', 5),
  ((select id from module_2), 'Bài 4 - Hướng dẫn mua VIA', '', 'Video bài học', 'https://youtu.be/RVOZ6mA6uj4', 'https://www.youtube.com/embed/RVOZ6mA6uj4', 'enrolled_only', 1),
  ((select id from module_2), 'Bài 5 - Tất tần tật về Fanpage Facebook P.1', '', 'Video bài học', 'https://youtu.be/J_wK-2oVOlc', 'https://www.youtube.com/embed/J_wK-2oVOlc', 'enrolled_only', 2),
  ((select id from module_2), 'Bài 5 - Tất tần tật về Fanpage Facebook P.2', '', 'Video bài học', 'https://youtu.be/1lqGT1oXUWE', 'https://www.youtube.com/embed/1lqGT1oXUWE', 'enrolled_only', 3),
  ((select id from module_2), 'Bài 6 - Hướng dẫn nhanh thiết kế Poster - Cover - Avatar Facebook', '', 'Video bài học', 'https://youtu.be/77SD1NNfx9Y', 'https://www.youtube.com/embed/77SD1NNfx9Y', 'enrolled_only', 4),
  ((select id from module_2), 'Bài 8 - Đăng bài trên Facebook', '', 'Video bài học', 'https://youtu.be/rZgq1_VLXoU', 'https://www.youtube.com/embed/rZgq1_VLXoU', 'enrolled_only', 5),
  ((select id from module_3), 'Bài 9 - Tại sao content lại quan trọng, các dạng content phổ biến', '', 'Video bài học', 'https://youtu.be/EOoDp0yD3_M', 'https://www.youtube.com/embed/EOoDp0yD3_M', 'enrolled_only', 1),
  ((select id from module_3), 'Bài 10 - Hướng dẫn nghiên cứu đối thủ, lập kế hoạch quảng cáo', '', 'Video bài học', 'https://youtu.be/Wafs1qAU17w', 'https://www.youtube.com/embed/Wafs1qAU17w', 'enrolled_only', 2),
  ((select id from module_3), 'Bài 11 - Tổng quan về quảng cáo Facebook', '', 'Video bài học', 'https://youtu.be/DaDZlw5oHkw', 'https://www.youtube.com/embed/DaDZlw5oHkw', 'enrolled_only', 3),
  ((select id from module_3), 'Bài 12 -  Hướng dẫn quản trị tài khoản doanh nghiệp BM', '', 'Video bài học', 'https://youtu.be/hyBXCRsyyiw', 'https://www.youtube.com/embed/hyBXCRsyyiw', 'enrolled_only', 4),
  ((select id from module_3), 'Bài 13 - Hướng dẫn thêm thẻ thanh toán trên Facebook Ads', '', 'Video bài học', 'https://youtu.be/6zgdfns010s', 'https://www.youtube.com/embed/6zgdfns010s', 'enrolled_only', 5),
  ((select id from module_3), 'Bài 14 - Tất tần tật về Target trên Facebook Ads', '', 'Video bài học', 'https://youtu.be/VDjPx-X-JL0', 'https://www.youtube.com/embed/VDjPx-X-JL0', 'enrolled_only', 6),
  ((select id from module_3), 'Bài 15 - Thiết lập và đọc các chỉ số trên Facebook ADs', '', 'Video bài học', 'https://youtu.be/V5xlkhR2BaM', 'https://www.youtube.com/embed/V5xlkhR2BaM', 'enrolled_only', 7),
  ((select id from module_3), 'Bài 16 - Scale Ngân sách quảng cáo', '', 'Video bài học', 'https://youtu.be/CPQCVqHjjhk', 'https://www.youtube.com/embed/CPQCVqHjjhk', 'enrolled_only', 8);
