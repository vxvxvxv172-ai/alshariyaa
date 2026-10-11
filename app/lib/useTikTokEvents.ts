"use client";

declare global {
  interface Window {
    ttq?: {
      identify: (data: object) => void;
      track: (event: string, data?: object) => void;
    };
  }
}

// ─── SHA-256 helper ───────────────────────────────────────────────────────────
// Returns "" for empty/whitespace values so TikTok doesn't receive
// a hash of an empty string (which it flags as invalid data).
async function sha256(value: string): Promise<string> {
  const trimmed = value?.trim()?.toLowerCase() ?? "";
  if (!trimmed) return "";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(trimmed)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Validate email format before hashing ────────────────────────────────────
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Validate & normalise phone number ───────────────────────────────────────
// TikTok requires E.164 format: +[country code][number], digits only after +.
// Saudi numbers: local 05xxxxxxxx → +9665xxxxxxxx
function normalisePhone(phone: string): string {
  if (!phone) return "";
  // Strip all non-digit chars except leading +
  const stripped = phone.replace(/[\s\-().]/g, "");
  // Already E.164
  if (/^\+\d{7,15}$/.test(stripped)) return stripped;
  // Saudi local: 05xxxxxxxx or 5xxxxxxxx
  const digits = stripped.replace(/^\+/, "");
  if (digits.startsWith("05") && digits.length === 10) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `+966${digits}`;
  // Other numeric with country prefix already (no +)
  if (/^\d{10,15}$/.test(digits)) return `+${digits}`;
  return "";
}

// ─── identify() ──────────────────────────────────────────────────────────────
// Only sends fields that are valid — empty strings are excluded so TikTok
// does not receive invalid advanced-matching data.
async function identify(
  email?: string,
  phone?: string,
  externalId?: string
): Promise<void> {
  if (typeof window === "undefined" || !window.ttq) return;

  const payload: Record<string, string> = {};

  if (email && isValidEmail(email)) {
    const hashed = await sha256(email);
    if (hashed) payload.email = hashed;
  }

  const normPhone = normalisePhone(phone ?? "");
  if (normPhone) {
    const hashed = await sha256(normPhone);
    if (hashed) payload.phone_number = hashed;
  }

  if (externalId?.trim()) {
    const hashed = await sha256(externalId);
    if (hashed) payload.external_id = hashed;
  }

  // Don't call identify with an empty payload — it wastes a request and
  // can trigger TikTok warnings about missing advanced-matching data.
  if (Object.keys(payload).length === 0) return;

  try {
    window.ttq.identify(payload);
  } catch {
    // A failed analytics SDK must not interrupt shopping.
  }
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
  // Provide event_id for deduplication when Events API is also used.
  event_id?: string;
};

// ─── track() ─────────────────────────────────────────────────────────────────
// Filters out contents with an empty or missing content_id so TikTok
// never receives unmatched IDs.
function track(event: string, data: EventData): void {
  if (typeof window === "undefined") return;
  try {
    // Keep early clicks until the base pixel attaches its SDK to this queue.
    if (!window.ttq) {
      const queue = [] as unknown as NonNullable<Window["ttq"]> & unknown[][];
      queue.track = (name, payload) => { queue.push(["track", name, payload]); };
      queue.identify = (payload) => { queue.push(["identify", payload]); };
      window.ttq = queue;
    }

    // Filter out any content item that has an empty / undefined content_id.
    const validContents = data.contents.filter(
      (c) => typeof c.content_id === "string" && c.content_id.trim() !== ""
    );

    if (validContents.length === 0 && data.contents.length > 0) {
      // All items had empty IDs — log silently and abort the event rather
      // than sending data that will cause 0% catalog match rate.
      return;
    }

    window.ttq.track(event, { ...data, contents: validContents });
  } catch {
    // A failed analytics SDK must not interrupt shopping.
  }
}

export { identify, track };
