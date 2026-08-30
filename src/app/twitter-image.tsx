import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/constants";
import { OgBrandImage } from "@/lib/og-brand-image";

export const alt = `${BRAND.fullName} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<OgBrandImage />, { ...size });
}
