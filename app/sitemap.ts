import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog";
import { courses } from "@/data/courses";
import { siteConfig } from "@/data/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/gioi-thieu",
    "/khoa-hoc",
    "/blog",
    "/tai-lieu",
    "/hoc-vien",
    "/lien-he",
  ];

  const courseRoutes = courses.map((course) => `/khoa-hoc/${course.slug}`);
  const blogRoutes = blogPosts.map((post) => `/blog/${post.slug}`);

  return [...staticRoutes, ...courseRoutes, ...blogRoutes].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route.startsWith("/khoa-hoc") ? 0.9 : 0.7,
  }));
}
