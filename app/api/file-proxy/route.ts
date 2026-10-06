import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("missing url", { status: 400 });

  const fetchUrl = url.replace("/image/upload/", "/raw/upload/").replace(/\/fl_attachment:[^/]+\//, "/");

  const res = await fetch(fetchUrl);
  if (!res.ok) return new NextResponse("failed", { status: res.status });

  const body = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "application/pdf";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
