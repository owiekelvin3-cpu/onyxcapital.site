export function isSpotWalletDepositNotes(notes: string | null | undefined): boolean {
  if (!notes?.trim()) return false;

  if (notes.toLowerCase().includes("spot wallet deposit")) return true;

  try {
    const parsed = JSON.parse(notes) as { spot_wallet_deposit?: boolean };
    return parsed.spot_wallet_deposit === true;
  } catch {
    return false;
  }
}

export function buildSpotWalletDepositNotes(label: string): string {
  return JSON.stringify({
    spot_wallet_deposit: true,
    label,
  });
}

export function formatSpotWalletDepositNotes(notes: string | null | undefined): string | null {
  if (!notes?.trim()) return null;

  if (notes.toLowerCase().includes("spot wallet deposit")) {
    return notes.replace(/^Spot wallet deposit\s*[—-]\s*/i, "Spot wallet deposit · ");
  }

  try {
    const parsed = JSON.parse(notes) as { spot_wallet_deposit?: boolean; label?: string };
    if (parsed.spot_wallet_deposit) {
      return parsed.label
        ? `Spot wallet deposit · ${parsed.label}`
        : "Spot wallet deposit";
    }
  } catch {
    // plain text
  }

  return null;
}
