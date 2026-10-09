# Implementation Plan — TikTok Pixel Verification + Snap Pixel Fixes

## Findings from code exploration

### TikTok Pixel (Fix 4 — audit before coding)

**File:** `app/components/TikTokPixel.tsx`

The TikTok Pixel ID is **hardcoded** directly in the inline script:
```
ttq.load('DB4IAG3C77U4O1M3UD7G')
```
`.env.local` has **no** `NEXT_PUBLIC_TIKTOK_PIXEL_ID` variable at all — it was never added.
This means the pixel still works in production, but it cannot be changed without a code deploy
and the ID is exposed in the source. Fix 4 below covers this.

**Event coverage matrix:**

| Event | TikTok | Snap |
|---|---|---|
| `PAGE_VIEW` | ✅ (`ttq.page()` in TikTokPixel.tsx inline script on every load) | ✅ (`SnapPixel.tsx` — pathname-tracked) |
| `VIEW_CONTENT` | ❌ missing — no `track("ViewContent",…)` call found | ✅ (`useSnapProductView` in ProductPageClient.tsx) |
| `ADD_CART` | ❌ missing — `handleAddToCart` in ProductCard only calls `trackSnapProduct`, never `ttq.track("AddToCart",…)` | ✅ (ProductCard.tsx — currently called twice → Fix 3) |
| `InitiateCheckout` / `START_CHECKOUT` | ✅ TikTok: `track("InitiateCheckout",…)` in checkout/page.tsx useEffect | ❌ Snap: entirely missing → Fix 2 |
| `PURCHASE` | ✅ TikTok: `track("Purchase",…)` in verify/page.tsx handleSuccess | ❌ Snap: `trackSnapPurchase` never called → Fix 1 |
| `AddPaymentInfo` | ✅ TikTok: `track("AddPaymentInfo",…)` in `fireAddPaymentInfo` | ❌ Snap: no equivalent (out of scope for this task) |

**Events fired by Snap but NOT by TikTok:**
- `VIEW_CONTENT` — TikTok never fires `ViewContent` on product pages

**Events fired by TikTok but NOT by Snap:**
- `AddPaymentInfo` — Snap has `ADD_BILLING` but it's optional and out of scope

---

## Fix 1 — PURCHASE not sent to Snap (CRITICAL)

- [ ] 1. Add `trackSnapPurchase` call inside `handleSuccess` in `app/checkout/verify/page.tsx`.

   **What to do:**
   Add an import for `trackSnapPurchase` from `../../lib/snapPixel` at the top of the file,
   then call it immediately after the `track("Purchase", …)` TikTok call inside `handleSuccess`.
   Guard with a non-empty `transaction_id` check before calling.

   **File:** `app/checkout/verify/page.tsx`

   **Current import line (line 6):**
   ```ts
   import { identify, track } from "../../lib/useTikTokEvents";
   ```
   **Change to:**
   ```ts
   import { identify, track } from "../../lib/useTikTokEvents";
   import { trackSnapPurchase } from "../../lib/snapPixel";
   ```

   **Current `handleSuccess` body (lines ~110–122):**
   ```ts
   identify();
   track("Purchase", {
     contents: (verifyData.items || []).map(i => ({ content_id: i.productId || "", content_type: "product" as const, content_name: i.name })),
     value: verifyData.amount,
     currency: "SAR",
   });
   clear();
   ```

   **Add these lines immediately after `track("Purchase", …)` and before `clear()`:**
   ```ts
   const snapTxId = verifyData.orderId ?? verifyData._id ?? '';
   if (snapTxId.trim()) {
     trackSnapPurchase({
       price: verifyData.amount,
       currency: 'SAR',
       transaction_id: snapTxId,
       item_ids: (verifyData.items || []).map(i => i.productId || '').filter(id => id.trim() !== ''),
       number_items: (verifyData.items || []).reduce((s, i) => s + i.quantity, 0),
     });
   }
   ```

   **Verify:** `npm run build` — no TypeScript errors. Then `npm test` — existing snapPixel tests pass.

---

## Fix 2 — START_CHECKOUT missing from Snap (IMPORTANT)

- [ ] 2. Add Snap `START_CHECKOUT` event in the `InitiateCheckout` useEffect in `app/checkout/page.tsx`.

   **What to do:**
   Add an import for `initializeSnapPixel` from `../lib/snapPixel` at the top of the file,
   then call `initializeSnapPixel()('track', 'START_CHECKOUT', …)` inside the existing
   `useEffect` that fires `InitiateCheckout`, right after the `track("InitiateCheckout", …)` call.

   **File:** `app/checkout/page.tsx`

   **Current import line (line 22):**
   ```ts
   import { identify, track } from "../lib/useTikTokEvents";
   ```
   **Change to:**
   ```ts
   import { identify, track } from "../lib/useTikTokEvents";
   import { initializeSnapPixel } from "../lib/snapPixel";
   ```

   **Current useEffect (locate the one with `[mounted]` dependency, ~line 95–103):**
   ```ts
   useEffect(() => {
     if (!mounted || items.length === 0) return;
     identify();
     track("InitiateCheckout", {
       contents: items.map(i => ({ content_id: i.product._id, content_type: "product" as const, content_name: i.product.name })),
       value: Math.max(0, totalPrice() - discount),
       currency: "SAR",
     });
   }, [mounted]);
   ```

   **Add these lines immediately after the `track("InitiateCheckout", …)` call, still inside the same useEffect:**
   ```ts
   initializeSnapPixel()('track', 'START_CHECKOUT', {
     price: Math.max(0, totalPrice() - discount),
     currency: 'SAR',
     item_ids: items.map(i => i.product._id),
     number_items: items.reduce((s, i) => s + i.qty, 0),
   });
   ```

   **Verify:** `npm run build` — no TypeScript errors.

---

## Fix 3 — ADD_CART called twice in ProductCard (MINOR)

- [ ] 3. Remove the duplicate `trackSnapProduct('ADD_CART', product)` call in `app/components/products/ProductCard.tsx`.

   **What to do:**
   In `handleAddToCart`, `trackSnapProduct('ADD_CART', product)` currently appears only once
   at line ~66 in the file you read. Cross-check the prior audit: the audit flagged a duplicate.
   Re-read the actual file section around `handleAddToCart` to confirm whether there are
   one or two calls, then remove the second one if present.

   > **Note from exploration:** The file read shows only ONE call at line 66 (`trackSnapProduct('ADD_CART', product);`).
   > The prior audit flagged a duplicate that may have already been removed. The coder must verify by reading
   > the live file — if two identical consecutive calls exist, delete the second; if only one exists, no change needed.

   **File:** `app/components/products/ProductCard.tsx`

   **Pattern to check for (two identical consecutive lines):**
   ```ts
   trackSnapProduct('ADD_CART', product);
   trackSnapProduct('ADD_CART', product);
   ```
   If found, reduce to one:
   ```ts
   trackSnapProduct('ADD_CART', product);
   ```

   **Verify:** `npm run build` — no TypeScript errors.

---

## Fix 4 — TikTok Pixel: hardcoded ID + missing events (IMPORTANT)

- [ ] 4a. Move the TikTok Pixel ID from hardcoded string to an env var in `app/components/TikTokPixel.tsx`.

   **What to do:**
   The pixel ID `DB4IAG3C77U4O1M3UD7G` is hardcoded in the inline `__html` string inside
   `TikTokPixel.tsx`. There is no `NEXT_PUBLIC_TIKTOK_PIXEL_ID` in `.env.local` at all.

   Step A — add the variable to `.env.local`:
   ```
   NEXT_PUBLIC_TIKTOK_PIXEL_ID=DB4IAG3C77U4O1M3UD7G
   ```

   Step B — update `TikTokPixel.tsx` to read from the env var. Because the pixel ID
   is embedded in a `dangerouslySetInnerHTML` inline script, use a template literal.
   The component is already a `'use client'` component so `process.env.NEXT_PUBLIC_*`
   is available at build time.

   **File:** `app/components/TikTokPixel.tsx`

   Replace the hardcoded `ttq.load('DB4IAG3C77U4O1M3UD7G')` fragment inside the `__html` string.
   The full component becomes:

   ```tsx
   'use client';

   import Script from 'next/script';

   const PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '';

   export default function TikTokPixel() {
     if (!PIXEL_ID) return null;
     return (
       <Script
         id="tiktok-pixel"
         strategy="afterInteractive"
         dangerouslySetInnerHTML={{
           __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${PIXEL_ID}');ttq.page()}(window,document,'ttq');`,
         }}
       />
     );
   }
   ```

   **Verify:** `npm run build` — no TypeScript errors. Confirm the built HTML still contains the pixel ID.

- [ ] 4b. Add TikTok `ViewContent` event on product pages to match Snap's `VIEW_CONTENT`.

   **What to do:**
   Snap fires `VIEW_CONTENT` from `ProductPageClient.tsx` via `useSnapProductView`, but TikTok
   never fires `ViewContent`. Find where `useSnapProductView` is called (or where `VIEW_CONTENT`
   is tracked in the product page) and add the equivalent TikTok call alongside it.

   First, locate the product page component that calls `trackSnapProduct('VIEW_CONTENT', product)`.
   Most likely: `app/components/products/ProductPageClient.tsx` or similar. Read that file first.

   The TikTok equivalent call to add (immediately after `trackSnapProduct('VIEW_CONTENT', …)`):
   ```ts
   import { track } from '../../lib/useTikTokEvents'; // adjust path if needed

   track("ViewContent", {
     contents: [{ content_id: product._id, content_type: "product", content_name: product.name }],
     value: product.salePrice ?? product.originalPrice ?? product.price ?? 0,
     currency: "SAR",
   });
   ```

   **File to modify:** whichever file currently calls `trackSnapProduct('VIEW_CONTENT', product)` —
   identify it by running: find usages of `'VIEW_CONTENT'` across the codebase.

   **Verify:** `npm run build` — no TypeScript errors.

---

## Final Verification Step

After all fixes are applied, run the following to confirm event balance across checkout files:

```powershell
# Confirm snaptr calls exist in checkout files
Select-String -Path "frontend\app\checkout\verify\page.tsx","frontend\app\checkout\page.tsx" -Pattern "snaptr|trackSnap"

# Confirm tiktok calls exist in checkout files
Select-String -Path "frontend\app\checkout\verify\page.tsx","frontend\app\checkout\page.tsx" -Pattern "ttq|track\("

# Confirm ADD_CART is no longer duplicated in ProductCard
Select-String -Path "frontend\app\components\products\ProductCard.tsx" -Pattern "trackSnapProduct"

# Confirm env var is set
Select-String -Path "frontend\.env.local" -Pattern "NEXT_PUBLIC_TIKTOK_PIXEL_ID"

# Confirm pixel ID is no longer hardcoded
Select-String -Path "frontend\app\components\TikTokPixel.tsx" -Pattern "DB4IAG3C77U4O1M3UD7G"
```

Expected outcomes:
- `verify/page.tsx` shows both `track("Purchase"` (TikTok) **and** `trackSnapPurchase` (Snap)
- `checkout/page.tsx` shows both `track("InitiateCheckout"` (TikTok) **and** `initializeSnapPixel()('track', 'START_CHECKOUT'` (Snap)
- `ProductCard.tsx` shows exactly **one** `trackSnapProduct` call
- `.env.local` contains `NEXT_PUBLIC_TIKTOK_PIXEL_ID=DB4IAG3C77U4O1M3UD7G`
- `TikTokPixel.tsx` shows `PIXEL_ID` template literal, **not** the raw hardcoded ID

Run `npm run build` after all fixes — must complete with zero TypeScript errors.
Run `npm test` — existing snapPixel unit tests must pass.

---

## Summary of all files to edit

| File | Change |
|---|---|
| `app/checkout/verify/page.tsx` | Add `trackSnapPurchase` import + call in `handleSuccess` |
| `app/checkout/page.tsx` | Add `initializeSnapPixel` import + `START_CHECKOUT` call in useEffect |
| `app/components/products/ProductCard.tsx` | Remove duplicate `trackSnapProduct('ADD_CART', …)` if present |
| `app/components/TikTokPixel.tsx` | Replace hardcoded pixel ID with `process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID` |
| `.env.local` | Add `NEXT_PUBLIC_TIKTOK_PIXEL_ID=DB4IAG3C77U4O1M3UD7G` |
| Product page client file (locate via `VIEW_CONTENT` grep) | Add TikTok `ViewContent` call alongside existing Snap call |
