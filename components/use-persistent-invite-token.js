"use client";

import { useEffect, useState } from "react";
import { readStoredInviteToken, saveStoredInviteToken } from "./invite-storage";

function normalizeInviteToken(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized !== "guest" ? normalized : "";
}

export function usePersistentInviteToken(rawInviteToken) {
  const [inviteToken, setInviteToken] = useState("");
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    const nextInviteToken = normalizeInviteToken(rawInviteToken) || readStoredInviteToken();
    setInviteToken(nextInviteToken);

    if (nextInviteToken) {
      saveStoredInviteToken(nextInviteToken);
    }

    setIsResolved(true);
  }, [rawInviteToken]);

  return { inviteToken, isResolved };
}
