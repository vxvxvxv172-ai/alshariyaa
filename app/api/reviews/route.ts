import { NextRequest, NextResponse } from "next/server";
import { getBackend } from "../admin/_lib";

export async function GET() {
  const res = await fetch(`${getBackend()}/api/admin/reviews`, {
    next: { revalidate: 300 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${getBackend()}/api/admin/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
