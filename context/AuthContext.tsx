"use client";

import {
  createContext,
  useContext,
  useEffect,
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
  signInWithGoogle: (redirect?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensuredUserRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      const currentSession = data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      /**
       * 💣 FIX: بعد Google login
       * لو فيه redirect محفوظ → نرجع له
       */
      if (currentSession?.user) {
        const redirect = sessionStorage.getItem("oauth_redirect");

        if (redirect) {
          sessionStorage.removeItem("oauth_redirect");

          // مهم: replace عشان مايرجعش تاني
          router.replace(redirect);
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

      /**
       * 💣 FIX: نفس الفكرة هنا برضو (event-based)
       */
      if (event === "SIGNED_IN" && session?.user) {
        const redirect = sessionStorage.getItem("oauth_redirect");

        if (redirect) {
          sessionStorage.removeItem("oauth_redirect");
          router.replace(redirect);
        }
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

  const signInWithGoogle = async (redirect?: string) => {
    setLoading(true);

    const redirectPath = redirect || "/";

    /**
     * 💣 FIX: نحفظ الصفحة قبل ما نخرج لـ Google
     */
    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_redirect", redirectPath);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
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