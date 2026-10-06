import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";

export async function PATCH(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";
    if (!cookie) {
      return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
    }

    const body = await req.json();

    const backendRes = await fetch(`${BACKEND}/api/customers/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json().catch(() => ({ error: "خطأ في معالجة الرد" }));
    const res = NextResponse.json(data, { status: backendRes.status });

    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }

    return res;
  } catch (err: any) {
    console.error("account/profile route error:", err?.message);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
