import { NextRequest, NextResponse } from "next/server";
import { getBackend, forwardCookies } from "../_lib";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(
      `${getBackend()}/api/admin/verify`,
      forwardCookies(req, {})
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("admin/verify proxy error:", err);
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
