'use client';

import Script from 'next/script';

export default function SnapPixel() {
  return (
    <Script
      id="snap-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
snaptr('init', 'b1332f62-8968-4e0d-a4a1-767e4b121ed3', {});
snaptr('track', 'PAGE_VIEW');`,
      }}
    />
  );
}
