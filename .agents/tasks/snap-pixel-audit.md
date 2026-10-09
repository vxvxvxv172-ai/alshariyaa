# Snap Pixel Audit — sharehaa frontend

## Summary verdict

**الأحداث في صفحتَي الشيك-أوت مربوطة بـ TikTok Pixel فقط، وليس بـ Snap Pixel.**  
البنية التحتية لـ Snap (التهيئة، `PAGE_VIEW`، `ADD_CART`، `VIEW_CONTENT`) شغّالة وصح تمامًا. لكن حدث `START_CHECKOUT` ناقص كليًّا، وحدث `PURCHASE` موجود في صفحة `/checkout/verify` بس بيستدعي دالة TikTok (`track`) مش `trackSnapPurchase`.

---

## 1. أين يُهيَّأ Snap Pixel؟

### الملف: `app/lib/snapPixel.ts`
الدالة `initializeSnapPixel()` تنفذ التسلسل الصحيح حسب مواصفات Snap:
1. تنشئ الـ queue أولًا (`window.snaptr`).
2. تستدعي `init` لكل من البيكسلين قبل تحميل الـ SDK.
3. تُدرج `<script src="https://sc-static.net/scevent.min.js">` في `<head>` مرة واحدة بالضبط (Guard: `window.sharehaaSnapInitialized`).

```
SNAP_PIXEL_ID          = dad784dc-ac9c-45d9-88f5-0981429fcd59
ADDITIONAL_SNAP_PIXEL_ID = eae6c077-579c-45a5-a052-be7679d051ac
```

### الملف: `app/components/SnapPixel.tsx`
Component من نوع Client موضوعة مباشرة في `<body>` داخل `app/layout.tsx`.  
تستدعي `initializeSnapPixel()` ثم تُطلق `PAGE_VIEW` عند كل تغيير مسار (pathname).  
تمنع الإطلاق المزدوج عبر `useRef` + مقارنة `previousPath`.

### الملف: `app/layout.tsx` (السطر 195)
```tsx
<body>
  <SnapPixel />          {/* ← صح: يُهيَّأ مبكرًا في كل الصفحات */}
  <ClientLayout ...>
    {children}
  </ClientLayout>
</body>
```

---

## 2. أحداث Snap في مسار الـ Checkout

### صفحة `/checkout` — `app/checkout/page.tsx`

| المرحلة | الحدث المُطلَق | الـ Pixel |
|---|---|---|
| تحميل الصفحة | `InitiateCheckout` | **TikTok فقط** (`track` من `useTikTokEvents`) |
| اختيار طريقة الدفع | `AddPaymentInfo` | **TikTok فقط** (`track`) |
| إتمام الطلب (cash) | `PlaceAnOrder` | **TikTok فقط** (`track`) |

**لا يوجد أي استدعاء لـ Snap في هذه الصفحة.**  
حدث Snap `START_CHECKOUT` لم يُطلَق بتاتًا.

### صفحة `/checkout/verify` — `app/checkout/verify/page.tsx`

| المرحلة | الحدث المُطلَق | الـ Pixel |
|---|---|---|
| بعد تأكيد OTP (`handleSuccess`) | `Purchase` | **TikTok فقط** (`track` من `useTikTokEvents`) |

```ts
// verify/page.tsx — السطر 115
identify();
track("Purchase", {          // ← دي دالة TikTok، مش trackSnapPurchase
  contents: ...,
  value: verifyData.amount,
  currency: "SAR",
});
```

`trackSnapPurchase` من `app/lib/snapPixel.ts` **لم تُستدعَ في أي مكان من مسار الشيك-أوت.**

---

## 3. أحداث Snap الشغّالة فعلًا (خارج مسار الشيك-أوت)

| الحدث | المكان | الحالة |
|---|---|---|
| `PAGE_VIEW` | `SnapPixel.tsx` (كل صفحة) | ✅ صح |
| `VIEW_CONTENT` | `ProductPageClient.tsx` → `useSnapProductView` | ✅ صح |
| `ADD_CART` | `ProductCard.tsx` و`ProductPageClient.tsx` | ✅ صح |
| `ADD_CART` | `ProductCard.tsx` | ⚠️ يُستدعى مرتين (سطر 66 مكرر) |

### الدالة `trackSnapProduct` (lib/snapPixel.ts)
- تُرسل: `price`, `currency: 'SAR'`, `item_ids`, `item_category` (إن وُجد), `number_items` (لـ ADD_CART فقط).
- تحتوي validation كاملة: `isFinite(price)`, `isInteger(quantity)`, `product._id.trim()`.

### الدالة `trackSnapPurchase` (lib/snapPixel.ts)
- تحتوي validation صحيحة: `transaction_id`, `item_ids`, `number_items`, `currency` regex `[A-Z]{3}`.
- **المشكلة: لا أحد يستدعيها من مسار الشيك-أوت.**

---

## 4. ما الناقص مقارنةً بـ Snap e-commerce spec

### مشكلة 1 — `PURCHASE` لا يُرسَل إلى Snap أبدًا (خطير ⚠️)
`trackSnapPurchase` موجودة ومعمولة صح، لكن `/checkout/verify/page.tsx` يستدعي `track("Purchase", ...)` من `useTikTokEvents`، ولا يستدعي أي دالة Snap.

**الإصلاح:** في `handleSuccess` داخل `verify/page.tsx`، أضف:
```ts
import { trackSnapPurchase } from '../../lib/snapPixel';

// داخل handleSuccess:
trackSnapPurchase({
  price: verifyData.amount,
  currency: 'SAR',
  transaction_id: verifyData.orderId ?? verifyData._id ?? '',
  item_ids: (verifyData.items || []).map(i => i.productId || '').filter(Boolean),
  number_items: (verifyData.items || []).reduce((s, i) => s + i.quantity, 0),
});
```
تأكد أن `transaction_id` غير فارغ قبل الاستدعاء (خلي الشرط موجود أو استخدم `orderId ?? _id ?? ''` كما في النمط الحالي مع فحص).

---

### مشكلة 2 — `START_CHECKOUT` ناقص كليًّا (متوسط ⚠️)
Snap's e-commerce spec يوصي بـ `START_CHECKOUT` عند دخول صفحة الشيك-أوت.  
`checkout/page.tsx` يُطلق `InitiateCheckout` لـ TikTok لكن لا يُطلق `START_CHECKOUT` لـ Snap.

**الإصلاح:** في الـ `useEffect` الخاص بـ `mounted` في `checkout/page.tsx`، أضف بعد `identify()`:
```ts
import { initializeSnapPixel } from '../lib/snapPixel';

// داخل useEffect([mounted]):
if (mounted && items.length > 0) {
  const snaptr = initializeSnapPixel();
  snaptr('track', 'START_CHECKOUT', {
    price: Math.max(0, totalPrice() - discount),
    currency: 'SAR',
    item_ids: items.map(i => i.product._id),
    number_items: items.reduce((s, i) => s + i.qty, 0),
  });
}
```

---

### مشكلة 3 — `ADD_CART` يُطلَق مرتين في `ProductCard.tsx` (بسيطة 🔵)
```ts
// ProductCard.tsx — السطر 66 (مكرر مرتين)
trackSnapProduct('ADD_CART', product);
trackSnapProduct('ADD_CART', product);
```
احذف أحد الاستدعاءين.

---

### مشكلة 4 — `ADD_PAYMENT_INFO` لا يُرسَل لـ Snap (منخفض 🔵)
`checkout/page.tsx` يُطلق `AddPaymentInfo` لـ TikTok عبر `fireAddPaymentInfo`.  
Snap يدعم `ADD_BILLING` لكنه ليس إلزاميًّا حسب المواصفات الأساسية.

---

## 5. ملخص الإصلاحات المطلوبة

| الأولوية | المشكلة | الملف | الإصلاح |
|---|---|---|---|
| 🔴 عاجل | `PURCHASE` لا يُرسَل لـ Snap | `app/checkout/verify/page.tsx` | استدعِ `trackSnapPurchase` في `handleSuccess` |
| 🟡 مهم | `START_CHECKOUT` مفقود | `app/checkout/page.tsx` | أضف `snaptr('track', 'START_CHECKOUT', ...)` في الـ `useEffect` |
| 🔵 بسيط | `ADD_CART` مكرر | `app/components/products/ProductCard.tsx` | احذف الاستدعاء المكرر |

---

## 6. ما هو شغّال صح ولا يحتاج تغيير

- تهيئة البيكسلين (`init`) ✅
- `PAGE_VIEW` على كل صفحة ✅
- `VIEW_CONTENT` على صفحة المنتج ✅
- منع التكرار في React Strict Mode ✅
- تحميل SDK بالترتيب الصحيح ✅
- Validation على purchase و product events ✅
- الاختبارات في `__tests__/snapPixel.test.tsx` تغطي الحالات الجوهرية ✅
