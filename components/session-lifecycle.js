"use client";

import { clearStoredInviteToken } from "./invite-storage";

export const SESSION_KEY = "fifa-half-time-show-session";
export const LOGOUT_REASON_KEY = "fifa-half-time-show-logout-reason";

export function clearSessionState() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
  clearStoredInviteToken();
}

export function markIdleLogout() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(LOGOUT_REASON_KEY, "idle");
}
