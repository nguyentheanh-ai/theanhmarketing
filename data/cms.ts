import { blogPosts } from "@/data/blog";
import { courses } from "@/data/courses";
import { homePage } from "@/data/home";
import { publicPages } from "@/data/pages";
import { resources } from "@/data/resources";
import { faqs, mainNav, platformStats, siteConfig } from "@/data/site";
import { testimonials } from "@/data/testimonials";

export const cms = {
  site: siteConfig,
  navigation: mainNav,
  home: homePage,
  pages: publicPages,
  stats: platformStats,
  courses,
  resources,
  blogPosts,
  testimonials,
  faqs,
};

export const cmsSections = [
  {
    label: "Thông tin website",
    file: "data/site.ts",
    description: "Logo, tên thương hiệu, domain, hotline, email, menu, FAQ.",
  },
  {
    label: "Trang chủ",
    file: "data/home.ts",
    description: "Hero, CTA, các section, lộ trình, tiêu đề và mô tả trang chủ.",
  },
  {
    label: "Trang public",
    file: "data/pages.ts",
    description: "Tiêu đề, mô tả và ghi chú cho các trang khóa học, blog, tài liệu, giới thiệu, học viên, liên hệ.",
  },
  {
    label: "Khóa học",
    file: "data/courses.ts",
    description: "Tên khóa học, giá, mô tả, module, bài học, giảng viên, đánh giá.",
  },
  {
    label: "Tài liệu",
    file: "data/resources.ts",
    description: "Checklist, template, guide, mô tả và CTA nhận tài liệu.",
  },
  {
    label: "Blog",
    file: "data/blog.ts",
    description: "Bài viết, slug, chuyên mục, mô tả SEO và nội dung ngắn.",
  },
  {
    label: "Feedback",
    file: "data/testimonials.ts",
    description: "Feedback học viên hiển thị ở trang chủ và trang học viên.",
  },
];
