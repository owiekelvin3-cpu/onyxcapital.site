"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Download, Share, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "onyx_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* ignore registration failures in unsupported contexts */
      });
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (!isIosSafari()) return;

    const timer = window.setTimeout(() => setShowIosHint(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setShowAndroidBanner(false);
    setShowIosHint(false);
    setDeferredPrompt(null);
  }

  async function installApp() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") dismiss();
    else setDeferredPrompt(null);
  }

  const bannerVisible = showAndroidBanner || showIosHint;

  return (
    <>
      {children}
      {mounted &&
        bannerVisible &&
        createPortal(
          <div
            className={cn(
              "fixed inset-x-0 bottom-[calc(5.75rem+var(--safe-bottom))] z-[75] px-3",
              "lg:bottom-6 lg:max-w-md lg:left-auto lg:right-6"
            )}
          >
            <div className="rounded-2xl border border-brand/25 bg-bg-secondary/95 p-4 shadow-xl backdrop-blur-xl safe-area-x">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  {showIosHint ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{t("pwa.installTitle")}</p>
                  <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
                    {showIosHint ? t("pwa.iosHint") : t("pwa.installDesc")}
                  </p>
                  {!showIosHint && (
                    <Button type="button" size="sm" className="mt-3" onClick={() => void installApp()}>
                      {t("pwa.install")}
                    </Button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
                  aria-label="Dismiss install prompt"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
