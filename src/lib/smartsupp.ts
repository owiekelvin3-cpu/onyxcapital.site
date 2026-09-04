export type SmartsuppFn = {
  (...args: unknown[]): void;
  _: unknown[];
};

declare global {
  interface Window {
    smartsupp?: SmartsuppFn;
    _smartsupp?: {
      key?: string;
      cookieDomain?: string;
      hideWidget?: boolean;
      offsetX?: number;
      offsetY?: number;
      color?: string;
      privacyNoticeUrl?: string;
    };
  }
}

export function getSmartsuppKey() {
  return process.env.NEXT_PUBLIC_SMARTSUPP_KEY?.trim() ?? "";
}

function ensureLoader(key: string) {
  if (typeof window === "undefined") return;
  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = key;
  window._smartsupp.cookieDomain = ".onyxcapital.site";
  window._smartsupp.color = "#e2ff4c";
  window._smartsupp.privacyNoticeUrl = "https://onyxcapital.site/privacy";

  if (window.smartsupp) return;

  const smartsupp = function (...args: unknown[]) {
    smartsupp._.push(args);
  } as SmartsuppFn;
  smartsupp._ = [];
  window.smartsupp = smartsupp;

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.charset = "utf-8";
  script.async = true;
  script.src = "https://www.smartsuppchat.com/loader.js?";
  document.head.appendChild(script);
}

export function openSmartsuppChat() {
  if (typeof window === "undefined") return;
  window.smartsupp?.("chat:show");
  window.smartsupp?.("chat:open");
}

export function syncSmartsuppWidget(opts: {
  key: string;
  hidden: boolean;
  offsetY: number;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
}) {
  if (!opts.key) return;
  ensureLoader(opts.key);

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.hideWidget = opts.hidden;
  window._smartsupp.offsetY = opts.offsetY;

  if (opts.hidden) {
    window.smartsupp?.("chat:hide");
    return;
  }

  window.smartsupp?.("chat:show");

  if (opts.name) window.smartsupp?.("name", opts.name);
  if (opts.email) window.smartsupp?.("email", opts.email);
  if (opts.userId) {
    window.smartsupp?.("variables", {
      User_ID: opts.userId,
    });
  }
}
