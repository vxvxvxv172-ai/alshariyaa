import type { Metadata } from "next";
// leaflet CSS مطلوب فقط في checkout (AddressMap)
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
