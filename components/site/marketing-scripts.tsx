/* eslint-disable @next/next/next-script-for-ga */
import { Suspense } from "react";
import type { MarketingSettings } from "@/lib/marketing-settings";
import { PRIMARY_META_PIXEL_ID } from "@/lib/marketing-settings";
import { getCspNonce } from "@/lib/security/nonce";
import { TrackingPageView } from "@/components/site/tracking-page-view";

export async function MarketingScripts({ settings }: { settings: MarketingSettings }) {
  const nonce = await getCspNonce();
  const trackingEnabled = settings.trackingEnabled;
  const facebookPixelId = settings.facebookPixelId || PRIMARY_META_PIXEL_ID;
  const hasFacebookPixel = trackingEnabled && settings.facebookPixelEnabled && facebookPixelId === PRIMARY_META_PIXEL_ID;
  const hasGa = trackingEnabled && settings.gaEnabled && settings.gaMeasurementId;
  const hasGtm = trackingEnabled && settings.gtmEnabled && settings.gtmId;

  if (!hasFacebookPixel && !hasGa && !hasGtm) {
    return null;
  }

  return (
    <>
      {hasGtm ? (
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${settings.gtmId}');
`,
          }}
        />
      ) : null}

      {hasGa ? (
        <>
          <script async nonce={nonce} src={`https://www.googletagmanager.com/gtag/js?id=${settings.gaMeasurementId}`} />
          <script
            nonce={nonce}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${settings.gaMeasurementId}', { send_page_view: false });
`,
            }}
          />
        </>
      ) : null}

      {hasFacebookPixel ? (
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PRIMARY_META_PIXEL_ID}');
`,
          }}
        />
      ) : null}

      <Suspense fallback={null}>
        <TrackingPageView />
      </Suspense>

      {hasGtm ? (
        <noscript>
          <iframe
            height="0"
            src={`https://www.googletagmanager.com/ns.html?id=${settings.gtmId}`}
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
            width="0"
          />
        </noscript>
      ) : null}
      {hasFacebookPixel ? (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            height="1"
            src={`https://www.facebook.com/tr?id=${PRIMARY_META_PIXEL_ID}&ev=PageView&noscript=1`}
            style={{ display: "none" }}
            width="1"
          />
        </noscript>
      ) : null}
    </>
  );
}
