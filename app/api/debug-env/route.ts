import { NextResponse } from "next/server";

// Route مؤقت للتشخيص فقط — احذفه بعد حل المشكلة
// يكشف أي env vars ناقصة بدون الكشف عن القيم
export async function GET() {
  const vars = {
    BACKEND_URL:        !!process.env.BACKEND_URL,
    INTERNAL_SECRET:    !!process.env.INTERNAL_SECRET,
    RESEND_API_KEY:     !!process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL:  !!process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME:   !!process.env.RESEND_FROM_NAME,
    NODE_ENV:           process.env.NODE_ENV,
    BACKEND_URL_VALUE:  process.env.BACKEND_URL || "(not set — will use localhost:5000)",
  };

  // اختبر الاتصال بالـ backend
  let backendReachable = false;
  let backendStatus: number | string = "unknown";
  try {
    const res = await fetch(
      `${process.env.BACKEND_URL || "http://localhost:5000"}/`,
      { signal: AbortSignal.timeout(5000) }
    );
    backendReachable = res.ok;
    backendStatus = res.status;
  } catch (e: any) {
    backendStatus = e?.message || "fetch failed";
  }

  return NextResponse.json({ vars, backendReachable, backendStatus });
}
