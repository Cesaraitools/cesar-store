"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: (redirect?: string) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CART_STORAGE_KEY = "cesar_store_cart_v2";
const AUTH_GUEST_CART_STORAGE_KEY = "cesar_store_auth_guest_cart";

function getSafeRedirectPath(redirect?: string) {
  if (!redirect) return "/";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/";
  return redirect;
}

function getGoogleCallbackUrl(redirectPath: string) {
  const callbackUrl = new URL("/auth/callback", window.location.origin);

  if (callbackUrl.hostname === "www.cesareshop.com") {
    callbackUrl.hostname = "cesareshop.com";
  }

  callbackUrl.searchParams.set("redirect", redirectPath);
  return callbackUrl.toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensuredUserRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        const currentSession = data.session;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.warn("Unable to initialize auth session", error);

        if (!isMounted) return;

        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (!session?.user) {
        ensuredUserRef.current = false;
      }

      if (event === "SIGNED_OUT") {
        router.push("/");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    ensuredUserRef.current = false;
  };

  const signInWithPassword = async (email: string, password: string) => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      return error.message;
    }

    return null;
  };

  const signInWithGoogle = async (redirect?: string) => {
    setLoading(true);

    const redirectPath = getSafeRedirectPath(redirect);

    try {
      sessionStorage.setItem("last_redirect", redirectPath);

      const rawCart = localStorage.getItem(CART_STORAGE_KEY);
      if (rawCart) {
        const parsedCart = JSON.parse(rawCart) as { items?: unknown[] };
        if (Array.isArray(parsedCart.items) && parsedCart.items.length > 0) {
          sessionStorage.setItem(AUTH_GUEST_CART_STORAGE_KEY, rawCart);
        } else {
          sessionStorage.removeItem(AUTH_GUEST_CART_STORAGE_KEY);
        }
      } else {
        sessionStorage.removeItem(AUTH_GUEST_CART_STORAGE_KEY);
      }
    } catch {
      try {
        sessionStorage.removeItem(AUTH_GUEST_CART_STORAGE_KEY);
      } catch {}
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getGoogleCallbackUrl(redirectPath),
      },
    });

    if (error) {
      setLoading(false);
      return error.message;
    }

    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
        signInWithPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
