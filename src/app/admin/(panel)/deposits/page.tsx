"use client";

import { AdminDepositsWorkspace } from "@/components/admin/AdminDepositsWorkspace";

export default function AdminDepositsPage() {
  return (
    <AdminDepositsWorkspace
      title="Deposits"
      subtitle="Gift cards and other non-crypto deposit requests."
      variant="other"
      emptyMessage="No gift card or other deposits found."
    />
  );
}
