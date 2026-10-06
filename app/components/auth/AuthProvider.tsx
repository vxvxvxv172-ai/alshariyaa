"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!initialized) fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Intentionally omitting fetchMe/initialized from deps: we only want to fire
  // once on mount.  Cross-tab sync and post-logout re-checks are handled inside
  // authStore via the storage event listener and the initialized reset.

  return <>{children}</>;
}
