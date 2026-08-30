import { ImageResponse } from "next/og";
import { OgLogoMark } from "@/lib/og-brand-image";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function PwaIcon192() {
  return new ImageResponse(<OgLogoMark boxSize={192} />, { ...size });
}
