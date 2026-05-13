# Basic CMS Guide

This project uses a static CMS/config layer so content can be edited without
digging through UI components.

## Edit These Files

- `data/site.ts`: brand name, phone, email, domain, navigation, stats, FAQ.
- `data/home.ts`: homepage hero, CTA, section headings, learning path.
- `data/pages.ts`: headings and descriptions for public pages like courses,
  blog, resources, about, students, contact.
- `data/courses.ts`: course title, price, CTA text, thumbnail labels, modules,
  lessons, instructor, reviews, related courses.
- `data/resources.ts`: resources, checklist, templates, lead magnets.
- `data/blog.ts`: blog posts, slugs, excerpts, article content.
- `data/testimonials.ts`: student feedback.

## Admin Preview

Open `/admin/cms` to see the current CMS groups and form mockups. The forms are
frontend-only for now. They document what the future editable CMS should store.

## Image Fields

The current public UI uses placeholders. When real media is ready, add fields to
the relevant data object, for example:

```ts
thumbnail: "/images/courses/facebook-ads-2026.jpg"
```

Then render it in the related component.

## Before Connecting A Backend

Keep component props aligned with the data types in `data/courses.ts` and other
data files. This makes it easier to replace static imports with API responses
later.
