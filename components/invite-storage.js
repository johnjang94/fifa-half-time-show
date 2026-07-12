"use client";

const INVITE_TOKEN_KEY = "fifa-half-time-show-invite-token";

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function readStoredInviteToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return normalize(window.sessionStorage.getItem(INVITE_TOKEN_KEY));
  } catch {
    return "";
  }
}

export function saveStoredInviteToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  const safeToken = normalize(token);

  if (!safeToken) {
    window.sessionStorage.removeItem(INVITE_TOKEN_KEY);
    return;
  }

  window.sessionStorage.setItem(INVITE_TOKEN_KEY, safeToken);
}

export function clearStoredInviteToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(INVITE_TOKEN_KEY);
}
