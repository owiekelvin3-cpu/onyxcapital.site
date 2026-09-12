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
      hideBanner?: boolean;
      offsetX?: number;
      offsetY?: number;
      color?: string;
      privacyNoticeUrl?: string;
    };
  }
}

type ChatListener = (open: boolean) => void;

const chatListeners = new Set<ChatListener>();
let hooksInstalled = false;
let chatOpen = false;

export function getSmartsuppKey() {
  return process.env.NEXT_PUBLIC_SMARTSUPP_KEY?.trim() ?? "";
}

export function isSmartsuppEnabled() {
  return Boolean(getSmartsuppKey());
}

function setChatOpenClass(open: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("smartsupp-chat-open", open);
}

function notifyChatOpen(open: boolean) {
  chatOpen = open;
  setChatOpenClass(open);
  chatListeners.forEach((fn) => fn(open));
}

export function onSmartsuppChatOpenChange(fn: ChatListener) {
  chatListeners.add(fn);
  fn(chatOpen);
  return () => {
    chatListeners.delete(fn);
  };
}

function ensureLoader(key: string) {
  if (typeof window === "undefined" || !key) return;

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.key = key;
  window._smartsupp.cookieDomain = ".onyxcapital.site";
  window._smartsupp.color = "#e2ff4c";
  window._smartsupp.hideBanner = true;
  window._smartsupp.hideWidget = !chatOpen;
  window._smartsupp.privacyNoticeUrl = "https://onyxcapital.site/privacy";

  if (window.smartsupp) {
    installHooks();
    return;
  }

  const smartsupp = function (...args: unknown[]) {
    smartsupp._.push(args);
  } as SmartsuppFn;
  smartsupp._ = [];
  window.smartsupp = smartsupp;
  installHooks();

  if (document.getElementById("smartsupp-embed-script")) return;
  const script = document.createElement("script");
  script.id = "smartsupp-embed-script";
  script.type = "text/javascript";
  script.charset = "utf-8";
  script.async = true;
  script.src = "https://www.smartsuppchat.com/loader.js?";
  document.head.appendChild(script);
}

function installHooks() {
  if (hooksInstalled || typeof window === "undefined" || !window.smartsupp) return;
  hooksInstalled = true;
  window.smartsupp("on", "messenger_close", () => {
    window.smartsupp?.("chat:hide");
    notifyChatOpen(false);
  });
}

export function openSmartsuppChat() {
  if (typeof window === "undefined") return;
  const key = getSmartsuppKey();
  if (!key) return;
  ensureLoader(key);
  notifyChatOpen(true);
  window.smartsupp?.("chat:show");
  window.smartsupp?.("chat:open");
}

export function syncSmartsuppWidget(opts: {
  hidden: boolean;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
}) {
  const key = getSmartsuppKey();
  if (!key) return;
  ensureLoader(key);

  window._smartsupp = window._smartsupp || {};
  window._smartsupp.hideWidget = opts.hidden;

  if (opts.hidden) {
    window.smartsupp?.("chat:close");
    window.smartsupp?.("chat:hide");
    notifyChatOpen(false);
    return;
  }

  if (chatOpen) {
    window.smartsupp?.("chat:show");
  } else {
    window.smartsupp?.("chat:hide");
  }

  if (opts.name) window.smartsupp?.("name", opts.name);
  if (opts.email) window.smartsupp?.("email", opts.email);
  if (opts.userId) {
    window.smartsupp?.("variables", { User_ID: opts.userId });
  }
}
