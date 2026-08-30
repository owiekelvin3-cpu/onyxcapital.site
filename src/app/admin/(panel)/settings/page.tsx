"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DepositWalletSettings } from "@/components/admin/DepositWalletSettings";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "@/components/icons";
import { cn } from "@/lib/utils";

interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("platform_settings").select("*").order("key");
    setSettings((data as SettingRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: SettingRow) {
    setEditingKey(row.key);
    setEditValue(JSON.stringify(row.value, null, 2));
  }

  async function saveEdit() {
    if (!editingKey) return;
    setMessage("");
    try {
      const parsed = JSON.parse(editValue);
      const supabase = createClient();
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: parsed, updated_at: new Date().toISOString() })
        .eq("key", editingKey);
      if (error) throw error;
      setMessage("Setting saved");
      setEditingKey(null);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invalid JSON or save failed");
    }
  }

  const otherSettings = settings.filter((row) => row.key !== "deposit_config");

  return (
    <div className="space-y-5 max-w-4xl">
      <AdminPageHeader
        title="Platform settings"
        subtitle="Manage deposit wallet addresses and other platform configuration."
      />

      <DepositWalletSettings />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary">Other settings</h2>
            <p className="mt-1 text-sm text-text-tertiary">
              Advanced JSON configuration. Deposit wallets are edited above.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="w-full sm:w-auto">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {message && (
          <p className="text-sm text-text-secondary border border-border rounded-lg px-4 py-3 bg-bg-secondary">
            {message}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : otherSettings.length === 0 ? (
          <p className="text-sm text-text-tertiary">No other platform settings found.</p>
        ) : (
          otherSettings.map((row) => (
            <Card key={row.key}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-mono text-sm font-semibold text-text-primary">{row.key}</h3>
                {editingKey !== row.key && (
                  <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                    Edit
                  </Button>
                )}
              </div>
              {editingKey === row.key ? (
                <div className="space-y-2">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={12}
                    className="w-full font-mono text-xs bg-bg-primary border border-border rounded p-3"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <pre className="text-xs text-text-tertiary overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(row.value, null, 2)}
                </pre>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
