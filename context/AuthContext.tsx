"use client";

import {
  useCallback,
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
import { Capacitor } from "@capacitor/core";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: (redirect?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CART_STORAGE_KEY = "cesar_store_cart_v2";
const OAUTH_GUEST_CART_STORAGE_KEY = "cesar_store_oauth_guest_cart";
const NATIVE_OAUTH_GUEST_CART_STORAGE_KEY =
  "cesar_store_native_oauth_guest_cart";
const NATIVE_OAUTH_REDIRECT_STORAGE_KEY = "cesar_store_native_oauth_redirect";
const NATIVE_ANDROID_OAUTH_CALLBACK = "com.cesareshop.app://auth/callback";
const NATIVE_GOOGLE_AUTH_CAPABILITY_KEY =
  "cesar_store_native_google_auth";
const NATIVE_GOOGLE_AUTH_CAPABILITY_VERSION = "custom_tab_v1";

function getSafeRedirectPath(redirect?: string | null) {
  if (!redirect) return "/checkout";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/checkout";
  return redirect;
}

export function isNativeGoogleAuthAvailable() {
  if (typeof window === "undefined") return false;

  const isMarkedSupportedApp =
    navigator.userAgent.includes("CesarStoreApp/Android") &&
    window.localStorage.getItem(NATIVE_GOOGLE_AUTH_CAPABILITY_KEY) ===
      NATIVE_GOOGLE_AUTH_CAPABILITY_VERSION;

  if (isMarkedSupportedApp) return true;

  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android" &&
    Capacitor.isPluginAvailable("App") &&
    Capacitor.isPluginAvailable("Browser")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const ensuredUserRef = useRef(false);
  const nativeCallbackProcessingRef = useRef(false);
  const lastNativeCallbackUrlRef = useRef<string | null>(null);

  const handleNativeGoogleCallback = useCallback(
    async (callbackUrl: string) => {
      let parsedUrl: URL;

      try {
        parsedUrl = new URL(callbackUrl);
      } catch {
        return;
      }

      if (
        parsedUrl.protocol !== "com.cesareshop.app:" ||
        parsedUrl.hostname !== "auth" ||
        parsedUrl.pathname !== "/callback" ||
        nativeCallbackProcessingRef.current ||
        lastNativeCallbackUrlRef.current === callbackUrl
      ) {
        return;
      }

      nativeCallbackProcessingRef.current = true;
      lastNativeCallbackUrlRef.current = callbackUrl;
      setLoading(true);

      const queryParams = new URLSearchParams(parsedUrl.search);
      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""));
      const getCallbackParam = (key: string) =>
        queryParams.get(key) || hashParams.get(key);

      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => undefined);

        const callbackError = getCallbackParam("error");
        const code = getCallbackParam("code");
        const redirectPath = getSafeRedirectPath(
          localStorage.getItem(NATIVE_OAUTH_REDIRECT_STORAGE_KEY) ||
            sessionStorage.getItem("oauth_redirect") ||
            sessionStorage.getItem("last_redirect")
        );

        if (callbackError || !code) {
          router.replace(
            `/auth/login?redirect=${encodeURIComponent(redirectPath)}&oauth_error=1`
          );
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Native Google session exchange failed:", error.message);
          router.replace(
            `/auth/login?redirect=${encodeURIComponent(redirectPath)}&oauth_error=1`
          );
          setLoading(false);
          return;
        }

        const nativeGuestCart = localStorage.getItem(
          NATIVE_OAUTH_GUEST_CART_STORAGE_KEY
        );
        if (nativeGuestCart) {
          sessionStorage.setItem(OAUTH_GUEST_CART_STORAGE_KEY, nativeGuestCart);
        }
        sessionStorage.setItem("oauth_redirect", redirectPath);
        sessionStorage.setItem("last_redirect", redirectPath);

        router.replace(
          `/auth/sync?redirect=${encodeURIComponent(redirectPath)}`
        );
      } catch (error) {
        console.error("Unable to complete native Google sign-in:", error);
        setLoading(false);
      } finally {
        nativeCallbackProcessingRef.current = false;
      }
    },
    [router, supabase]
  );

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

  useEffect(() => {
    let isMounted = true;
    let listenerHandle: { remove: () => Promise<void> } | undefined;
    let registrationStarted = false;
    let intervalId: number | undefined;
    let timeoutId: number | undefined;

    const registerNativeCallback = async () => {
      if (registrationStarted || !isNativeGoogleAuthAvailable()) return;
      registrationStarted = true;

      const { App } = await import("@capacitor/app");

      listenerHandle = await App.addListener("appUrlOpen", ({ url }) => {
        if (isMounted) {
          void handleNativeGoogleCallback(url);
        }
      });

      const launchUrl = await App.getLaunchUrl();
      if (isMounted && launchUrl?.url) {
        await handleNativeGoogleCallback(launchUrl.url);
      }
    };

    const tryRegisterNativeCallback = () => {
      void registerNativeCallback().catch((error) => {
        registrationStarted = false;
        console.error("Unable to register native auth callback:", error);
      });
    };

    tryRegisterNativeCallback();
    intervalId = window.setInterval(tryRegisterNativeCallback, 250);
    timeoutId = window.setTimeout(() => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    }, 3000);

    return () => {
      isMounted = false;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      void listenerHandle?.remove();
    };
  }, [handleNativeGoogleCallback]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    ensuredUserRef.current = false;
  };

  const signInWithGoogle = async (redirect?: string) => {
    setLoading(true);

    const redirectPath = getSafeRedirectPath(redirect);
    const useNativeFlow = isNativeGoogleAuthAvailable();

    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_redirect", redirectPath);
      sessionStorage.setItem("last_redirect", redirectPath);

      const guestCart = localStorage.getItem(CART_STORAGE_KEY);
      if (guestCart) {
        sessionStorage.setItem(OAUTH_GUEST_CART_STORAGE_KEY, guestCart);
      } else {
        sessionStorage.removeItem(OAUTH_GUEST_CART_STORAGE_KEY);
      }

      if (useNativeFlow) {
        localStorage.setItem(NATIVE_OAUTH_REDIRECT_STORAGE_KEY, redirectPath);

        if (guestCart) {
          localStorage.setItem(
            NATIVE_OAUTH_GUEST_CART_STORAGE_KEY,
            guestCart
          );
        } else {
          localStorage.removeItem(NATIVE_OAUTH_GUEST_CART_STORAGE_KEY);
        }
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: useNativeFlow
        ? {
            redirectTo: NATIVE_ANDROID_OAUTH_CALLBACK,
            skipBrowserRedirect: true,
          }
        : {
            redirectTo: `${
              window.location.origin
            }/auth/callback?redirect=${encodeURIComponent(redirectPath)}`,
          },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
      setLoading(false);
      return;
    }

    if (useNativeFlow) {
      if (!data.url) {
        console.error("Native Google sign-in did not return an authorization URL");
        setLoading(false);
        return;
      }

      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({
          url: data.url,
          toolbarColor: "#ffffff",
        });
        setLoading(false);
      } catch (nativeBrowserError) {
        console.error("Unable to open native Google sign-in:", nativeBrowserError);
        setLoading(false);
      }
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
