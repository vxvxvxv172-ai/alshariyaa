'use client';

import Script from 'next/script';

// ─── Pixel IDs ────────────────────────────────────────────────────────────────
// Primary pixel — loaded via env var, falls back to hardcoded value.
const PIXEL_ID_PRIMARY =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || 'DB4IAG3C77U4O1M3UD7G';

// Secondary pixel — set NEXT_PUBLIC_TIKTOK_PIXEL_ID_2 in .env.local to enable.
const PIXEL_ID_2 =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID_2 || 'DB5PRVRC77U6DDDLCHRO';

// Build the inline bootstrap script.
// Loads both pixels if the second ID is present; otherwise loads only the first.
function buildScript(id1: string, id2?: string): string {
  const base = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};`;
  const load1 = `ttq.load('${id1}');`;
  const load2 = id2 ? `ttq.load('${id2}');` : '';
  const page  = `ttq.page()}(window,document,'ttq');`;
  return base + load1 + load2 + page;
}

export default function TikTokPixel() {
  if (!PIXEL_ID_PRIMARY) return null;
  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: buildScript(PIXEL_ID_PRIMARY, PIXEL_ID_2 || undefined),
      }}
    />
  );
}
