"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function useThemeColors() {
  const { theme, mounted } = useTheme();
  const [colors, setColors] = useState({
    brand: "#E2FF4C",
    textTertiary: "#9CA3AF",
    bgSecondary: "#FFFFFF",
    border: "#E5E7EB",
    textPrimary: "#111111",
  });

  useEffect(() => {
    setColors({
      brand: readCssVar("--brand", "#111111"),
      textTertiary: readCssVar("--text-tertiary", "#9CA3AF"),
      bgSecondary: readCssVar("--bg-secondary", "#FFFFFF"),
      border: readCssVar("--border", "#E5E7EB"),
      textPrimary: readCssVar("--text-primary", "#111111"),
    });
  }, [theme, mounted]);

  return colors;
}
