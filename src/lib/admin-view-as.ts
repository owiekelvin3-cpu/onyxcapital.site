import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { ADMIN_RETURN_COOKIE, VIEWING_AS_FLAG } from "@/lib/admin-view-as-cookie";

export { ADMIN_RETURN_COOKIE, VIEWING_AS_FLAG };

const MAX_AGE = 60 * 60 * 2;

function encryptionKey() {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing server secret for admin view");
  }
  return createHash("sha256").update(secret).digest();
}

export function sealAdminReturn(refreshToken: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(refreshToken, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function openAdminReturn(payload: string) {
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < 29) {
    throw new Error("Invalid admin return cookie");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function adminViewCookieOptions() {
  return {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

export function viewingAsFlagOptions() {
  return {
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: false,
  };
}
