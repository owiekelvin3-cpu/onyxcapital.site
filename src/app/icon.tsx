import { ImageResponse } from "next/og";
import { OgLogoMark } from "@/lib/og-brand-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<OgLogoMark boxSize={32} />, { ...size });
}
