import { ImageResponse } from "next/og";
import { OgLogoMark } from "@/lib/og-brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<OgLogoMark boxSize={180} />, { ...size });
}
