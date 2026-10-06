import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookie = req.headers.get("cookie") || "";

    const res = await fetch(`${BACKEND}/api/customers/orders/${encodeURIComponent(id)}`, {
      headers: {
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({ error: "خطأ في قراءة بيانات الطلب" }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بالخادم" }, { status: 503 });
  }
}
