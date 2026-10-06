import { NextRequest } from "next/server";

const BACKEND = "https://alshareehaa-backend.vercel.app";

export function getBackend(): string {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || BACKEND;
}

export function forwardCookies(req: NextRequest, init: RequestInit): RequestInit {
  const cookie = req.headers.get("cookie") || "";
  // Use INTERNAL_SECRET so the backend skips CSRF/origin checks for BFF calls
  const internalSecret = process.env.INTERNAL_SECRET || "";
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    cookie,
    "x-internal-secret": internalSecret,
  };
  if (init.body instanceof FormData) {
    delete headers["content-type"];
    delete headers["Content-Type"];
  }
  return { ...init, headers };
}
