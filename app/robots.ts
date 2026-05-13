import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/learn", "/dang-nhap", "/dang-ky"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
