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
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
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
        source: "/academy",
        destination: "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026",
        permanent: false,
      },
      {
        source: "/academy/facebook-ads-master-2026",
        destination: "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026",
        permanent: false,
      },
      {
        source: "/khoa-hoc/facebook-ads-2026",
        destination: "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/hoc-chay-quang-cao-facebook-tu-so-0-tu-chay-ra-don-2026",
        destination: "/ladipage/facebook-ads-2026.html",
      },
    ];
  },
};

export default nextConfig;
