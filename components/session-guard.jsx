"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const SESSION_KEY = "fifa-half-time-show-session";
const LOGOUT_REASON_KEY = "fifa-half-time-show-logout-reason";
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const PROTECTED_ROUTES = ["/portal"];
const controlBaseUrl =
  process.env.NEXT_PUBLIC_CONTROL_URL ?? "http://127.0.0.1:3010";

async function recordActivity(eventType, extra = {}) {
  const sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    return;
  }

  try {
    await fetch(`${controlBaseUrl}/api/activity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        sessionId,
        pathname: window.location.pathname,
        userAgent: window.navigator.userAgent,
        ...extra,
      }),
    });
  } catch {
    // Best effort logging only.
  }
}

export function SessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef(null);

  useEffect(() => {
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname?.startsWith(route),
    );
    const lastActiveAt = Number(sessionStorage.getItem(SESSION_KEY));
    const hasSession = Number.isFinite(lastActiveAt) && lastActiveAt > 0;
    const isExpired = hasSession && Date.now() - lastActiveAt >= IDLE_LIMIT_MS;

    function clearSessionAndRedirect() {
      void recordActivity("logout", { reason: "idle" });
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.setItem(LOGOUT_REASON_KEY, "idle");
      router.replace("/");
    }

    function resetIdleTimer() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(clearSessionAndRedirect, IDLE_LIMIT_MS);
    }

    function handleActivity() {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        return;
      }

      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
      resetIdleTimer();
    }

    if (isProtectedRoute && (!hasSession || isExpired)) {
      if (isExpired) {
        clearSessionAndRedirect();
        return undefined;
      }

      router.replace("/");
      return undefined;
    }

    if (hasSession) {
      if (isExpired) {
        clearSessionAndRedirect();
        return undefined;
      }

      resetIdleTimer();
      window.addEventListener("mousemove", handleActivity);
      window.addEventListener("keydown", handleActivity);
      window.addEventListener("click", handleActivity);
      window.addEventListener("touchstart", handleActivity);
      window.addEventListener("scroll", handleActivity, { passive: true });
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [pathname, router]);

  return null;
}
