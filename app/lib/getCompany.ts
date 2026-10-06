import { cache } from "react";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const getCompany = cache(async () => {
  try {
    const r = await fetch(`${BACKEND}/api/admin/company/public`, {
      next: { revalidate: 3600, tags: ["company"] },
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
});
