import { ImageResponse } from "next/og";
import { siteConfig } from "@/data/site";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#fbfaf7",
          color: "#0b0b0c",
          padding: "72px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#ffffff",
              color: "#0b0b0c",
              border: "1px solid rgba(11,11,12,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            TA
          </div>
          {siteConfig.name}
        </div>
        <div
          style={{
            marginTop: 70,
            fontSize: 86,
            lineHeight: 0.95,
            letterSpacing: "-5px",
            fontWeight: 900,
            maxWidth: 950,
          }}
        >
          AI Performance Marketing System
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "rgba(11,11,12,0.62)",
            maxWidth: 780,
            lineHeight: 1.45,
          }}
        >
          Xây Growth System bằng AI, Performance Ads, Funnel, Automation và CRM/Data.
        </div>
      </div>
    ),
    size,
  );
}
