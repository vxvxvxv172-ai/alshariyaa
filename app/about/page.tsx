import type { Metadata } from "next";
import AboutClient from "./AboutClient";

const SITE_URL = "https://www.alshariyaa.com";
const SITE_NAME = "الشريحة الموثوقة";

export const metadata: Metadata = {
  title: `من نحن | ${SITE_NAME}`,
  description:
    "تعرف على الشريحة الموثوقة - رؤيتنا ورسالتنا والخدمات المميزة التي نقدمها لعملائنا في جميع أنحاء المملكة العربية السعودية. شرائح اتصال وباقات إنترنت بأسعار مميزة وتوصيل سريع.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    title: `من نحن | ${SITE_NAME}`,
    description:
      "تعرف على الشريحة الموثوقة - رؤيتنا ورسالتنا والخدمات المميزة التي نقدمها لعملائنا.",
    siteName: SITE_NAME,
    locale: "ar_SA",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
