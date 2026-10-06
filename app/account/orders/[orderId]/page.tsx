"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Package, Truck, MapPin, UserRound, ReceiptText, ShoppingBag, CircleAlert, type LucideIcon } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function resolveImg(src?: string | null) {
  if (!src) return null;
  return src.startsWith("http") ? src : `${API}${src}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending" | "confirmed" | "processing" | "ready_to_ship"
  | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

type OrderItem = {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
};

type Order = {
  _id: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  statusHistory?: { status: string; changedAt: string; changedBy: string }[];
  createdAt: string;
  updatedAt?: string;
  installmentType?: "full" | "installment";
  months?: number;
  monthlyPayment?: number;
  downPayment?: number;
  customer?: string;
  whatsapp?: string;
  nationalId?: string;
  address?: string;
  shipping?: {
    companyName?: string;
    price?: number;
    isFree?: boolean;
    deliveryMinDays?: number;
    deliveryMaxDays?: number;
  };
  deliveryAddress?: { formattedAddress?: string };
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  pending:          "قيد المراجعة",
  confirmed:        "تم تأكيد الطلب",
  processing:       "جاري التجهيز",
  ready_to_ship:    "جاهز للشحن",
  shipped:          "تم الشحن",
  out_for_delivery: "خرج للتسليم",
  delivered:        "تم التسليم",
  cancelled:        "ملغي",
};

const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  pending: "طلبك وصلنا، وجاري مراجعة التفاصيل قبل التأكيد.",
  confirmed: "تم تأكيد طلبك، والخطوة التالية هي التجهيز للشحن.",
  processing: "نعمل على تجهيز منتجاتك للشحن.",
  ready_to_ship: "طلبك جاهز، وبانتظار تسليمه لشركة الشحن.",
  shipped: "تم تسليم طلبك لشركة الشحن وهو في الطريق إليك.",
  out_for_delivery: "طلبك مع مندوب التوصيل في طريقه إليك.",
  delivered: "تم تسليم طلبك. شكرًا لثقتك بنا.",
  cancelled: "تم إلغاء هذا الطلب. يمكنك التواصل معنا لأي استفسار.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(n: number) {
  return Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value, ltr, bold }: { label: string; value: string; ltr?: boolean; bold?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 py-3 ${bold ? "mt-2 border-t border-[#284064]/10 pt-5" : ""}`}>
      <span className="text-sm text-[#60758E] shrink-0">{label}</span>
      <span className={`min-w-0 break-words text-left text-[#284064] ${bold ? "text-lg font-bold" : "text-sm font-semibold"}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#284064]/10 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="h-[18px] w-[18px] text-[#60758E]" aria-hidden="true" />
        <h2 className="text-base font-bold text-[#284064]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F8FC]">
      <span className="w-8 h-8 border-2 border-[#0A1C29]/15 border-t-[#0A1C29] rounded-full animate-spin inline-block" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!orderId) return;
      try {
        const res = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`);
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok && (data.order || data)) {
          setOrder(data.order || data);
          return;
        }

        // Local storage fallback for guest visitors
        try {
          const local = JSON.parse(localStorage.getItem("pending_orders") || "[]");
          const found = local.find((o: { orderId: string; _id?: string }) => o.orderId === orderId || o._id === orderId);
          if (found && isMounted) {
            setOrder(found);
            return;
          }
        } catch {}

        if (isMounted) setError(data.error || "حدث خطأ في تحميل الطلب");
      } catch {
        // Fallback to local storage
        try {
          const local = JSON.parse(localStorage.getItem("pending_orders") || "[]");
          const found = local.find((o: { orderId: string; _id?: string }) => o.orderId === orderId || o._id === orderId);
          if (found && isMounted) {
            setOrder(found);
            return;
          }
        } catch {}
        if (isMounted) setError("حدث خطأ في تحميل الطلب");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    // Auto-refresh polling every 10 seconds to catch Admin confirmation in real-time
    const interval = setInterval(async () => {
      if (!orderId) return;
      try {
        const res = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order && isMounted) {
            setOrder(data.order);
            // Sync with local pending_orders
            try {
              const local = JSON.parse(localStorage.getItem("pending_orders") || "[]");
              const idx = local.findIndex((o: { orderId: string }) => o.orderId === data.order.orderId);
              if (idx !== -1) {
                local[idx] = { ...local[idx], status: data.order.status };
                localStorage.setItem("pending_orders", JSON.stringify(local));
              }
            } catch {}
          }
        }
      } catch {}
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId]);

  if (loading) return <Spinner />;

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col items-center justify-center gap-4 px-4" dir="rtl">
        <CircleAlert className="h-10 w-10 text-[#60758E]" aria-hidden="true" />
        <p className="text-base font-bold text-[#284064]">{error || "الطلب غير موجود"}</p>
        <Link href="/account?tab=orders" className="text-sm font-semibold underline underline-offset-2 text-[#284064]">
          العودة لطلباتي
        </Link>
      </div>
    );
  }

  const shippingPrice = order.shipping?.price ?? 0;
  const isFree = order.shipping?.isFree || shippingPrice === 0;
  const isInstallment = order.installmentType === "installment";
  const items = order.items || [];
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const address = order.deliveryAddress?.formattedAddress || order.address;
  const currentStep = order.status === "delivered" ? 3
    : ["processing", "ready_to_ship", "shipped", "out_for_delivery"].includes(order.status) ? 2
    : order.status === "confirmed" ? 1 : 0;
  const steps = [
    { title: "مراجعة الطلب", icon: Clock3 },
    { title: "تأكيد الطلب", icon: Check },
    { title: "التجهيز والشحن", icon: Truck },
    { title: "التسليم", icon: Package },
  ];
  const statusStyle = order.status === "cancelled" ? "bg-red-50 text-red-700"
    : order.status === "pending" ? "bg-amber-50 text-amber-700"
    : order.status === "confirmed" || order.status === "delivered" ? "bg-emerald-50 text-emerald-700"
    : "bg-[#EEF3FA] text-[#284064]";

  return (
    <main className="min-h-[70vh] bg-[#F6F8FC] text-[#284064]" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
        <Link href="/account?tab=orders" className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-[#60758E] transition-colors hover:text-[#284064] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8BA8D2]">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          العودة لطلباتي
        </Link>

        <header className="mb-7 flex flex-wrap items-start justify-between gap-4 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">تفاصيل الطلب</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#60758E] sm:text-sm">
              <span>طلب رقم <bdi className="font-semibold text-[#284064]">#{order.orderId}</bdi></span>
              <span className="h-3 w-px bg-[#284064]/15" aria-hidden="true" />
              <time dateTime={order.createdAt}>{fmtDate(order.createdAt)}</time>
            </div>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${statusStyle}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </header>

        <section aria-labelledby="tracking-title" className={`mb-6 rounded-2xl border p-5 sm:p-7 ${order.status === "cancelled" ? "border-red-200 bg-gradient-to-b from-red-50/70 to-white" : "border-[#284064]/10 bg-white"}`}>
          <div className="flex items-start gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${order.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-[#F6F8FC] text-[#60758E]"}`}>
              {order.status === "cancelled" ? <CircleAlert className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="tracking-title" className={`text-base font-bold ${order.status === "cancelled" ? "text-red-900" : ""}`}>
                  {order.status === "cancelled" ? "تم إلغاء هذا الطلب" : "تتبع طلبك"}
                </h2>
                {order.status === "cancelled" && (
                  <span className="bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-2 py-0.5 rounded-full">
                    ملغي من قبل الإدارة
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm leading-7 ${order.status === "cancelled" ? "text-red-700" : "text-[#60758E]"}`} role="status">
                {STATUS_DESCRIPTION[order.status]}
              </p>
            </div>
          </div>
          {order.status !== "cancelled" && (
            <ol aria-label="مراحل الطلب" className="mt-7 grid grid-cols-4 border-t border-[#284064]/[0.07] pt-6 sm:mt-6">
              {steps.map(({ title, icon: Icon }, index) => {
                const complete = index < currentStep || order.status === "delivered";
                const active = index === currentStep;
                return (
                  <li key={title} aria-current={active ? "step" : undefined} className="relative flex flex-col items-center text-center">
                    {index < steps.length - 1 && <span aria-hidden="true" className={`absolute right-1/2 top-[18px] h-px w-full ${index < currentStep ? "bg-[#8BA8D2]" : "bg-[#E4EAF2]"}`} />}
                    <span className={`relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border-4 border-white ${complete || active ? "bg-[#284064] text-white" : "bg-[#EEF2F7] text-[#71839B]"}`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </span>
                    <span className={`mt-2 px-1 text-[10px] leading-5 sm:text-sm ${active || complete ? "font-bold text-[#284064]" : "text-[#60758E]"}`}>{title}</span>
                    <span className="mt-1 text-[10px] text-[#60758E] sm:text-xs">{complete ? "مكتمل" : active ? "المرحلة الحالية" : "قادمًا"}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <Section title="المنتجات" icon={ShoppingBag}>
              {order.status === "cancelled" && (
                <div className="mb-4 bg-red-50 border border-red-200/80 rounded-xl p-3 flex items-center gap-2 text-red-700 text-xs font-bold">
                  <CircleAlert className="w-4 h-4 shrink-0 text-red-600" />
                  <span>تم إلغاء منتجات هذا الطلب من قبل الإدارة</span>
                </div>
              )}
              <div className="divide-y divide-[#284064]/[0.07]">
                {items.map((item, i) => {
                  const imgUrl = resolveImg(item.image);
                  return (
                    <div key={i} className="flex items-start gap-4 py-4 first:pt-1 last:pb-0">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#284064]/[0.06] bg-[#F6F8FC] sm:h-20 sm:w-20">
                        {imgUrl ? <Image src={imgUrl} alt={item.name} width={80} height={80} className="h-full w-full object-contain p-2" loading="lazy" unoptimized /> : <Package className="h-7 w-7 text-[#8BA8D2]" aria-hidden="true" />}
                        {order.status === "cancelled" && (
                          <div className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[9px] font-bold text-center py-0.5">
                            ملغي
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold leading-7 ${order.status === "cancelled" ? "line-through text-gray-400" : ""}`}>{item.name}</p>
                          {order.status === "cancelled" && (
                            <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              تم الإلغاء
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-[#60758E]">الكمية: {item.quantity} <span className="mx-1.5 text-[#8BA8D2]">·</span> {fmtMoney(item.price)} ر.س للقطعة</p>
                          <p className={`text-sm font-bold tabular-nums ${order.status === "cancelled" ? "line-through text-gray-400" : ""}`}>{fmtMoney(item.price * item.quantity)} <span className="text-xs font-normal text-[#60758E]">ر.س</span></p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {(address || order.shipping?.companyName) && (
              <Section title="تفاصيل التوصيل" icon={MapPin}>
                {address && <div className="mb-3"><p className="mb-2 text-xs text-[#60758E]">عنوان التوصيل</p><p className="text-sm leading-8">{address}</p></div>}
                {order.shipping?.companyName && (
                  <div className={address ? "border-t border-[#284064]/[0.07] pt-2" : ""}>
                    <Row label="شركة الشحن" value={order.shipping.companyName} />
                    <Row label="تكلفة الشحن" value={isFree ? "مجاني" : `${fmtMoney(shippingPrice)} ر.س`} />
                    {order.shipping.deliveryMinDays != null && order.shipping.deliveryMaxDays != null && <Row label="التوصيل المتوقع" value={`من ${order.shipping.deliveryMinDays} إلى ${order.shipping.deliveryMaxDays} أيام عمل`} />}
                  </div>
                )}
              </Section>
            )}

            {(order.customer || order.whatsapp || order.nationalId) && (
              <Section title="بيانات العميل" icon={UserRound}>
                <div className="divide-y divide-[#284064]/[0.07]">
                  {order.customer && <Row label="الاسم" value={order.customer} />}
                  {order.whatsapp && <Row label="واتساب" value={order.whatsapp} ltr />}
                  {order.nationalId && <Row label="رقم الهوية" value={order.nationalId} ltr />}
                </div>
              </Section>
            )}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <Section title="ملخص الدفع" icon={ReceiptText}>
              <div className="mb-4 flex items-center justify-between rounded-xl bg-[#F6F8FC] px-4 py-3 text-sm">
                <span className="text-[#60758E]">طريقة الدفع</span>
                <span className="font-semibold">{isInstallment ? "تقسيط" : "دفع كامل"}</span>
              </div>
              {isInstallment && <div className="mb-3 border-b border-[#284064]/[0.07] pb-3">
                {!!order.months && <Row label="مدة التقسيط" value={`${order.months} أشهر`} />}
                {order.monthlyPayment != null && <Row label="القسط الشهري" value={`${fmtMoney(order.monthlyPayment)} ر.س`} />}
                {order.downPayment != null && order.downPayment > 0 && <Row label="الدفعة الأولى" value={`${fmtMoney(order.downPayment)} ر.س`} />}
              </div>}
              <Row label="مجموع المنتجات" value={`${fmtMoney(subtotal)} ر.س`} />
              <Row label="الشحن" value={isFree ? "مجاني" : `${fmtMoney(shippingPrice)} ر.س`} />
              <Row label="الإجمالي النهائي" value={`${fmtMoney(order.total)} ر.س`} bold />
            </Section>
          </aside>
        </div>
      </div>
    </main>
  );
}
