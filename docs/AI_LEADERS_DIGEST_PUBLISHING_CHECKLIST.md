# AI Leaders Digest Publishing Checklist

## Style Reference

Reference article: `https://www.skillsbridge.vn/blogs/all-posts/google-io-2026-cap-nhat-moi`.

Use the reference for structure, not copy:

- Category and publish date near the title.
- Large hero image before the article body.
- Mục lục immediately after the hero/opening.
- Numbered sections with short explanatory paragraphs.
- Visuals inserted between important sections.
- Tone: cập nhật mới, dễ hiểu, giải thích tác động thực tế.

## Article Checklist

- Choose one source article or keynote and verify the latest source URL.
- Write a new Vietnamese title, not a direct translation.
- Add `category`, `readTime`, `publishedAt`, `thumbnail`, `excerpt`.
- Open with why this update matters for SME, solopreneur, marketer, or knowledge business.
- Put the original source link near the first content section, not only at the end.
- Use numbered `h2` sections so `/blog/[slug]` can build a dynamic table of contents.
- Add at least one `figure` with a local image from `public/blog-thumbnails/ai-leaders`.
- Include practical interpretation for The Anh Marketing's AI Growth System.
- Add a checklist or workflow section.
- Add source links under `Nguồn tham khảo`.
- Add CTA links to one course and `/blog#tai-lieu`.

## Upload Checklist

- Put public images under `public/blog-thumbnails/ai-leaders`.
- Add or update the post in `data/blog.ts`.
- Verify `/blog` card uses the right image.
- Verify `/blog/<slug>` shows hero image, dynamic mục lục, content image, and CTA.
- Run:
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - local smoke test for `/blog`, `/blog/<slug>`, `/sitemap.xml`
