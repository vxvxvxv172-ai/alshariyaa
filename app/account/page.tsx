"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthStore } from "../store/authStore";
import { OrderTracker } from "../components/OrderTracker";
import { Search, RefreshCw, ShoppingBag, UserCheck, ShieldCheck } from "lucide-react";

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

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  pending:          { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500 animate-pulse" },
  confirmed:        { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500 animate-pulse" },
  processing:       { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  ready_to_ship:    { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  shipped:          { badge: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  out_for_delivery: { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-500" },
  delivered:        { badge: "bg-emerald-50 text-emerald-800 border-emerald-300", dot: "bg-emerald-600" },
  cancelled:        { badge: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-500" },
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

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ sm }: { sm?: boolean }) {
  return (
    <span className={`border-2 border-[#0A1C29]/15 border-t-[#0A1C29] rounded-full animate-spin inline-block ${sm ? "w-4 h-4" : "w-6 h-6"}`} />
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const st = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending;
  const firstItem = order.items?.[0];
  const imgUrl = resolveImg(firstItem?.image);

  return (
    <div className="bg-white border border-[#e8ecef] rounded-2xl overflow-hidden hover:border-[#0A1C29]/30 transition-all shadow-xs">
      <Link
        href={`/account/orders/${order.orderId || order._id}`}
        className="block focus-visible:outline-none"
        aria-label={`طلب رقم ${order.orderId}`}
      >
        <div className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-gray-400 font-medium">رقم الطلب</span>
            <span className="text-sm font-black text-[#0A1C29] font-mono tracking-wide" dir="ltr">
              #{order.orderId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${st.badge}`}>
              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-4 py-3 bg-[#fafbfc] border-b border-gray-100">
          <OrderTracker status={order.status} compact={true} />
        </div>

        {/* Products and Total */}
        <div className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-xl bg-[#f4f5f7] border border-[#ebebeb] flex items-center justify-center shrink-0 overflow-hidden">
              {imgUrl ? (
                <Image src={imgUrl} alt={firstItem?.name ?? "منتج"} width={48} height={48}
                  className="object-contain w-full h-full p-1 rounded-lg" loading="lazy" unoptimized />
              ) : (
                <ShoppingBag className="w-5 h-5 text-gray-400" />
              )}
              {order.status === "cancelled" && (
                <div className="absolute inset-x-0 bottom-0 bg-red-600 text-white text-[8px] font-black text-center py-0.5">
                  ملغي
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className={`text-xs sm:text-sm font-bold ${order.status === "cancelled" ? "line-through text-gray-400" : "text-[#0A1C29]"} truncate`}>
                  {firstItem?.name || "طلب شريحة / باقة"}
                </p>
                {order.status === "cancelled" && (
                  <span className="inline-flex items-center text-[10px] font-black bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded shrink-0">
                    تم إلغاء المنتج
                  </span>
                )}
              </div>
              {order.items && order.items.length > 1 && (
                <p className="text-[11px] text-gray-400">
                  + {order.items.length - 1} منتجات أخرى
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(order.createdAt)}</p>
            </div>
          </div>

          <div className="text-left shrink-0">
            <span className={`text-base font-black ${order.status === "cancelled" ? "text-gray-400 line-through" : "text-[#0A1C29]"} tabular-nums`} dir="ltr">
              {fmtMoney(order.total)} <span className="text-xs font-semibold text-gray-400">ر.س</span>
            </span>
            <div className="text-[11px] font-bold text-[#0A1C29] underline underline-offset-2 mt-1">
              عرض التفاصيل الكاملة ⟵
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, ltr }: { label: string; value?: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-semibold text-[#0A1C29]" dir={ltr ? "ltr" : undefined}>{value || "—"}</span>
    </div>
  );
}

// ─── Main Inner ───────────────────────────────────────────────────────────────

function AccountPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, setUser, logout, initialized } = useAuthStore();

  const urlTab = searchParams.get("tab") === "orders" ? "orders" : "profile";
  const [tab, setTab] = useState<"profile" | "orders">(urlTab);

  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersFetched, setOrdersFetched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const isFetchingRef = useRef(false);

  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "orders") setTab("orders");
    else if (t === "profile") setTab("profile");
  }, [searchParams]);

  // Only redirect to login if on "profile" tab and not logged in!
  // If tab is "orders", guests can stay and track their orders!
  useEffect(() => {
    if (initialized && !loading && !user && tab === "profile") {
      router.replace("/auth?redirect=/account");
    }
  }, [initialized, loading, user, tab, router]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
      // Claim guest orders silently in background
      fetch("/api/account/orders/claim", { method: "POST" }).catch(() => {});
    }
  }, [user]);

  // ─── Fetch Orders (Guest + Logged In) ────────────────────────────────────────
  const fetchOrders = useCallback(async (pageNum = 1, silent = false, query = "") => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) setOrdersLoading(true);
    setOrdersError("");

    try {
      // Gather local pending orders IDs
      let localOrderIds: string[] = [];
      let localOrders: Order[] = [];
      try {
        const local = JSON.parse(localStorage.getItem("pending_orders") || "[]");
        if (Array.isArray(local)) {
          localOrders = local;
          localOrderIds = local.map((o: { orderId: string }) => o.orderId).filter(Boolean);
        }
      } catch {}

      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "15",
        ...(localOrderIds.length > 0 ? { orderIds: localOrderIds.join(",") } : {}),
      });

      if (query.trim()) {
        if (/^\d{8,15}$/.test(query.trim())) {
          params.set("phone", query.trim());
        } else {
          params.set("orderIds", query.trim());
        }
      }

      const res = await fetch(`/api/account/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        // Fallback to local storage if guest and server had an issue
        if (!user && localOrders.length > 0) {
          setOrders(localOrders);
          setOrdersFetched(true);
          return;
        }
        if (!silent) setOrdersError(data.error || "حدث خطأ في جلب الطلبات");
        return;
      }

      const serverOrders: Order[] = Array.isArray(data.orders) ? data.orders : [];

      // If user is guest, merge server orders with local orders
      // (Server orders have priority because status might have updated to 'confirmed' by admin)
      if (!user) {
        const mergedMap = new Map<string, Order>();
        // Add local orders first
        localOrders.forEach(o => {
          if (o.orderId) mergedMap.set(o.orderId, o);
        });
        // Override with server orders (which contain the real DB status)
        serverOrders.forEach(o => {
          if (o.orderId) mergedMap.set(o.orderId, o);
        });

        // Also update local storage if status changed to keep in sync!
        try {
          const updatedList = Array.from(mergedMap.values());
          localStorage.setItem("pending_orders", JSON.stringify(updatedList.slice(0, 20)));
        } catch {}

        let finalList = Array.from(mergedMap.values());
        if (query.trim()) {
          const q = query.trim().toLowerCase();
          finalList = finalList.filter(o =>
            (o.orderId && o.orderId.toLowerCase().includes(q)) ||
            (o.whatsapp && o.whatsapp.includes(q)) ||
            (o.customer && o.customer.toLowerCase().includes(q))
          );
        }
        setOrders(finalList);
      } else {
        setOrders(serverOrders);
      }

      setTotalPages(data.pages || 1);
      setPage(pageNum);
      setOrdersFetched(true);
      setLastRefreshedAt(new Date());
    } catch {
      if (!silent) setOrdersError("حدث خطأ في تحميل الطلبات");
    } finally {
      if (!silent) setOrdersLoading(false);
      isFetchingRef.current = false;
    }
  }, [user]);

  // Fetch initial on tab change
  useEffect(() => {
    if (tab === "orders" && !ordersFetched && !ordersLoading) {
      fetchOrders(1);
    }
  }, [tab, ordersFetched, ordersLoading, fetchOrders]);

  // Background auto-refresh polling every 12 seconds when viewing orders!
  // This allows customers to see when Admin clicks "تأكيد" in real-time!
  useEffect(() => {
    if (tab !== "orders") return;
    const interval = setInterval(() => {
      fetchOrders(page, true, searchQuery);
    }, 12000);
    return () => clearInterval(interval);
  }, [tab, page, searchQuery, fetchOrders]);

  const handleTabChange = (t: "profile" | "orders") => {
    if (t === "profile" && !user) {
      router.push("/auth?redirect=/account");
      return;
    }
    setTab(t);
    router.replace(`/account?tab=${t}`, { scroll: false });
  };

  const handleSave = async () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanPhone = phone.replace(/\s/g, "");

    if (!cleanFirst || cleanFirst.length < 2) {
      setSaveError("الاسم الأول يجب أن يكون حرفين على الأقل");
      return;
    }
    if (!cleanLast || cleanLast.length < 2) {
      setSaveError("اسم العائلة يجب أن يكون حرفين على الأقل");
      return;
    }
    if (!cleanPhone) {
      setSaveError("أدخل رقم الجوال");
      return;
    }
    if (changePasswordOpen && newPassword) {
      if (newPassword.length < 6) {
        setSaveError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      if (!currentPassword) {
        setSaveError("أدخل كلمة المرور الحالية لتأكيد التغيير");
        return;
      }
    }

    setSaveError("");
    setSaveSuccess(false);
    setSaving(true);

    try {
      const payload: Record<string, string> = {
        firstName: cleanFirst,
        lastName: cleanLast,
        phone: cleanPhone,
      };

      if (changePasswordOpen && newPassword) {
        payload.newPassword = newPassword;
        payload.currentPassword = currentPassword;
      }

      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "حدث خطأ، حاول مرة أخرى");
        return;
      }

      if (data.user) {
        setUser(data.user);
      }
      setEditing(false);
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setSaveError("");
    setChangePasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      window.location.href = "/";
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "تعذر تسجيل الخروج");
      setLoggingOut(false);
    }
  };

  if (!initialized || loading)
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "ز";
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "زائر المتجر";

  return (
    <div className="min-h-screen flex flex-col items-center px-3 sm:px-4 py-8 sm:py-12 bg-[#f8fafc]" dir="rtl">
      <div className="w-full max-w-[620px] space-y-4">

        {/* ── Hero Profile / Guest Card ── */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#0A1C29] text-white flex items-center justify-center text-base font-black shrink-0 select-none shadow-sm">
              {user ? initials : "🛒"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-[#0A1C29] truncate">{displayName}</p>
                {!user ? (
                  <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    تتبع زائر (بدون تسجيل)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    حساب موثق
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5" dir={user ? "ltr" : undefined}>
                {user ? user.email : "يتم حفظ طلباتك تلقائياً برقم جهازك والـ IP"}
              </p>
            </div>
          </div>

          {!user && (
            <Link
              href="/auth?redirect=/account?tab=orders"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/70 border border-blue-100 px-3 py-2 rounded-xl transition shrink-0 whitespace-nowrap"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>

        {/* ── Tabs container ── */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-xs">

          {/* Tab headers */}
          <div className="flex border-b border-gray-100">
            {(["orders", "profile"] as const).map((t) => {
              if (t === "profile" && !user) return null; // Only show profile tab if logged in
              return (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`flex-1 py-3.5 text-xs sm:text-sm font-black transition-all border-b-2 -mb-px flex items-center justify-center gap-2 ${
                    tab === t
                      ? "border-[#0A1C29] text-[#0A1C29] bg-gray-50/40"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t === "orders" ? (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>طلباتي والتتبع</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>بياناتي الشخصية</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5">

            {/* ── Profile (Logged In Only) ── */}
            {tab === "profile" && user && (
              <div className="space-y-5">
                {saveSuccess && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
                    <span className="text-green-500 text-base">✓</span> تم حفظ البيانات بنجاح
                  </div>
                )}
                {saveError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {saveError}
                  </div>
                )}

                {!editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50/70 border border-gray-100 rounded-xl">
                      <InfoRow label="الاسم الأول" value={user.firstName} />
                      <InfoRow label="اسم العائلة" value={user.lastName} />
                    </div>
                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl space-y-4">
                      <InfoRow label="البريد الإلكتروني" value={user.email} ltr />
                      <InfoRow label="رقم الجوال" value={user.phone || "—"} ltr />
                    </div>
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full py-3 bg-[#0A1C29] text-white text-sm font-bold transition rounded-xl hover:opacity-90"
                    >
                      تعديل البيانات
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="acc-fn" className="text-xs font-medium text-gray-500">الاسم الأول</label>
                        <input
                          id="acc-fn"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 text-sm rounded-xl focus:outline-none focus:border-[#0A1C29] bg-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="acc-ln" className="text-xs font-medium text-gray-500">اسم العائلة</label>
                        <input
                          id="acc-ln"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 text-sm rounded-xl focus:outline-none focus:border-[#0A1C29] bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500">البريد الإلكتروني</label>
                      <div className="w-full px-3 py-2.5 border border-gray-200 text-sm bg-gray-50 rounded-xl text-gray-400" dir="ltr">
                        {user.email}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="acc-phone" className="text-xs font-medium text-gray-500">رقم الجوال</label>
                      <input
                        id="acc-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        dir="ltr"
                        inputMode="tel"
                        className="w-full px-3 py-2.5 border border-gray-200 text-sm rounded-xl focus:outline-none focus:border-[#0A1C29] bg-white"
                      />
                    </div>

                    {/* Change password toggle */}
                    <div className="pt-2 border-t border-gray-100">
                  {logoutError && <p role="alert" className="mb-3 text-sm text-red-600">{logoutError}</p>}
                      <button
                        type="button"
                        onClick={() => setChangePasswordOpen(!changePasswordOpen)}
                        className="text-xs font-semibold text-[#0A1C29] hover:underline"
                      >
                        {changePasswordOpen ? "إلغاء تغيير كلمة المرور" : "تغيير كلمة المرور؟"}
                      </button>

                      {changePasswordOpen && (
                        <div className="mt-3 space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-600">كلمة المرور الحالية</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full px-3 py-2 border border-gray-200 text-sm rounded-xl focus:outline-none bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-600">كلمة المرور الجديدة</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="6 أحرف على الأقل"
                              className="w-full px-3 py-2 border border-gray-200 text-sm rounded-xl focus:outline-none bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-[#0A1C29] text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2 rounded-xl"
                      >
                        {saving ? <Spinner sm /> : "حفظ التعديلات"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-3 border border-gray-200 text-sm rounded-xl text-gray-600 hover:bg-gray-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                  {logoutError && <p role="alert" className="mb-3 text-sm text-red-600">{logoutError}</p>}
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    aria-busy={loggingOut}
                    className="w-full py-3 text-sm font-semibold text-red-500 border border-red-100 hover:bg-red-50 transition rounded-xl"
                  >
                    {loggingOut ? "جاري تسجيل الخروج…" : "تسجيل الخروج"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Orders (Both Guests & Logged In) ── */}
            {tab === "orders" && (
              <div className="space-y-4">
                {/* Search & Actions Bar */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ابحث برقم الطلب أو الجوال..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") fetchOrders(1, false, searchQuery);
                      }}
                      className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#0A1C29] bg-white transition"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(""); fetchOrders(1, false, ""); }}
                        className="px-3 py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50"
                      >
                        إلغاء
                      </button>
                    )}
                    <button
                      onClick={() => fetchOrders(page, false, searchQuery)}
                      disabled={ordersLoading}
                      className="px-3 py-2 text-xs font-bold text-[#0A1C29] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                      <span>تحديث الحالات</span>
                    </button>
                  </div>
                </div>

                {/* Live Tracking Indicator */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>التحديث المباشر لحالة الطلبات نشط تلقائياً</span>
                  </span>
                  <span>آخر فحص: {lastRefreshedAt.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>

                {ordersLoading && (
                  <div className="flex flex-col items-center justify-center py-14 gap-2">
                    <Spinner />
                    <p className="text-xs text-gray-400 font-medium">جاري تحديث وتتبع الطلبات...</p>
                  </div>
                )}

                {ordersError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm p-3.5 rounded-xl">
                    {ordersError}
                  </div>
                )}

                {!ordersLoading && !ordersError && ordersFetched && orders.length === 0 && (
                  <div className="text-center py-16 space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
                    <div className="w-16 h-16 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center mx-auto text-2xl">
                      🛍️
                    </div>
                    <p className="text-sm font-black text-[#0A1C29]">لا توجد طلبات مسجلة حاليًا</p>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                      إذا قمت بإجراء طلب للتو، تأكد من إدخال رقم الطلب في شريط البحث أعلاه أو قم بتحديث الصفحة.
                    </p>
                    <Link
                      href="/"
                      className="inline-block mt-2 px-5 py-2.5 bg-[#0A1C29] text-white text-xs font-bold rounded-xl hover:opacity-90 transition"
                    >
                      تصفح المنتجات الآن
                    </Link>
                  </div>
                )}

                {orders.length > 0 && (
                  <div className="space-y-3.5">
                    {orders.map((order) => (
                      <OrderCard key={order._id || order.orderId} order={order} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => fetchOrders(page - 1, false, searchQuery)}
                      disabled={page <= 1 || ordersLoading}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      السابق
                    </button>
                    <span className="text-xs font-medium text-gray-500">صفحة {page} من {totalPages}</span>
                    <button
                      onClick={() => fetchOrders(page + 1, false, searchQuery)}
                      disabled={page >= totalPages || ordersLoading}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      التالي
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-[#0A1C29]/15 border-t-[#0A1C29] rounded-full animate-spin inline-block" />
        </div>
      }
    >
      <AccountPageInner />
    </Suspense>
  );
}
