"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Mail, CheckCircle2, Pencil, ArrowLeft, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { identify, track } from "../lib/useTikTokEvents";

const COOLDOWN_SECONDS = 60;

// ─── Timestamp-based resilient countdown hook ─────────────────────────────────
function useCountdown(storageKey: string) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (!stored) {
          setSeconds(0);
          return;
        }
        const expiresAt = parseInt(stored, 10);
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setSeconds(remaining);
        if (remaining <= 0) {
          sessionStorage.removeItem(storageKey);
        }
      } catch {
        setSeconds(0);
      }
    };

    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [storageKey]);

  const start = useCallback((cooldownSeconds: number = COOLDOWN_SECONDS) => {
    const expiresAt = Date.now() + cooldownSeconds * 1000;
    try {
      sessionStorage.setItem(storageKey, String(expiresAt));
    } catch {}
    setSeconds(cooldownSeconds);
  }, [storageKey]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setSeconds(0);
  }, [storageKey]);

  return { seconds, start, clear };
}

function formatTimer(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── OTP input component ──────────────────────────────────────────────────────
function OtpInputs({
  otp,
  setOtp,
  error,
  setError,
  onComplete,
  disabled,
}: {
  otp: string[];
  setOtp: (v: string[]) => void;
  error: string;
  setError: (v: string) => void;
  onComplete?: () => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first empty input on mount
  useEffect(() => {
    const firstEmptyIndex = otp.findIndex((d) => !d);
    const targetIndex = firstEmptyIndex === -1 ? 5 : firstEmptyIndex;
    refs.current[targetIndex]?.focus();
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData.getData("text");
    const digits = text.replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) {
      next[i] = digits[i] || "";
    }
    setOtp(next);
    setError("");
    const targetFocus = Math.min(digits.length, 5);
    refs.current[targetFocus]?.focus();
    if (digits.length === 6) {
      setTimeout(() => onComplete?.(), 50);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6);
      if (digits.length > 0) {
        const next = [...otp];
        for (let i = 0; i < digits.length; i++) {
          if (index + i < 6) next[index + i] = digits[i];
        }
        setOtp(next);
        setError("");
        const nextFocus = Math.min(index + digits.length, 5);
        refs.current[nextFocus]?.focus();
        if (next.every((d) => d.length === 1)) {
          setTimeout(() => onComplete?.(), 50);
        }
        return;
      }
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");
    if (digit) {
      if (index < 5) refs.current[index + 1]?.focus();
      if (next.every((d) => d.length === 1)) {
        setTimeout(() => onComplete?.(), 50);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        e.preventDefault();
        const next = [...otp];
        next[index - 1] = "";
        setOtp(next);
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < 5) refs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && otp.every((d) => d.length === 1)) {
      onComplete?.();
    }
  };

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          value={digit}
          onPaste={handlePaste}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          style={{ borderRadius: 0 }}
          className={`w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 transition-all focus:outline-none ${
            error
              ? "border-red-400 bg-red-50 text-red-600 shadow-sm"
              : digit
              ? "border-[#284064] bg-[#284064]/5 text-[#284064]"
              : "border-[#8BA8D2] focus:border-[#284064] focus:ring-1 focus:ring-[#284064]"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        />
      ))}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />;
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  inputRef,
  onKeyDown,
  dir,
  autoComplete,
  inputMode,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  dir?: "ltr" | "rtl";
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        dir={dir}
        style={{ borderRadius: 0 }}
        className={`w-full px-4 py-3 border text-sm focus:outline-none transition-colors ${
          error
            ? "border-red-400 bg-red-50"
            : "border-[#8BA8D2] focus:border-[#284064]"
        }`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  onClick,
  disabled,
  loading,
  children,
  variant = "primary",
  type = "button",
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
}) {
  const base =
    "w-full py-3 font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const styles =
    variant === "primary"
      ? "text-white"
      : "border text-[#284064] bg-white";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ borderRadius: 0, ...(variant === "primary" ? { background: "var(--color-2)" } : { borderColor: "var(--color-4)" }) }}
      className={`${base} ${styles}`}
    >
      {loading ? <Spinner /> : children}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// REGISTER FORM
// ═════════════════════════════════════════════════════════════════════════════
// Saudi phone: 05xxxxxxxx or +9665xxxxxxxx or 009665xxxxxxxx
function isValidSaudiPhone(p: string) {
  return /^((\+966|00966|966)?(05)\d{8})$/.test(p.replace(/\s/g, ""));
}

function isValidEmailFormat(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

type RegisterState = {
  step: "form" | "otp";
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

const REGISTER_STORAGE_KEY = "auth_register_draft";

function RegisterForm({
  onSuccess,
  savedState,
  onStateChange,
  onSwitchToLogin,
}: {
  onSuccess: (user: object) => void;
  savedState: RegisterState;
  onStateChange: (s: Partial<RegisterState>) => void;
  onSwitchToLogin?: (email?: string) => void;
}) {
  const { step, firstName, lastName, phone, email, password } = savedState;
  const setStep = (v: "form" | "otp") => onStateChange({ step: v });

  const [showPass, setShowPass] = useState(false);
  const [hasSentOtpBefore, setHasSentOtpBefore] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  // live errors — keyed by field name
  const [errors, setErrors] = useState<Record<string, string>>({});
  // touched — track which fields the user has interacted with
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [loading, setLoading] = useState(false);

  // Resilient countdown hook
  const { seconds: cooldown, start: startCooldown, clear: clearCooldown } = useCountdown("auth_reg_otp_cooldown");

  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "form") setTimeout(() => firstNameRef.current?.focus(), 100);
  }, [step]);

  // ── Live field validators ─────────────────────────────────────────────────
  const validateField = useCallback((name: string, value: string) => {
    let msg = "";
    if (name === "firstName" && value.trim().length < 2) msg = "أدخل الاسم الأول (حرفان على الأقل)";
    if (name === "lastName" && value.trim().length < 2) msg = "أدخل اسم العائلة (حرفان على الأقل)";
    if (name === "phone" && !isValidSaudiPhone(value)) msg = "أدخل رقم سعودي صحيح (مثال: 0512345678)";
    if (name === "email" && !isValidEmailFormat(value)) msg = "أدخل بريدًا إلكترونيًا صحيحًا";
    if (name === "password" && value.length < 6) msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg === "";
  }, []);

  const touch = (name: string) => setTouched((prev) => ({ ...prev, [name]: true }));

  // ── Debounced email existence check ──────────────────────────────────────
  const lastCheckedEmailRef = useRef("");
  const checkEmailExists = useCallback((val: string) => {
    const trimmed = val.toLowerCase().trim();
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    if (!isValidEmailFormat(trimmed) || trimmed === lastCheckedEmailRef.current) return;
    setEmailChecking(true);
    emailDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        lastCheckedEmailRef.current = trimmed;
        if (data.exists) {
          setErrors((prev) => ({ ...prev, email: "هذا البريد الإلكتروني مسجل مسبقًا" }));
        } else {
          setErrors((prev) => {
            if (prev.email === "هذا البريد الإلكتروني مسجل مسبقًا") {
              const { email: _, ...rest } = prev;
              return rest;
            }
            return prev;
          });
        }
      } catch { /* fail open */ } finally {
        setEmailChecking(false);
      }
    }, 500);
  }, []);

  // ── Field change handlers ─────────────────────────────────────────────────
  const handleFieldChange = (name: string, value: string) => {
    onStateChange({ [name]: value } as Partial<RegisterState>);
    if (name === "email" && touched.email) checkEmailExists(value);
    if (touched[name]) validateField(name, value);
    else setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBlur = (name: string, value: string) => {
    touch(name);
    validateField(name, value);
    if (name === "email" && isValidEmailFormat(value)) checkEmailExists(value);
  };

  // ── Submit validation ─────────────────────────────────────────────────────
  const validateAll = () => {
    const fields = { firstName, lastName, phone, email, password };
    let valid = true;
    for (const [name, value] of Object.entries(fields)) {
      touch(name);
      if (!validateField(name, value)) valid = false;
    }
    // Also block if email is already taken
    if (errors.email === "هذا البريد الإلكتروني مسجل مسبقًا") valid = false;
    return valid;
  };

  const handleSendOtp = async () => {
    if (!validateAll()) return;
    setGlobalError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.replace(/\s/g, ""),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Handle email-already-exists from backend too
        if (res.status === 409) {
          setErrors((prev) => ({ ...prev, email: "هذا البريد الإلكتروني مسجل مسبقًا" }));
        } else {
          setGlobalError(data.error || "حدث خطأ، حاول مرة أخرى");
          if (data.cooldown) startCooldown(data.cooldown);
        }
        return;
      }
      setHasSentOtpBefore(true);
      setResendSuccess("");
      onStateChange({ step: "otp" });
      startCooldown(data.cooldown || COOLDOWN_SECONDS);
    } catch {
      setGlobalError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("أدخل رمز التحقق كاملًا"); return; }
    setOtpError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          otp: code,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.replace(/\s/g, ""),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "رمز التحقق غير صحيح");
        if (data.code === "EXPIRED" || data.code === "MAX_ATTEMPTS") {
          setOtp(["", "", "", "", "", ""]);
        }
        return;
      }
      clearCooldown();
      onSuccess(data.user);
    } catch {
      setOtpError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setResendSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.replace(/\s/g, ""),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "حدث خطأ");
        if (data.cooldown) startCooldown(data.cooldown);
        return;
      }
      setResendSuccess("تم إرسال رمز تحقق جديد إلى بريدك بنجاح");
      startCooldown(data.cooldown || COOLDOWN_SECONDS);
    } catch {
      setOtpError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[#284064]/10 text-[#284064] flex items-center justify-center mb-1">
            <Mail className="w-7 h-7" />
          </div>
          <p className="text-lg font-bold text-[#284064]">تحقق من بريدك الإلكتروني</p>
          <p className="text-xs text-gray-500">
            أدخل رمز التحقق المكوّن من 6 أرقام المرسل إلى:
          </p>
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 mt-1">
            <span className="text-sm font-semibold text-[#284064]" dir="ltr">{email}</span>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setResendSuccess("");
                setOtpError("");
              }}
              className="text-xs text-[#9a6d38] hover:text-[#284064] font-medium underline inline-flex items-center gap-1 transition-colors"
              title="تعديل البيانات"
            >
              <Pencil className="w-3 h-3" />
              <span>تعديل</span>
            </button>
          </div>
        </div>

        {resendSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 flex items-center gap-2 justify-center text-center">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{resendSuccess}</span>
          </div>
        )}

        <OtpInputs
          otp={otp}
          setOtp={setOtp}
          error={otpError}
          setError={setOtpError}
          onComplete={handleVerifyOtp}
          disabled={loading}
        />

        {otpError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 text-center">
            {otpError}
          </div>
        )}

        <Btn onClick={handleVerifyOtp} loading={loading} disabled={otp.join("").length < 6}>
          إنشاء الحساب والدخول
        </Btn>

        <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setStep("form");
              setResendSuccess("");
              setOtpError("");
            }}
            className="text-[#284064] hover:text-[#9a6d38] font-medium transition-colors inline-flex items-center gap-1"
          >
            <span>تعديل البيانات</span>
          </button>

          {cooldown > 0 ? (
            <span className="text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 font-mono text-xs">
              إعادة الإرسال بعد ({formatTimer(cooldown)})
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="text-[#284064] hover:text-[#9a6d38] font-semibold transition-colors underline disabled:opacity-50"
            >
              لم يصلك الرمز؟ إعادة الإرسال
            </button>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200/70 p-3 text-[11px] text-gray-500 leading-relaxed text-center">
          💡 لم يصلك الرمز؟ يرجى فحص مجلد الرسائل غير المرغوب فيها (Spam / Junk) أو التأكد من كتابة البريد بشكل صحيح.
        </div>
      </div>
    );
  }

  // ── Live field input helper ───────────────────────────────────────────────
  const liveInput = (
    name: string,
    value: string,
    extra?: {
      label: string; id: string; type?: string; placeholder?: string;
      dir?: "ltr" | "rtl"; autoComplete?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      inputRef?: React.RefObject<HTMLInputElement | null>;
      suffix?: React.ReactNode;
    }
  ) => {
    const err = touched[name] ? errors[name] : "";
    const checking = name === "email" && emailChecking;
    return (
      <div className="space-y-1.5">
        <label htmlFor={extra?.id} className="text-sm font-medium text-gray-700">
          {extra?.label}
        </label>
        <div className="relative">
          <input
            ref={extra?.inputRef}
            id={extra?.id}
            type={extra?.type || "text"}
            autoComplete={extra?.autoComplete}
            inputMode={extra?.inputMode}
            value={value}
            dir={extra?.dir}
            onChange={(e) => handleFieldChange(name, e.target.value)}
            onBlur={(e) => handleBlur(name, e.target.value)}
            placeholder={extra?.placeholder}
            style={{ borderRadius: 0 }}
            className={`w-full px-4 py-3 border text-sm focus:outline-none transition-colors ${extra?.suffix ? "pr-10" : ""} ${
              err ? "border-red-400 bg-red-50" : "border-[#8BA8D2] focus:border-[#284064]"
            }`}
          />
          {/* suffix slot (e.g. show/hide password button) */}
          {extra?.suffix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">{extra.suffix}</div>
          )}
          {/* email checking spinner only */}
          {!extra?.suffix && checking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin inline-block" />
            </div>
          )}
        </div>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    );
  };

  const eyeIcon = (visible: boolean) => visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className="space-y-4">
      {hasSentOtpBefore && (
        <div className="bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3 text-xs text-[#284064]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">جارٍ تعديل بيانات الحساب.</span>
          </div>
          <button
            type="button"
            onClick={() => { setStep("otp"); setOtpError(""); }}
            className="font-bold text-[#284064] hover:text-[#9a6d38] underline transition-colors inline-flex items-center gap-1"
          >
            <span>العودة لإدخال الرمز</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
          {globalError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {liveInput("firstName", firstName, {
          label: "الاسم الأول", id: "reg-firstName",
          placeholder: "محمد", autoComplete: "given-name", inputRef: firstNameRef,
        })}
        {liveInput("lastName", lastName, {
          label: "اسم العائلة", id: "reg-lastName",
          placeholder: "الأحمد", autoComplete: "family-name",
        })}
      </div>

      {liveInput("phone", phone, {
        label: "رقم الجوال ", id: "reg-phone",
        type: "tel", placeholder: "0512345678",
        dir: "ltr", autoComplete: "tel", inputMode: "tel",
      })}

      <div>
        {liveInput("email", email, {
          label: "البريد الإلكتروني", id: "reg-email",
          type: "email", placeholder: "xyz@example.com",
          dir: "ltr", autoComplete: "email", inputMode: "email",
        })}
        {errors.email === "هذا البريد الإلكتروني مسجل مسبقًا" && onSwitchToLogin && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 mt-2">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>هذا البريد الإلكتروني مسجل لدينا بالفعل. هل تود تسجيل الدخول؟</span>
            </div>
            <button
              type="button"
              onClick={() => onSwitchToLogin(email)}
              className="px-3 py-1.5 bg-[#284064] text-white font-medium hover:bg-[#1e3250] transition-colors text-xs inline-flex items-center gap-1.5"
            >
              <span>الانتقال لتسجيل الدخول بهذا البريد</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Password — special: has show/hide button as suffix */}
      {liveInput("password", password, {
        label: "كلمة المرور", id: "reg-password",
        type: showPass ? "text" : "password",
        placeholder: "6 أحرف على الأقل", autoComplete: "new-password",
        suffix: (
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {eyeIcon(showPass)}
          </button>
        ),
      })}

      <Btn onClick={handleSendOtp} loading={loading} disabled={emailChecking}>
        {hasSentOtpBefore ? "تحديث البيانات وإرسال رمز تحقق" : "إرسال رمز التحقق"}
      </Btn>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN FORM
// ═════════════════════════════════════════════════════════════════════════════
function LoginForm({
  onSuccess,
  initialEmail = "",
}: {
  onSuccess: (user: object) => void;
  initialEmail?: string;
}) {
  type LoginStep = "login" | "forgot-email" | "forgot-otp" | "forgot-success";
  const [step, setStep] = useState<LoginStep>("login");

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  const { seconds: cooldown, start: startCooldown, clear: clearCooldown } = useCountdown("auth_forgot_otp_cooldown");

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100);
  }, []);

  const handleLogin = async () => {
    const trimEmail = email.toLowerCase().trim();
    const trimPass = password.trim();
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError("أدخل بريدًا إلكترونيًا صحيحًا"); return;
    }
    if (!trimPass) { setError("أدخل كلمة المرور"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimEmail, password: trimPass }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "بيانات غير صحيحة"); return; }
      onSuccess(data.user);
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    const trimEmail = forgotEmail.toLowerCase().trim();
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setForgotEmailError("أدخل بريدًا إلكترونيًا صحيحًا"); return;
    }
    setForgotEmailError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotEmailError(data.error || "حدث خطأ");
        if (data.cooldown) startCooldown(data.cooldown);
        return;
      }
      setResendSuccess("");
      setStep("forgot-otp");
      startCooldown(data.cooldown || COOLDOWN_SECONDS);
    } catch {
      setForgotEmailError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setOtpError("أدخل رمز التحقق كاملًا"); return; }
    if (!newPassword || newPassword.length < 6) { setNewPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setOtpError(""); setNewPasswordError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.toLowerCase().trim(), otp: code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "رمز التحقق غير صحيح");
        if (data.code === "EXPIRED" || data.code === "MAX_ATTEMPTS") {
          setOtp(["", "", "", "", "", ""]);
        }
        return;
      }
      clearCooldown();
      setStep("forgot-success");
    } catch {
      setOtpError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgot = async () => {
    if (cooldown > 0 || loading) return;
    setOtp(["", "", "", "", "", ""]);
    setOtpError("");
    setResendSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "حدث خطأ");
        if (data.cooldown) startCooldown(data.cooldown);
        return;
      }
      setResendSuccess("تم إرسال رمز تحقق جديد إلى بريدك بنجاح");
      startCooldown(data.cooldown || COOLDOWN_SECONDS);
    } catch {
      setOtpError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const maskedForgotEmail = forgotEmail
    ? forgotEmail.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c)
    : "";

  // ── Forgot success ──
  if (step === "forgot-success") {
    return (
      <div className="space-y-5 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--color-2)" }}>تم تغيير كلمة المرور</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-3)" }}>يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
        </div>
        <Btn onClick={() => { setStep("login"); setForgotEmail(""); setOtp(["","","","","",""]); setNewPassword(""); }}>
          العودة لتسجيل الدخول
        </Btn>
      </div>
    );
  }

  // ── Forgot OTP + new password ──
  if (step === "forgot-otp") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[#284064]/10 text-[#284064] flex items-center justify-center mb-1">
            <Mail className="w-7 h-7" />
          </div>
          <p className="text-lg font-bold text-[#284064]">تحقق من بريدك الإلكتروني</p>
          <p className="text-xs text-gray-500">أرسلنا رمز تحقق لإعادة تعيين كلمة المرور إلى:</p>
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 border border-gray-200 mt-1">
            <span className="text-sm font-semibold text-[#284064]" dir="ltr">{maskedForgotEmail}</span>
            <button
              type="button"
              onClick={() => { setStep("forgot-email"); setResendSuccess(""); setOtpError(""); }}
              className="text-xs text-[#9a6d38] hover:text-[#284064] font-medium underline inline-flex items-center gap-1 transition-colors"
              title="تغيير البريد"
            >
              <Pencil className="w-3 h-3" />
              <span>تغيير</span>
            </button>
          </div>
        </div>

        {resendSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 flex items-center gap-2 justify-center text-center">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{resendSuccess}</span>
          </div>
        )}

        <OtpInputs otp={otp} setOtp={setOtp} error={otpError} setError={setOtpError} disabled={loading} />
        {otpError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 text-center">
            {otpError}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
            كلمة المرور الجديدة
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showNewPass ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setNewPasswordError(""); }}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleForgotVerify()}
              placeholder="6 أحرف على الأقل"
              style={{ borderRadius: 0 }}
              className={`w-full px-4 py-3 border text-sm focus:outline-none transition-colors pr-10 ${
                newPasswordError ? "border-red-400 bg-red-50" : "border-[#8BA8D2] focus:border-[#284064]"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPass((v) => !v)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showNewPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showNewPass ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {newPasswordError && <p className="text-xs text-red-500">{newPasswordError}</p>}
        </div>

        <Btn onClick={handleForgotVerify} loading={loading} disabled={otp.join("").length < 6 || !newPassword}>
          تغيير كلمة المرور
        </Btn>

        <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => { setStep("forgot-email"); setResendSuccess(""); setOtp(["","","","","",""]); setOtpError(""); setNewPassword(""); }}
            className="text-[#284064] hover:text-[#9a6d38] font-medium transition-colors"
          >
            تغيير البريد
          </button>

          {cooldown > 0 ? (
            <span className="text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 font-mono text-xs">
              إعادة الإرسال بعد ({formatTimer(cooldown)})
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendForgot}
              disabled={loading}
              className="text-[#284064] hover:text-[#9a6d38] font-semibold transition-colors underline disabled:opacity-50"
            >
              لم يصلك الرمز؟ إعادة الإرسال
            </button>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200/70 p-3 text-[11px] text-gray-500 leading-relaxed text-center">
          💡 لم يصلك الرمز؟ يرجى فحص مجلد الرسائل غير المرغوب فيها (Spam / Junk).
        </div>
      </div>
    );
  }

  // ── Forgot email entry ──
  if (step === "forgot-email") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-base font-semibold" style={{ color: "var(--color-2)" }}>نسيت كلمة المرور؟</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-3)" }}>أدخل بريدك الإلكتروني وسنرسل لك رمز تحقق لإعادة التعيين</p>
        </div>

        <Field
          label="البريد الإلكتروني"
          id="forgot-email"
          type="email"
          value={forgotEmail}
          onChange={(v) => { setForgotEmail(v); setForgotEmailError(""); }}
          error={forgotEmailError}
          placeholder="xyz@example.com"
          dir="ltr"
          autoComplete="email"
          inputMode="email"
          onKeyDown={(e) => e.key === "Enter" && !loading && handleForgotRequest()}
        />

        <Btn onClick={handleForgotRequest} loading={loading}>
          إرسال رمز التحقق
        </Btn>

        <button
          onClick={() => { setStep("login"); setForgotEmail(""); setForgotEmailError(""); }}
          className="w-full text-sm transition-colors text-center hover:opacity-70"
          style={{ color: "var(--color-3)" }}
        >
          العودة لتسجيل الدخول
        </button>
      </div>
    );
  }

  // ── Login ──
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
          {error}
        </div>
      )}

      <Field
        label="البريد الإلكتروني"
        id="login-email"
        type="email"
        value={email}
        onChange={(v) => { setEmail(v); setError(""); }}
        placeholder="xyz@example.com"
        dir="ltr"
        autoComplete="email"
        inputMode="email"
        inputRef={emailRef}
        onKeyDown={(e) => e.key === "Enter" && document.getElementById("login-password")?.focus()}
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-sm font-medium text-gray-700">
            كلمة المرور
          </label>
          <button
            type="button"
            onClick={() => { setStep("forgot-email"); setForgotEmail(email); }}
            className="text-xs text-[#284064] hover:text-[#9a6d38] transition-colors font-medium"
          >
            نسيت كلمة السر؟
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
            placeholder="••••••••"
            style={{ borderRadius: 0 }}
            className={`w-full px-4 py-3 border text-sm focus:outline-none transition-colors pr-10 ${
              error ? "border-red-400 bg-red-50" : "border-[#8BA8D2] focus:border-[#284064]"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={showPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPass ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <Btn onClick={handleLogin} loading={loading}>
        تسجيل الدخول
      </Btn>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
type Tab = "login" | "register";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, setUser } = useAuthStore();

  const [tab, setTab] = useState<Tab>("login");
  const [loginPrefilledEmail, setLoginPrefilledEmail] = useState("");

  const defaultRegisterState: RegisterState = {
    step: "form", firstName: "", lastName: "", phone: "", email: "", password: "",
  };

  const [registerState, setRegisterState] = useState<RegisterState>(() => {
    if (typeof window === "undefined") return defaultRegisterState;
    try {
      const saved = sessionStorage.getItem(REGISTER_STORAGE_KEY);
      if (!saved) return defaultRegisterState;
      const parsed = JSON.parse(saved);
      // Never restore otp step — user must re-request OTP after refresh/tab switch
      return { ...defaultRegisterState, ...parsed, step: "form" };
    } catch { return defaultRegisterState; }
  });

  const handleRegisterStateChange = (partial: Partial<RegisterState>) => {
    setRegisterState((prev) => {
      const next = { ...prev, ...partial };
      try {
        const { password: _, ...safeDraft } = next;
        sessionStorage.setItem(REGISTER_STORAGE_KEY, JSON.stringify(safeDraft));
      } catch { /* ignore */ }
      return next;
    });
  };

  const handleSwitchToLogin = (emailToUse?: string) => {
    if (emailToUse) {
      setLoginPrefilledEmail(emailToUse);
    }
    setTab("login");
  };

  // Redirect if already logged in
  useEffect(() => {
    if (initialized && user) {
      const redirect = searchParams.get("redirect");
      const safe =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/account";
      router.replace(safe);
    }
  }, [initialized, user, router, searchParams]);

  const handleSuccess = (user: object) => {
    setUser(user as Parameters<typeof setUser>[0]);
    if (tab === "register") {
      identify();
      track("CompleteRegistration", { contents: [], value: 0, currency: "SAR" });
    }
    try { sessionStorage.removeItem(REGISTER_STORAGE_KEY); } catch { /* ignore */ }
    const redirect = searchParams.get("redirect");
    const safe =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/account";
    router.replace(safe);
  };

  if (!initialized) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-[#0A1C29]/20 border-t-[#0A1C29] rounded-full animate-spin inline-block" />
    </div>
  );
  if (user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-[460px]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <Image
            src="/logo.webp"
            alt="لمسة"
            width={260}
            height={104}
            className="object-contain h-24 w-auto"
            priority
          />
          <h1 className="text-xl font-bold" style={{ color: "var(--color-2)" }}>أهلًا بك في متجر الشريحة الموثوقة</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6" style={{ borderColor: "var(--color-4)" }}>
          {(["login", "register"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === "login") handleRegisterStateChange({ step: "form" });
                setTab(t);
              }}
              className="flex-1 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px"
              style={tab === t
                ? { borderColor: "var(--color-2)", color: "var(--color-2)" }
                : { borderColor: "transparent", color: "var(--color-3)" }
              }
            >
              {t === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <LoginForm
            key="login"
            onSuccess={handleSuccess}
            initialEmail={loginPrefilledEmail}
          />
        ) : (
          <RegisterForm
            key="register"
            onSuccess={handleSuccess}
            savedState={registerState}
            onStateChange={handleRegisterStateChange}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthPageInner />
    </Suspense>
  );
}
