import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const cookie = req.headers.get("cookie") || "";

    await fetch(`${BACKEND}/api/customers/auth/logout`, {
      method: "POST",
      headers: {
        cookie,
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
    }).catch(() => {});

    const res = NextResponse.json({ ok: true });
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("customer_token", "", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 0,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
