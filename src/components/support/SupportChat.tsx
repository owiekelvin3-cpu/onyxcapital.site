"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  FileLines,
  Image,
  PaperClip,
  PaperPlane,
  FaceSmile,
  X,
  Comments,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  getAttachmentUrl,
  SUPPORT_EMOJI,
  SUPPORT_MAX_FILE_BYTES,
  type SupportMessageWithAttachments,
} from "@/lib/support";
import type { SupportAttachment, SupportConversationStatus } from "@/lib/support-types";

const STATUS_LABELS: Record<SupportConversationStatus, string> = {
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  archived: "Archived",
};

const SUPPORT_COPY = {
  emptyTitle: "No conversations yet",
  emptyDesc: "Start a conversation with our support team and we'll get back to you as soon as possible.",
  startConversation: "Start conversation",
  today: "Today",
  yesterday: "Yesterday",
  internalNote: "Internal note",
  loadOlder: "Load older messages",
  attach: "Attach file",
  emoji: "Add emoji",
  messagePlaceholder: "Type a message…",
  send: "Send",
  dropHint: "Drag and drop files here, or use the attach button",
  back: "Back",
};

const SupportViewportContext = createContext({ keyboardOpen: false });

/** Pin chat shell to the visible viewport (handles iOS/Android keyboard). */
export function useVisualViewportBox() {
  const [box, setBox] = useState({
    top: 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    keyboardOpen: false,
  });

  useEffect(() => {
    const vv = window.visualViewport;

    const update = () => {
      if (!vv) {
        setBox({ top: 0, height: window.innerHeight, keyboardOpen: false });
        return;
      }
      const keyboardOpen = window.innerHeight - vv.height > 60;
      setBox({
        top: Math.max(0, vv.offsetTop),
        height: Math.max(240, vv.height),
        keyboardOpen,
      });
    };

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return box;
}

/** Locks page scroll behind the mobile chat overlay (iOS-safe). */
export function useBodyScrollLock(locked: boolean, mediaQuery = "(max-width: 1023px)") {
  useEffect(() => {
    if (!locked) return;
    const mq = window.matchMedia(mediaQuery);
    let scrollY = 0;

    const lock = () => {
      scrollY = window.scrollY;
      document.documentElement.classList.add("support-chat-open");
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlock = () => {
      document.documentElement.classList.remove("support-chat-open");
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };

    const apply = () => {
      if (mq.matches) lock();
      else unlock();
    };

    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      unlock();
    };
  }, [locked, mediaQuery]);
}

function scrollMobileThreadToBottom() {
  const scroller = document.querySelector(
    ".support-mobile-overlay .support-message-scroller"
  ) as HTMLElement | null;
  if (!scroller) return;
  scroller.scrollTop = scroller.scrollHeight;
}

/** Full-viewport mobile Messages-style shell (covers dashboard chrome). */
export function SupportMobileChatOverlay({
  open,
  children,
  hideFrom = "lg",
}: {
  open: boolean;
  children: ReactNode;
  /** Match page layout breakpoint — hide overlay once desktop split is shown. */
  hideFrom?: "lg" | "xl";
}) {
  const media = hideFrom === "xl" ? "(max-width: 1279px)" : "(max-width: 1023px)";
  useBodyScrollLock(open, media);
  const box = useVisualViewportBox();

  useEffect(() => {
    if (!open || !box.keyboardOpen) return;
    const id = window.setTimeout(() => scrollMobileThreadToBottom(), 50);
    return () => window.clearTimeout(id);
  }, [open, box.keyboardOpen, box.height]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <SupportViewportContext.Provider value={{ keyboardOpen: box.keyboardOpen }}>
      <div
        className={cn(
          "support-mobile-overlay fixed left-0 right-0 z-[80] flex flex-col overflow-hidden bg-bg-primary",
          hideFrom === "xl" ? "xl:hidden" : "lg:hidden"
        )}
        style={{
          top: box.top,
          height: box.height,
          maxHeight: box.height,
        }}
        data-keyboard={box.keyboardOpen ? "open" : "closed"}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </SupportViewportContext.Provider>,
    document.body
  );
}

/** PC fullscreen chat shell (covers admin chrome like a desktop messenger). */
export function SupportDesktopFullscreen({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  useBodyScrollLock(open, "(min-width: 1024px)");

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="support-desktop-fullscreen fixed inset-0 z-[90] hidden flex-col overflow-hidden bg-bg-primary lg:flex"
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>,
    document.body
  );
}

export function SupportStatusBadge({
  status,
  className,
}: {
  status: SupportConversationStatus;
  className?: string;
}) {
  const styles: Record<SupportConversationStatus, string> = {
    open: "bg-brand/15 text-brand border-brand/25",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25",
    resolved: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25",
    archived: "bg-bg-hover text-text-tertiary border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        styles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SupportEmptyState({ onNew }: { onNew?: () => void }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.75rem] border border-border bg-bg-secondary text-brand shadow-sm">
        <Comments className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">{SUPPORT_COPY.emptyTitle}</h3>
      <p className="mt-2 max-w-sm text-sm text-text-tertiary">{SUPPORT_COPY.emptyDesc}</p>
      {onNew && (
        <Button className="mt-5 rounded-full px-6" onClick={onNew}>
          {SUPPORT_COPY.startConversation}
        </Button>
      )}
    </div>
  );
}

export function SupportChatSkeleton() {
  return (
    <div className="space-y-3 px-3 py-4" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "h-11 animate-pulse bg-bg-tertiary/70",
              i % 2 === 0
                ? "w-[58%] rounded-[1.15rem] rounded-br-md"
                : "w-[62%] rounded-[1.15rem] rounded-bl-md"
            )}
          />
        </div>
      ))}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return SUPPORT_COPY.today;
  if (d.toDateString() === yesterday.toDateString()) return SUPPORT_COPY.yesterday;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function AttachmentChip({ att }: { att: SupportAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const isImage = att.mime_type.startsWith("image/");

  useEffect(() => {
    let alive = true;
    void getAttachmentUrl(att.file_path)
      .then((u) => { if (alive) setUrl(u); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [att.file_path]);

  if (isImage && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block overflow-hidden rounded-2xl">
        <img src={url} alt={att.file_name} className="max-h-52 max-w-full object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/20 bg-black/10 px-3 py-2 text-xs dark:bg-white/10"
    >
      {isImage ? <Image className="h-3.5 w-3.5 shrink-0" /> : <FileLines className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{att.file_name}</span>
    </a>
  );
}

export function SupportMessageBubble({
  message,
  isOwn,
  clustered,
}: {
  message: SupportMessageWithAttachments;
  isOwn: boolean;
  clustered?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex w-full", isOwn ? "justify-end" : "justify-start", clustered ? "mt-0.5" : "mt-2.5")}
    >
      <div
        className={cn(
          "max-w-[82%] px-3.5 py-2 text-[15px] leading-snug shadow-sm sm:max-w-[68%]",
          message.is_internal
            ? "rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
            : isOwn
              ? cn(
                  "bg-brand text-brand-text",
                  clustered ? "rounded-[1.15rem] rounded-br-md" : "rounded-[1.15rem] rounded-br-[4px]"
                )
              : cn(
                  "border border-border/60 bg-[#e9e9eb] text-zinc-900 dark:border-transparent dark:bg-[#2c2c2e] dark:text-zinc-50",
                  clustered ? "rounded-[1.15rem] rounded-bl-md" : "rounded-[1.15rem] rounded-bl-[4px]"
                )
        )}
      >
        {message.is_internal && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{SUPPORT_COPY.internalNote}</p>
        )}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
        {message.attachments?.map((att) => <AttachmentChip key={att.id} att={att} />)}
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1.5 text-[10px] tabular-nums",
            message.is_internal ? "opacity-70" : isOwn ? "text-brand-text/70" : "text-zinc-500 dark:text-zinc-400"
          )}
        >
          <span>{formatTime(message.created_at)}</span>
          {message.failed && <span className="text-red-400">!</span>}
          {message.pending && <span>…</span>}
        </div>
      </div>
    </motion.div>
  );
}

export function SupportMessageList({
  messages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
  className,
}: {
  messages: SupportMessageWithAttachments[];
  currentUserId: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;
    const grew = messages.length > prevLen.current;
    prevLen.current = messages.length;
    if (!grew) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages.length]);

  const items = useMemo(() => {
    const out: Array<
      | { type: "day"; key: string; label: string }
      | { type: "msg"; key: string; message: SupportMessageWithAttachments; clustered: boolean }
    > = [];
    let lastDay = "";
    let lastSender: string | null = null;
    for (const message of messages) {
      const dk = dayKey(message.created_at);
      if (dk !== lastDay) {
        out.push({ type: "day", key: `day-${dk}`, label: formatDayLabel(message.created_at) });
        lastDay = dk;
        lastSender = null;
      }
      const clustered = lastSender === message.sender_id;
      out.push({ type: "msg", key: message.id, message, clustered });
      lastSender = message.sender_id;
    }
    return out;
  }, [messages]);

  if (loading && messages.length === 0) return <SupportChatSkeleton />;

  return (
    <div
      ref={scrollerRef}
      className={cn(
        "support-message-scroller min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4",
        className
      )}
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onLoadMore} disabled={loading}>
            {SUPPORT_COPY.loadOlder}
          </Button>
        </div>
      )}
      {items.map((item) =>
        item.type === "day" ? (
          <div key={item.key} className="flex justify-center py-3">
            <span className="rounded-full bg-bg-tertiary/80 px-3 py-1 text-[11px] font-medium text-text-tertiary shadow-sm">
              {item.label}
            </span>
          </div>
        ) : (
          <SupportMessageBubble
            key={item.key}
            message={item.message}
            isOwn={item.message.sender_id === currentUserId}
            clustered={item.clustered}
          />
        )
      )}
      <div ref={bottomRef} className="h-px" />
    </div>
  );
}

export function SupportComposer({
  onSend,
  disabled,
  placeholder,
  compact,
  keyboardOpen,
}: {
  onSend: (body: string, files: File[]) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  /** Hide desktop drop hint — used in mobile fullscreen. */
  compact?: boolean;
  /** When true, skip bottom safe-area padding (keyboard already lifted the viewport). */
  keyboardOpen?: boolean;
}) {
  const viewport = useContext(SupportViewportContext);
  const kbOpen = keyboardOpen ?? viewport.keyboardOpen;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  useEffect(() => {
    resize();
  }, [text]);

  const addFiles = (list: FileList | File[]) => {
    const next = Array.from(list).filter((f) => f.size <= SUPPORT_MAX_FILE_BYTES);
    setFiles((prev) => [...prev, ...next].slice(0, 5));
  };

  const submit = async () => {
    const body = text.trim();
    if ((!body && files.length === 0) || disabled || sending) return;
    setSending(true);
    try {
      await onSend(body, files);
      setText("");
      setFiles([]);
      setEmojiOpen(false);
      requestAnimationFrame(resize);
      scrollMobileThreadToBottom();
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "support-composer shrink-0 border-t border-border bg-bg-secondary px-2 pt-1.5 sm:px-3 sm:pt-2",
        kbOpen ? "pb-1.5" : "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        dragOver && "ring-2 ring-inset ring-brand/40"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
      }}
    >
      {files.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-2 px-1">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-bg-tertiary/50 px-2.5 py-1 text-xs">
              <PaperClip className="h-3 w-3 shrink-0" />
              <span className="max-w-[min(40vw,140px)] truncate">{f.name}</span>
              <button type="button" aria-label="Close" onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {emojiOpen && (
        <div className="mb-1.5 grid max-h-28 grid-cols-8 gap-0.5 overflow-y-auto rounded-2xl border border-border bg-bg-secondary p-1.5 shadow-lg">
          {SUPPORT_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded-lg p-1 text-lg hover:bg-bg-hover"
              onClick={() => {
                setText((v) => v + e);
                taRef.current?.focus();
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1">
        <button
          type="button"
          className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8e8e93] hover:bg-bg-hover hover:text-text-primary"
          aria-label={SUPPORT_COPY.attach}
          onClick={() => fileRef.current?.click()}
        >
          <PaperClip className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className={cn(
            "mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8e8e93] hover:bg-bg-hover hover:text-text-primary",
            emojiOpen && "bg-bg-hover text-text-primary"
          )}
          aria-label={SUPPORT_COPY.emoji}
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <FaceSmile className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            placeholder={placeholder ?? SUPPORT_COPY.messagePlaceholder}
            className="max-h-[100px] min-h-[40px] w-full resize-none rounded-[20px] border border-border/80 bg-bg-secondary px-3.5 py-2.5 text-base leading-5 text-text-primary outline-none placeholder:text-text-tertiary focus:border-brand/35 focus:ring-1 focus:ring-brand/20"
            onFocus={() => {
              scrollMobileThreadToBottom();
              window.setTimeout(scrollMobileThreadToBottom, 120);
              window.setTimeout(scrollMobileThreadToBottom, 320);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={disabled || sending}
          />
        </div>

        <Button
          className="mb-0.5 h-10 w-10 shrink-0 rounded-full p-0"
          onClick={() => void submit()}
          disabled={disabled || sending || (!text.trim() && files.length === 0)}
          aria-label={SUPPORT_COPY.send}
        >
          <PaperPlane className="h-4 w-4" />
        </Button>
      </div>
      {!compact && (
        <p className="mt-1.5 hidden text-center text-[10px] text-text-tertiary sm:block">{SUPPORT_COPY.dropHint}</p>
      )}
    </div>
  );
}

/** Shared thread chrome: nav bar + messages + composer. */
export function SupportThreadFrame({
  title,
  subtitle,
  onBack,
  trailing,
  children,
  composer,
  className,
  safeAreaTop,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  children: ReactNode;
  composer?: ReactNode;
  className?: string;
  /** Apply notch safe-area on the header (mobile overlay). */
  safeAreaTop?: boolean;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-primary", className)}>
      <header
        className={cn(
          "flex shrink-0 items-center gap-1.5 border-b border-border bg-bg-secondary/95 px-1.5 py-2 backdrop-blur-xl sm:gap-2 sm:px-3 sm:py-2.5",
          safeAreaTop && "pt-[max(0.5rem,env(safe-area-inset-top))]"
        )}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand hover:bg-bg-hover"
            aria-label={SUPPORT_COPY.back}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1 px-1 text-left">
          <p className="truncate text-[15px] font-semibold leading-tight tracking-tight text-text-primary sm:text-base">{title}</p>
          {subtitle && <p className="truncate text-[11px] leading-tight text-text-tertiary">{subtitle}</p>}
        </div>
        <div className="flex min-h-11 max-w-[48%] shrink-0 items-center justify-end gap-1 overflow-visible">
          {trailing}
        </div>
      </header>
      <div className="support-thread-wallpaper flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {composer}
    </div>
  );
}
