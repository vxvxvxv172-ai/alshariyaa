import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const res = await fetch(`${BACKEND}/api/customers/orders/claim`, {
      method: "POST",
      headers: {
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
    });

    // Backend may not have this endpoint yet — treat any non-JSON or 404 as silent no-op
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ claimed: 0 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? res.status : 200 });
  } catch {
    // Silent — this is a background best-effort call
    return NextResponse.json({ claimed: 0 });
  }
}
