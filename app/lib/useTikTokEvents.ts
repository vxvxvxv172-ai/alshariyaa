"use client";

declare global {
  interface Window {
    ttq?: {
      identify: (data: object) => void;
      track: (event: string, data?: object) => void;
      // ttq.instance(pixelId) returns a per-pixel tracker when multiple pixels are loaded.
      instance?: (pixelId: string) => {
        identify: (data: object) => void;
        track: (event: string, data?: object) => void;
      };
    };
  }
}

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
// Returns "" for empty/whitespace values so TikTok doesn't receive
// a hash of an empty string (which it flags as invalid data).
async function sha256(value: string): Promise<string> {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(trimmed)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Validate email format ────────────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email ?? "").trim());
}

// ─── Normalise phone to E.164 ─────────────────────────────────────────────────
// TikTok requires: +[country_code][number]  e.g. +966512345678
// Saudi local: 0512345678 → +966512345678
//              512345678  → +966512345678
function normalisePhone(phone: string): string {
  if (!phone) return "";
  // Remove formatting chars (spaces, dashes, parentheses, dots)
  const stripped = (phone ?? "").replace(/[\s\-(). ]/g, "");
  // Already valid E.164
  if (/^\+\d{7,15}$/.test(stripped)) return stripped;
  const digits = stripped.replace(/^\+/, "");
  // Saudi: 05xxxxxxxx (10 digits)
  if (digits.startsWith("05") && digits.length === 10) return `+966${digits.slice(1)}`;
  // Saudi: 5xxxxxxxx (9 digits)
  if (digits.startsWith("5") && digits.length === 9) return `+966${digits}`;
  // Already has country code, no leading +
  if (/^\d{10,15}$/.test(digits)) return `+${digits}`;
  return "";
}

// ─── Pixel IDs (must match TikTokPixel.tsx) ───────────────────────────────────
const PIXEL_IDS = [
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID   || "DB4IAG3C77U4O1M3UD7G",
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID_2 || "DB5PRVRC77U6DDDLCHRO",
].filter(Boolean);

// ─── Helper: call a method on ALL loaded pixel instances ─────────────────────
// When multiple pixels are loaded with ttq.load(), ttq.track/identify broadcast
// to ALL of them. But to be explicit and avoid edge-cases we use ttq.instance()
// when available so each pixel definitely receives the event.
function forEachPixel(cb: (tracker: NonNullable<Window["ttq"]>) => void): void {
  if (typeof window === "undefined" || !window.ttq) return;
  const ttq = window.ttq;
  if (typeof ttq.instance === "function") {
    // Fire on every loaded pixel by instance
    PIXEL_IDS.forEach((id) => {
      try {
        const inst = ttq.instance!(id);
        if (inst) cb(inst);
      } catch { /* ignore missing instance */ }
    });
  } else {
    // Fallback: global ttq (broadcasts to all loaded pixels automatically)
    try { cb(ttq); } catch { /* ignore */ }
  }
}

// ─── identify() ──────────────────────────────────────────────────────────────
// Only sends fields that pass validation. Empty/invalid values are skipped
// entirely — TikTok flags SHA-256 of empty strings as invalid.
async function identify(
  email?: string,
  phone?: string,
  externalId?: string
): Promise<void> {
  if (typeof window === "undefined") return;

  const payload: Record<string, string> = {};

  if (email && isValidEmail(email)) {
    const h = await sha256(email);
    if (h) payload.email = h;
  }

  const normPhone = normalisePhone(phone ?? "");
  if (normPhone) {
    const h = await sha256(normPhone);
    if (h) payload.phone_number = h;
  }

  if (externalId?.trim()) {
    const h = await sha256(externalId);
    if (h) payload.external_id = h;
  }

  // Don't call identify with an empty payload — no valid data to send.
  if (Object.keys(payload).length === 0) return;

  forEachPixel((tracker) => { tracker.identify(payload); });
}

// ─── Content item type ───────────────────────────────────────────────────────
type ContentItem = {
  content_id: string;
  content_type: "product" | "product_group";
  content_name: string;
  quantity?: number;
  price?: number;
};

type EventData = {
  contents: ContentItem[];
  value: number;
  currency: string;
  search_string?: string;
  event_id?: string;
};

// ─── track() ─────────────────────────────────────────────────────────────────
// • Fires on ALL loaded pixel instances.
// • Filters out content items with empty content_id before sending.
function track(event: string, data: EventData): void {
  if (typeof window === "undefined") return;
  try {
    // Bootstrap a minimal queue so early calls before the SDK loads are kept.
    if (!window.ttq) {
      const queue = [] as unknown as NonNullable<Window["ttq"]> & unknown[][];
      queue.track    = (name, payload) => { queue.push(["track", name, payload]); };
      queue.identify = (payload)       => { queue.push(["identify", payload]); };
      window.ttq = queue;
    }

    // Filter content items that would cause 0% catalog match rate.
    const validContents = data.contents.filter(
      (c) => typeof c.content_id === "string" && c.content_id.trim() !== ""
    );

    if (validContents.length === 0 && data.contents.length > 0) {
      // All items had empty IDs — abort silently.
      return;
    }

    const payload = { ...data, contents: validContents };
    forEachPixel((tracker) => { tracker.track(event, payload); });
  } catch {
    // A failed analytics call must never interrupt the shopping experience.
  }
}

export { identify, track };
