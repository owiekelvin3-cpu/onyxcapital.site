"use client";

import { useEffect } from "react";
import { syncUserLocation } from "@/lib/user-location";

export function UserLocationSync({ userId }: { userId?: string }) {
  useEffect(() => {
    if (!userId) return;
    void syncUserLocation(userId);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void syncUserLocation(userId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId]);

  return null;
}
