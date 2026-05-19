# Content Audit - 2026-05-19

## Route Checklist

| Route | Primary Job | Content Issues Found | Fix Decision |
| --- | --- | --- | --- |
| `/` | Giới thiệu The Anh Marketing như hệ sinh thái học Marketing & AI | Nhiều headline còn tiếng Anh, CTA chưa đồng bộ, section title chưa nói rõ giá trị học viên | Rewrite hero, module, proof hub và CTA cuối bằng tiếng Việt rõ hướng đăng ký |
| `/he-sinh-thai` | Giải thích cách khóa học, tài liệu, dashboard học viên và admin CRM kết nối | Nội dung còn thiên về mockup, chưa giải thích đủ hệ sinh thái vận hành | Viết lại theo mô hình The Anh OS và các điểm nối logic thật |
| `/khoa-hoc` | Bán và tổ chức catalog khóa học | Intro còn generic, cần nhấn Facebook Ads 2026 và các nhóm workflow | Rewrite catalog intro, giữ card lấy dữ liệu thật từ course service |
| `/khoa-hoc/facebook-ads-2026` | Trình bày đúng khóa Facebook Ads 2026 | Cần rà thumbnail, title, mô tả ngắn và fallback nếu CMS thiếu dữ liệu | Chuẩn hóa fallback course content, không đổi slug hoặc logic mua học |
| `/blog` | Gộp bài viết và thư viện tài liệu | Cần wording rõ blog + tài liệu đã gom chung | Rewrite intro, section tài liệu và CTA card |
| `/blog/[slug]` | Render trang bài viết dễ đọc | Template label còn khô và một số CTA chưa đúng ngữ cảnh | Rewrite label tác giả, mục lục, CTA cuối bài và liên quan |
| `/hoc-vien` | Giải thích trải nghiệm học viên và dashboard | Cần nhấn học, lưu tài liệu, tiến độ, hỗ trợ | Rewrite hero và CTA đăng nhập/xem khóa |
| `/gioi-thieu` | Giải thích định vị The Anh Marketing | Cần bớt generic, nói rõ thực chiến và hệ thống | Rewrite hero/about principles theo định vị mới |
| `/lien-he` | Giúp người dùng liên hệ hoặc đăng ký tư vấn | Cần microcopy rõ nhu cầu học, Zalo, email, form lead | Rewrite contact intent và form labels |
| `/doi-tac` | Giải thích hợp tác đào tạo/triển khai | Cần mô tả rõ đối tượng doanh nghiệp, cộng đồng, đối tác | Rewrite page theo training/workshop/workflow cho team |
| `/workshop` | Giải thích workshop live và replay | Cần CTA “Giữ chỗ” và nội dung live thực chiến | Rewrite hero, session cards và replay text |
| `/dashboard` | Nhãn dashboard học viên, empty state, quyền học | Một số label cần thân thiện và nhất quán | Chuẩn hóa toàn bộ label học viên, giữ logic ownership |
| `/admin/dashboard` | Dashboard admin CRM vận hành | Cần wording CRM chuyên nghiệp hơn | Chỉ sửa label, không đổi fetch/auth/table logic |

## Global Decisions

- Guest primary CTA: “Khám phá hệ sinh thái” -> `/dang-ky`.
- Resource route: `/tai-lieu` redirects to `/blog#tai-lieu`.
- Course slugs and course ownership logic remain unchanged.
- Không đổi Supabase schema, auth, cart, checkout, SePay webhook hoặc quyền học viên cũ.
