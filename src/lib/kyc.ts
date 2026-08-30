import { createClient } from "@/lib/supabase/client";

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export function getKycStatus(profile: { kyc_status?: string | null } | null | undefined): KycStatus {
  const status = profile?.kyc_status;
  if (status === "pending" || status === "approved" || status === "rejected") return status;
  return "none";
}

export function isKycApproved(profile: { kyc_status?: string | null } | null | undefined): boolean {
  return getKycStatus(profile) === "approved";
}

export function getKycStoragePath(documentUrl: string | null | undefined): string | null {
  if (!documentUrl) return null;
  if (!documentUrl.includes("://")) return documentUrl.replace(/^\/+/, "");
  const marker = "/kyc-documents/";
  const idx = documentUrl.indexOf(marker);
  if (idx >= 0) return decodeURIComponent(documentUrl.slice(idx + marker.length));
  return null;
}

export async function createKycDocumentSignedUrl(
  documentUrl: string | null | undefined,
  expiresIn = 120
): Promise<string | null> {
  const path = getKycStoragePath(documentUrl);
  if (!path) return documentUrl ?? null;
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("kyc-documents").createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return documentUrl ?? null;
  return data.signedUrl;
}

export function formatTransactionError(error: unknown, fallback: string, kycMessage: string): string {
  if (!error) return fallback;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
  if (/row-level security|violates row-level security|KYC verification required/i.test(message)) {
    return kycMessage;
  }
  return message || fallback;
}
