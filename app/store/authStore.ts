import { create } from "zustand";

export interface AuthUser {
  id?: string;
  _id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const CACHE_KEY = "auth_user_cache";

function readCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCache(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => {
    writeCache(user);
    set({ user, loading: false, initialized: true });
  },
  setLoading: (loading) => set({ loading }),

  fetchMe: async () => {
    // Skip if already initialized — prevents redundant backend calls on every
    // component mount.  The cross-tab storage listener below resets initialized
    // when another tab logs out/in so this guard doesn't block those cases.
    if (get().initialized) return;

    // Show cached user immediately to avoid layout flicker
    const cached = readCache();
    set({ user: cached ?? null, loading: false });

    // إذا لم يكن هناك مستخدم مسجل مسبقاً في هذا المتصفح، لا داعي لطلب /api/auth/me
    // هذا يوفر استدعاء Serverless Function مع كل زيارة لملايين الزوار غير المسجلين
    if (!cached) {
      set({ user: null, loading: false, initialized: true });
      return;
    }

    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      const user = data.authenticated ? (data.user as AuthUser) : null;
      writeCache(user);
      set({ user, loading: false, initialized: true });
    } catch {
      // Network error — keep cached value and mark initialized so the UI
      // doesn't get stuck in a loading state.
      set({ user: cached ?? null, loading: false, initialized: true });
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    writeCache(null);
    try { sessionStorage.removeItem("auth_register_draft"); } catch { /* ignore */ }
    // Reset initialized so fetchMe will re-verify on next visit/login attempt.
    // This also makes the auth page show immediately without stale user data.
    set({ user: null, initialized: false, loading: false });
  },
}));

// ─── Cross-tab sync ───────────────────────────────────────────────────────────
// When the user logs in or out in another tab, the localStorage cache key
// changes.  We listen for that event and re-run fetchMe so every open tab
// stays in sync without requiring a page refresh.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== CACHE_KEY) return;

    const store = useAuthStore.getState();

    if (!event.newValue) {
      // Another tab cleared the cache → treat as logout
      store.logout();
    } else {
      // Another tab wrote a new user → reset initialized so fetchMe re-runs
      useAuthStore.setState({ initialized: false });
      store.fetchMe();
    }
  });
}
