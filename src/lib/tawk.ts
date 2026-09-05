const DEFAULT_PROPERTY_ID = "6a9b00c4b52e5034445459fe";
const DEFAULT_WIDGET_ID = "default";
const BUBBLE_MAX_PX = 96;

type TawkApi = {
  autoStart?: boolean;
  start?: (opts?: { showWidget?: boolean }) => void;
  onBeforeLoad?: () => void;
  onLoad?: () => void;
  onChatMaximized?: () => void;
  onChatMinimized?: () => void;
  maximize?: () => void;
  minimize?: () => void;
  showWidget?: () => void;
  hideWidget?: () => void;
  setAttributes?: (
    attributes: Record<string, string>,
    callback?: (error?: unknown) => void
  ) => void;
  visitor?: {
    name?: string;
    email?: string;
  };
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

type ChatListener = (open: boolean) => void;

const chatListeners = new Set<ChatListener>();
let hooksInstalled = false;
let bubbleObserver: MutationObserver | null = null;
let chatOpen = false;

export function getTawkEmbed() {
  const propertyId =
    process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim() || DEFAULT_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID?.trim() || DEFAULT_WIDGET_ID;
  return {
    propertyId,
    widgetId,
    src: `https://embed.tawk.to/${propertyId}/${widgetId}`,
  };
}

export function isTawkEnabled() {
  return Boolean(getTawkEmbed().propertyId);
}

function tawkApi(): TawkApi {
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_API.autoStart = false;
  return window.Tawk_API;
}

function setChatOpenClass(open: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("tawk-chat-open", open);
}

function notifyChatOpen(open: boolean) {
  chatOpen = open;
  setChatOpenClass(open);
  chatListeners.forEach((fn) => fn(open));
}

export function onTawkChatOpenChange(fn: ChatListener) {
  chatListeners.add(fn);
  fn(chatOpen);
  return () => {
    chatListeners.delete(fn);
  };
}

const TAWK_BUBBLE_SELECTOR = [
  'iframe[src*="tawk"]',
  'iframe[title*="chat widget"]',
  'div[id*="tawk"]',
  'div[id*="Tawk"]',
].join(",");

/** Hide Tawk's own bubble so it cannot sit on top of buttons, docks, or forms. */
export function suppressNativeTawkBubble() {
  if (typeof document === "undefined" || chatOpen) return;

  document.querySelectorAll<HTMLElement>(TAWK_BUBBLE_SELECTOR).forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (rect.width > BUBBLE_MAX_PX || rect.height > BUBBLE_MAX_PX) return;

    el.style.setProperty("opacity", "0", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("pointer-events", "none", "important");

    const parent = el.parentElement;
    if (!parent || parent === document.body) return;
    const parentRect = parent.getBoundingClientRect();
    if (parentRect.width <= BUBBLE_MAX_PX + 24 && parentRect.height <= BUBBLE_MAX_PX + 24) {
      parent.style.setProperty("pointer-events", "none", "important");
    }
  });
}

function watchNativeBubble() {
  if (typeof document === "undefined" || bubbleObserver) return;
  bubbleObserver = new MutationObserver(() => suppressNativeTawkBubble());
  bubbleObserver.observe(document.documentElement, { childList: true, subtree: true });
  suppressNativeTawkBubble();
}

function installHooks() {
  if (hooksInstalled || typeof window === "undefined") return;
  hooksInstalled = true;

  const api = tawkApi();
  const previousBefore = api.onBeforeLoad;
  const previousLoad = api.onLoad;
  const previousMax = api.onChatMaximized;
  const previousMin = api.onChatMinimized;

  api.onBeforeLoad = () => {
    previousBefore?.();
    api.hideWidget?.();
  };
  api.onLoad = () => {
    previousLoad?.();
    if (!chatOpen) {
      api.hideWidget?.();
      suppressNativeTawkBubble();
    }
  };
  api.onChatMaximized = () => {
    previousMax?.();
    notifyChatOpen(true);
  };
  api.onChatMinimized = () => {
    previousMin?.();
    api.hideWidget?.();
    suppressNativeTawkBubble();
    notifyChatOpen(false);
  };
}

function whenTawkReady(fn: (api: TawkApi) => void) {
  installHooks();
  const api = tawkApi();
  if (typeof api.showWidget === "function") {
    fn(api);
    return;
  }
  const previous = api.onLoad;
  api.onLoad = () => {
    previous?.();
    fn(tawkApi());
  };
}

function ensureLoader() {
  if (typeof window === "undefined") return;
  installHooks();
  watchNativeBubble();
  if (document.getElementById("tawk-embed-script")) return;

  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();
  tawkApi();

  const { src } = getTawkEmbed();
  const script = document.createElement("script");
  script.id = "tawk-embed-script";
  script.async = true;
  script.src = src;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

export function openTawkChat() {
  if (typeof window === "undefined") return;
  notifyChatOpen(true);
  whenTawkReady((api) => {
    api.start?.({ showWidget: false });
    api.showWidget?.();
    api.maximize?.();
  });
}

export function syncTawkWidget(opts: {
  hidden: boolean;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
}) {
  if (typeof window === "undefined") return;

  const api = tawkApi();

  if (opts.name || opts.email) {
    api.visitor = {
      ...(opts.name ? { name: opts.name } : {}),
      ...(opts.email ? { email: opts.email } : {}),
    };
  }

  ensureLoader();

  whenTawkReady((ready) => {
    if (opts.hidden) {
      ready.hideWidget?.();
      ready.minimize?.();
      notifyChatOpen(false);
      suppressNativeTawkBubble();
      return;
    }

    if (chatOpen) {
      ready.showWidget?.();
    } else {
      ready.hideWidget?.();
      suppressNativeTawkBubble();
    }

    const attributes: Record<string, string> = {};
    if (opts.name) attributes.name = opts.name;
    if (opts.email) attributes.email = opts.email;
    if (opts.userId) attributes.userId = opts.userId;
    if (Object.keys(attributes).length > 0) {
      ready.setAttributes?.(attributes, () => undefined);
    }
  });
}
