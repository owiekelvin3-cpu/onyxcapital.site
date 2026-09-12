"use client";

import { useEffect } from "react";
import { Comments } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { isSmartsuppEnabled, openSmartsuppChat } from "@/lib/smartsupp";

export default function SupportPage() {
  useEffect(() => {
    if (isSmartsuppEnabled()) openSmartsuppChat();
  }, []);

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e2ff4c] text-[#111111] shadow-[var(--shadow-glow)]">
        <Comments className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-text-primary">Live chat</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Chat with the Onyx Capital team about deposits, withdrawals, trading, and your account.
      </p>
      <Button
        className="mt-6 h-12 w-full max-w-xs rounded-full bg-[#e2ff4c] text-[#111111] hover:bg-[#d4f23d]"
        onClick={() => openSmartsuppChat()}
        disabled={!isSmartsuppEnabled()}
      >
        <Comments className="h-4 w-4" />
        {isSmartsuppEnabled() ? "Open live chat" : "Live chat is unavailable"}
      </Button>
    </div>
  );
}
