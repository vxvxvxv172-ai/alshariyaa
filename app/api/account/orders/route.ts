import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";
  const orderIds = searchParams.get("orderIds") || "";
  const phone = searchParams.get("phone") || "";

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
  const guestId = req.cookies.get("guest_device_token")?.value || searchParams.get("guestId") || "";

  const backendParams = new URLSearchParams({
    page,
    limit,
    ...(orderIds && { orderIds }),
    ...(phone && { phone }),
    ...(guestId && { guestId }),
  });

  try {
    const res = await fetch(`${BACKEND}/api/customers/orders?${backendParams.toString()}`, {
      headers: {
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
        "x-client-ip": clientIp,
        "x-guest-id": guestId,
      },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بالخادم", orders: [], total: 0 }, { status: 500 });
  }
}
