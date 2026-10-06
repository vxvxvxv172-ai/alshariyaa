"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function FileViewer() {
  const params = useSearchParams();
  const url = params.get("url");

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <p className="text-gray-500 text-lg">لا يوجد ملف لعرضه</p>
          <Link href="/" className="text-teal-600 hover:underline">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(url)}`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      <header className="bg-[#053132] text-white px-4 py-3 flex items-center justify-between" dir="rtl">
        <h1 className="text-sm font-bold">عرض الملف</h1>
        <div className="flex gap-3">
          <a href={proxyUrl} download className="text-xs bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded transition">
            تحميل
          </a>
          <Link href="/" className="text-xs bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded transition">
            الرئيسية
          </Link>
        </div>
      </header>
      <iframe
        src={`${proxyUrl}#toolbar=1&view=FitH`}
        className="flex-1 w-full"
        title="file-viewer"
        style={{ minHeight: "calc(100vh - 52px)" }}
      />
    </div>
  );
}

export default function FileViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>جاري التحميل...</p></div>}>
      <FileViewer />
    </Suspense>
  );
}
