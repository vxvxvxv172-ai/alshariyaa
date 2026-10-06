import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function GET(req: NextRequest) {
  try {
    // If no customer token cookie exists, user is definitely not authenticated
    // Return early to eliminate unnecessary backend requests & active CPU
    if (!req.cookies.has("customer_token")) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const cookie = req.headers.get("cookie") || "";

    const backendRes = await fetch(`${BACKEND}/api/customers/auth/me`, {
      headers: {
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!backendRes.ok) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
