"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDepositConfig, updateDepositWallets } from "@/lib/admin-api";
import { DEPOSIT_CRYPTO_KEYS, DEPOSIT_CRYPTO_LABELS } from "@/lib/deposit-options";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loader2 } from "@/components/icons";

function emptyWallets(): Record<string, string> {
  return Object.fromEntries(DEPOSIT_CRYPTO_KEYS.map((key) => [key, ""]));
}

export function DepositWalletSettings() {
  const [wallets, setWallets] = useState<Record<string, string>>(emptyWallets);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const config = await fetchDepositConfig();
      const next = emptyWallets();
      for (const key of DEPOSIT_CRYPTO_KEYS) {
        next[key] = config?.cryptoWallets?.[key]?.trim() ?? "";
      }
      setWallets(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load deposit wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateWallet(key: string, value: string) {
    setWallets((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");

    const trimmed = Object.fromEntries(
      DEPOSIT_CRYPTO_KEYS.map((key) => [key, wallets[key]?.trim() ?? ""])
    );

    try {
      await updateDepositWallets(trimmed);
      setWallets(trimmed);
      setMessage("Deposit wallet addresses saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save wallet addresses.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Deposit wallet addresses</h2>
          <p className="text-sm text-text-tertiary mt-1">
            These addresses are shown to users on the Deposit page for each crypto option.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red border border-red/30 rounded-lg px-4 py-3 bg-red/5">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-green border border-green/30 rounded-lg px-4 py-3 bg-green/5">
            {message}
          </p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-tertiary py-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading wallet addresses…
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {DEPOSIT_CRYPTO_KEYS.map((key) => (
              <Input
                key={key}
                id={`wallet-${key}`}
                label={DEPOSIT_CRYPTO_LABELS[key]}
                value={wallets[key] ?? ""}
                onChange={(e) => updateWallet(key, e.target.value)}
                placeholder={`Enter ${DEPOSIT_CRYPTO_LABELS[key]} address`}
                className="font-mono text-xs"
              />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
          <Button onClick={handleSave} disabled={loading || saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save wallet addresses"
            )}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading || saving} className="w-full sm:w-auto">
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}
