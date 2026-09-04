const DEFAULT_PROPERTY_ID = "6a9b00c4b52e5034445459fe";
const DEFAULT_WIDGET_ID = "default";

type TawkApi = {
  onLoad?: () => void;
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
  customStyle?: {
    visibility?: {
      desktop?: { position?: string; xOffset?: string | number; yOffset?: string | number };
      mobile?: { position?: string; xOffset?: string | number; yOffset?: string | number };
    };
  };
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

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
  return window.Tawk_API;
}

function whenTawkReady(fn: (api: TawkApi) => void) {
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

function applyOffset(offsetY: number) {
  const api = tawkApi();
  api.customStyle = {
    visibility: {
      desktop: { position: "br", xOffset: 16, yOffset: offsetY },
      mobile: { position: "br", xOffset: 12, yOffset: offsetY },
    },
  };
}

function ensureLoader() {
  if (typeof window === "undefined") return;
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
  whenTawkReady((api) => {
    api.showWidget?.();
    api.maximize?.();
  });
}

export function syncTawkWidget(opts: {
  hidden: boolean;
  offsetY: number;
  name?: string | null;
  email?: string | null;
  userId?: string | null;
}) {
  if (typeof window === "undefined") return;

  const api = tawkApi();
  applyOffset(opts.offsetY);

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
      return;
    }

    ready.showWidget?.();

    const attributes: Record<string, string> = {};
    if (opts.name) attributes.name = opts.name;
    if (opts.email) attributes.email = opts.email;
    if (opts.userId) attributes.userId = opts.userId;
    if (Object.keys(attributes).length > 0) {
      ready.setAttributes?.(attributes, () => undefined);
    }
  });
}
