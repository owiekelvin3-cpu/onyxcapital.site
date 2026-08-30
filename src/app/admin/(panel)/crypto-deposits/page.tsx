"use client";

import { AdminDepositsWorkspace } from "@/components/admin/AdminDepositsWorkspace";

export default function AdminCryptoDepositsPage() {
  return (
    <AdminDepositsWorkspace
      title="Crypto Deposits"
      subtitle="Spot wallet crypto deposits from users. Approve to credit their crypto holdings."
      variant="crypto"
      emptyMessage="No crypto deposit requests yet."
    />
  );
}
