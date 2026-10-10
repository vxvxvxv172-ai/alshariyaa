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









































      <button type="button" onClick={() => setOpen((value) => !value)} className={styles.trigger} aria-expanded={open} aria-controls={open ? panelId : undefined}>
        <Image src="/trusted-store-emblem.webp" alt="" width={30} height={30} className={styles.emblem} loading="eager" unoptimized />
        <span>متجر موثّق</span>
      </button>
    </div>
  );
}
