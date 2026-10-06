const ALLOWED_HOSTS = [
  "localhost",
  "sahelnahatelecom.com",
  "www.sahelnahatelecom.com",
  "basmat-hatify-store.com",
  "backend-sahlnaha-simcard-production.up.railway.app",
  "backend-for-bsmastore-public-production-5e58.up.railway.app",
  "lamsa-simicard-backend.vercel.app",
  "lamsa-simicard-backend-production.up.railway.app",
  "alshareehaa-backend.vercel.app",
  "alshareehasim-backend.vercel.app",
  "alsharihaa.com",
  "www.alsharihaa.com",
];
const ALLOWED_PREFIXES = [
  "/api/admin",
  "/api/products",
  "/api/checkout",
];

function getApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  try {
    const { hostname, origin } = new URL(raw);
    if (!ALLOWED_HOSTS.includes(hostname)) throw new Error(`Blocked host: ${hostname}`);
    return origin;
  } catch {
    return "http://localhost:5000";
  }
}

export const API = getApiBase();

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
    throw new Error(`Blocked path: ${path}`);
  }
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;
  return fetch(url, init);
}
