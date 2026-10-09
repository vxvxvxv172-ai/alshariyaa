"use client";

declare global {
  interface Window {
    ttq?: {
      identify: (data: object) => void;
      track: (event: string, data?: object) => void;
    };
  }
}

async function sha256(value: string): Promise<string> {
  if (!value) return "";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function identify(email?: string, phone?: string, externalId?: string) {
  if (!window.ttq) return;
  window.ttq.identify({
    email: await sha256(email || ""),
    phone_number: await sha256(phone || ""),
    external_id: await sha256(externalId || ""),
  });
}

type ContentItem = { content_id: string; content_type: "product" | "product_group"; content_name: string; quantity?: number; price?: number };
type EventData = { contents: ContentItem[]; value: number; currency: string; search_string?: string };

function track(event: string, data: EventData) {
  if (typeof window === "undefined") return;
  try {
    // Keep early clicks until the base pixel attaches its SDK to this queue.
    if (!window.ttq) {
      const queue = [] as unknown as NonNullable<Window["ttq"]> & unknown[][];
      queue.track = (name, payload) => { queue.push(["track", name, payload]); };
      queue.identify = (payload) => { queue.push(["identify", payload]); };
      window.ttq = queue;
    }
    window.ttq.track(event, data);
  } catch {
    // A failed analytics SDK must not interrupt shopping.
  }
}

export { identify, track };
