export type SignalStrengthTier = {
  label: string;
  color: string;
  glow: string;
  track: string;
};

export function getSignalStrength(pct: number): SignalStrengthTier {
  const value = Math.max(0, Math.min(100, pct));

  if (value >= 80) {
    return {
      label: "Elite",
      color: "#22c55e",
      glow: "rgba(34, 197, 94, 0.45)",
      track: "rgba(34, 197, 94, 0.15)",
    };
  }
  if (value >= 60) {
    return {
      label: "Strong",
      color: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.45)",
      track: "rgba(59, 130, 246, 0.15)",
    };
  }
  if (value >= 40) {
    return {
      label: "Moderate",
      color: "#eab308",
      glow: "rgba(234, 179, 8, 0.4)",
      track: "rgba(234, 179, 8, 0.14)",
    };
  }
  if (value >= 20) {
    return {
      label: "Low",
      color: "#f97316",
      glow: "rgba(249, 115, 22, 0.4)",
      track: "rgba(249, 115, 22, 0.14)",
    };
  }
  return {
    label: "Weak",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.45)",
    track: "rgba(239, 68, 68, 0.14)",
  };
}
