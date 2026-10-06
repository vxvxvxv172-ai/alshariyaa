'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initializeSnapPixel } from '../lib/snapPixel';

export default function SnapPixel() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  useEffect(() => {
    const snaptr = initializeSnapPixel();
    if (pathname && previousPath.current !== pathname) {
      snaptr('track', 'PAGE_VIEW');
      previousPath.current = pathname;
    }
  }, [pathname]);
  return <Script id="snap-pixel-sdk" src="https://sc-static.net/scevent.min.js" strategy="afterInteractive" />;
}
