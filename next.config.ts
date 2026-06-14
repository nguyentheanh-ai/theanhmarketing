import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    maximumRedirects: 0,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "qr.sepay.vn",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "vsxxgdzwtscuxcmjfckt.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/khoa-hoc/bo-kit-agent-doanh-nghiep",
        destination: "/academy/bo-kit-agent-doanh-nghiep",
        permanent: false,
      },
      {
        source: "/academy",
        destination: "/khoa-hoc",
        permanent: false,
      },
      {
        source: "/academy/ebook-facebook-ads-2026.html",
        destination: "/academy/ebook-facebook-ads-2026",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/academy/facebook-ads-master-2026",
        destination: "/academy/facebook-ads-master-2026.html",
      },
      {
        source: "/academy/ebook-facebook-ads-2026",
        destination: "/academy/ebook-facebook-ads-2026.html",
      },
      {
        source: "/academy/bo-kit-agent-doanh-nghiep",
        destination: "/khoa-hoc/bo-kit-agent-doanh-nghiep",
      },
    ];
  },
};

export default nextConfig;
