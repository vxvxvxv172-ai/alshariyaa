import { NextRequest, NextResponse } from "next/server";
import { getBackend, forwardCookies } from "../admin/_lib";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") || "";
  const brand = searchParams.get("brand") || "";
  const category = searchParams.get("category") || "";
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (brand) params.set("brand", brand);
  if (category) params.set("category", category);
  const res = await fetch(`${getBackend()}/api/products?${params.toString()}`, forwardCookies(req, { method: "GET" }));
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
