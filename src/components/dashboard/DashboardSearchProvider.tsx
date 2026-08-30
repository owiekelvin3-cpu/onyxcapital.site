"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { filterDashboardSearchItems, type DashboardSearchItem } from "@/lib/dashboard-search";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils";
import { Search, X } from "@/components/icons";

type DashboardSearchContextValue = {
  openSearch: () => void;
  closeSearch: () => void;
  isOpen: boolean;
};

const DashboardSearchContext = createContext<DashboardSearchContextValue | null>(null);

export function useDashboardSearch() {
  const ctx = useContext(DashboardSearchContext);
  if (!ctx) {
    throw new Error("useDashboardSearch must be used within DashboardSearchProvider");
  }
  return ctx;
}

function resultLabel(item: DashboardSearchItem, t: (key: string) => string) {
  if (item.labelKey) return t(item.labelKey);
  return item.label ?? item.href;
}

function resultGroup(item: DashboardSearchItem, t: (key: string) => string) {
  if (item.groupKey) return t(item.groupKey);
  return item.group ?? "";
}

function DashboardCommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useBodyScrollLock(open);

  const results = useMemo(() => filterDashboardSearchItems(query, t), [query, t]);

  const navigate = useCallback(
    (item: DashboardSearchItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = results[activeIndex];
        if (item) navigate(item);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, results, activeIndex, navigate, onClose]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[max(1rem,var(--safe-top))] sm:pt-24">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label={t("common.close")}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("dashboard.searchPlaceholder")}
        className="relative z-[1] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-tertiary">
              {t("dashboard.searchNoResults")}
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigate(item)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      index === activeIndex
                        ? "bg-brand/10 text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{resultLabel(item, t)}</span>
                      <span className="block truncate text-[11px] text-text-tertiary">
                        {resultGroup(item, t)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-text-tertiary">
                      {item.href.replace("/dashboard", "").replace(/^\//, "") || "home"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[10px] text-text-tertiary">
          <span>{t("dashboard.searchHint")}</span>
          <kbd className="rounded border border-border bg-bg-primary px-1.5 py-0.5 font-mono">Esc</kbd>
        </div>
      </div>
    </div>
  );
}

export function DashboardSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ openSearch, closeSearch, isOpen: open }),
    [openSearch, closeSearch, open]
  );

  return (
    <DashboardSearchContext.Provider value={value}>
      {children}
      <DashboardCommandPalette open={open} onClose={closeSearch} />
    </DashboardSearchContext.Provider>
  );
}
