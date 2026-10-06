import { NextRequest, NextResponse } from "next/server";
import { getBackend, forwardCookies } from "../_lib";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const qs = searchParams.toString();
  const res = await fetch(`${getBackend()}/api/checkout${qs ? `?${qs}` : ""}`, forwardCookies(req, {}));
  const data = await res.json();
  if (data && typeof data === "object") {
    const limit = Number(searchParams.get("limit")) || data.limit || 20;
    const total = Number(data.total) || 0;
    data.totalPages = data.totalPages ?? data.pages ?? Math.max(1, Math.ceil(total / limit));
  }
  return NextResponse.json(data, { status: res.status });
}
