import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";
import { getBlogPosts } from "@/services/blogService";
import { getCourses } from "@/services/courseService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [courses, blogPosts] = await Promise.all([getCourses(), getBlogPosts()]);
  const staticRoutes = [
    "",
    "/gioi-thieu",
    "/he-sinh-thai",
    "/khoa-hoc",
    "/workshop",
    "/doi-tac",
    "/blog",
    "/hoc-vien",
    "/lien-he",
  ];

  const courseRoutes = courses.map((course) => `/khoa-hoc/${course.slug}`);
  const blogRoutes = blogPosts.map((post) => `/blog/${post.slug}`);

  return [...staticRoutes, ...courseRoutes, ...blogRoutes].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority:
      route === "" ? 1 : route.startsWith("/khoa-hoc") ? 0.9 : 0.7,
  }));
}
