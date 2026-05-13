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
    '799.000đ',
    '3.995.000đ',
    'open',
    '4 giờ',
    8,
    'Người mới đến thực chiến',
    '12/04/2026',
    '',
    '',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
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
    'Nền tảng trước khi chạy tiền',
    'Hiểu vai trò của Facebook Ads trong hệ thống marketing và cách đặt mục tiêu đúng.',
    1
  )
  returning id
),
module_2 as (
  insert into public.course_modules (course_id, title, description, sort_order)
  values (
    (select id from upserted_course),
    'Chuẩn bị tài khoản và tracking',
    'Thiết lập nền tảng kỹ thuật đủ gọn để đo lường và ra quyết định.',
    2
  )
  returning id
),
module_3 as (
  insert into public.course_modules (course_id, title, description, sort_order)
  values (
    (select id from upserted_course),
    'Triển khai và tối ưu chiến dịch',
    'Xây campaign, test creative, đọc dữ liệu và scale có kỷ luật.',
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
  ((select id from module_1), 'Facebook Ads nên đứng ở đâu trong phễu bán hàng?', '', '18 phút', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'free_preview', 1),
  ((select id from module_1), 'Tư duy khách hàng, offer và thông điệp', '', '22 phút', '', '', 'enrolled_only', 2),
  ((select id from module_1), 'Các lỗi người mới thường gặp', '', '16 phút', '', '', 'locked', 3),
  ((select id from module_2), 'Tài khoản quảng cáo, fanpage và quyền truy cập', '', '20 phút', '', '', 'enrolled_only', 1),
  ((select id from module_2), 'Pixel, event, UTM và tín hiệu chuyển đổi', '', '26 phút', '', '', 'enrolled_only', 2),
  ((select id from module_3), 'Cấu trúc campaign cho người mới', '', '28 phút', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'free_preview', 1),
  ((select id from module_3), 'Test creative, hook và angle', '', '24 phút', '', '', 'enrolled_only', 2),
  ((select id from module_3), 'Đọc số liệu để tắt, sửa hoặc scale', '', '32 phút', '', '', 'locked', 3);
