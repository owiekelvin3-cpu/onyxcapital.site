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
let watchInstalled = false;
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
  window._smartsupp.hideWidget = true;
  window._smartsupp.privacyNoticeUrl = "https://onyxcapital.site/privacy";

  watchNativeLauncher();

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

const NATIVE_LAUNCHER_SELECTOR = [
  'iframe[src*="smartsupp"]',
  'iframe[title*="Smartsupp" i]',
  "#chat-application",
  "#smartsupp-widget-container",
].join(",");

function hideNativeLauncher() {
  if (typeof document === "undefined" || chatOpen) return;
  document.querySelectorAll(NATIVE_LAUNCHER_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.style.setProperty("opacity", "0", "important");
    node.style.setProperty("visibility", "hidden", "important");
    node.style.setProperty("pointer-events", "none", "important");
    node.style.setProperty("transform", "translate(120vw, 120vh)", "important");
  });
}

function watchNativeLauncher() {
  if (typeof document === "undefined" || watchInstalled) return;
  watchInstalled = true;
  hideNativeLauncher();
  const observer = new MutationObserver(() => hideNativeLauncher());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function installHooks() {
  if (hooksInstalled || typeof window === "undefined" || !window.smartsupp) return;
  hooksInstalled = true;
  window.smartsupp("on", "messenger_close", () => {
    window._smartsupp = window._smartsupp || {};
    window._smartsupp.hideWidget = true;
    window.smartsupp?.("chat:hide");
    notifyChatOpen(false);
    hideNativeLauncher();
  });
}

export function openSmartsuppChat() {
  if (typeof window === "undefined") return;
  const key = getSmartsuppKey();
  if (!key) return;
  ensureLoader(key);
  notifyChatOpen(true);
  window._smartsupp = window._smartsupp || {};
  window._smartsupp.hideWidget = false;
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
  window._smartsupp.hideWidget = opts.hidden || !chatOpen;

  if (opts.hidden) {
    window.smartsupp?.("chat:close");
    window.smartsupp?.("chat:hide");
    notifyChatOpen(false);
    return;
  }

  if (chatOpen) {
    window._smartsupp.hideWidget = false;
    window.smartsupp?.("chat:show");
  } else {
    window._smartsupp.hideWidget = true;
    window.smartsupp?.("chat:hide");
    hideNativeLauncher();
  }

  if (opts.name) window.smartsupp?.("name", opts.name);
  if (opts.email) window.smartsupp?.("email", opts.email);
  if (opts.userId) {
    window.smartsupp?.("variables", { User_ID: opts.userId });
  }
}
