import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

// Admin pages must never be indexed by search engines
export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
