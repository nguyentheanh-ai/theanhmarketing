-- Keep the legacy slug as the stable internal identifier while synchronizing
-- every buyer- and student-facing field for Đội ngũ nhân sự AI.
update public.courses
set
  title = 'Đội ngũ nhân sự AI',
  short_description = 'Bộ 8 Nhân viên AI dành cho doanh nghiệp',
  price = 799000,
  original_price = 999000,
  status = 'open',
  lms_status = 'published',
  updated_at = now()::text
where slug = 'bo-agent-kit-x10-hieu-suat-cong-viec';

update public.lessons
set
  status = 'published',
  published_at = coalesce(published_at, now()),
  updated_at = now()
where module_id in (
  select id
  from public.course_modules
  where course_id = (
    select id
    from public.courses
    where slug = 'bo-agent-kit-x10-hieu-suat-cong-viec'
  )
)
and title in (
  'Cài đặt và đưa dữ liệu doanh nghiệp vào hệ thống',
  'Giao việc cho 8 Nhân viên AI',
  'Kiểm tra đầu ra, lưu SOP và vận hành quảng cáo theo quy trình'
);
