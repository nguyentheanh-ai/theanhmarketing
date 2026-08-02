import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";
import { getCourses } from "@/services/courseService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await getCourses();
  const staticRoutes = [
    "",
    "/dich-vu",
    "/khoa-hoc",
    "/tai-lieu",
    "/workshop",
  ];

  const courseRoutes = courses
    .filter((course) => course.status === "open" && course.landingPageUrl)
    .map((course) => course.landingPageUrl as string);

  return [...staticRoutes, ...courseRoutes].map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority:
      route === "" ? 1 : route.startsWith("/khoa-hoc") ? 0.9 : 0.7,
  }));
}
