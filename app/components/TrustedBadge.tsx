"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import styles from "./TrustedBadge.module.css";

export default function TrustedBadge() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);

  return (
    <div className={styles.widget} dir="rtl">
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} />}
      {/* Keep eager images mounted so opening the card does not start their download. */}
      <section id={panelId} hidden={!open} className={styles.card} aria-label="بيانات توثيق المتجر">
        <div className={styles.logo}>
          <Image src="/trusted-center-logo.webp" alt="المركز السعودي للتنافسية والأعمال" width={180} height={60} loading="eager" unoptimized />
        </div>
        <p className={styles.heading}>
          موثّق لدى المركز السعودي للتنافسية<br />والأعمال
        </p>
        <a className={styles.website} href="https://alshariyaa.com" target="_blank" rel="noopener noreferrer">
          <span>الموقع:</span>{" "}
          <strong dir="ltr">https://alshariyaa.com</strong>
        </a>
        <p className={styles.company}>مؤسسة الشريحة الموثوقة</p>
        <div className={styles.qrFrame}>
          <div className={styles.qr}>
            <Image src="/trusted-store-qr.webp" alt="رمز QR لموقع المتجر" width={180} height={180} loading="eager" unoptimized />
            <span className={styles.check} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="m7 16 6 6L25 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>
        <div className={styles.statusRow}>
          <span>الحالة:</span>
          <span className={styles.status}>ساري</span>
        </div>
        <p className={styles.date}>تاريخ التحقق: <span dir="ltr">4-10-2026</span></p>
        <a className={styles.verify} href="https://eauthenticate.saudibusiness.gov.sa/inquiry" target="_blank" rel="noopener noreferrer">
          <span>عرض التحقق</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4H5v15h15v-9M13 4h7v7M10 14 20 4" />
          </svg>
        </a>
      </section>
      <button type="button" onClick={() => setOpen((value) => !value)} className={styles.trigger} aria-expanded={open} aria-controls={panelId}>
        <Image src="/trusted-store-emblem.webp" alt="" width={30} height={30} className={styles.emblem} loading="eager" unoptimized />
        <span>متجر موثّق</span>
      </button>
    </div>
  );
}
