"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return null;
}
