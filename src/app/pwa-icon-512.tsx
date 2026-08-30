import { ImageResponse } from "next/og";
import { OgLogoMark } from "@/lib/og-brand-image";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function PwaIcon512() {
  return new ImageResponse(<OgLogoMark boxSize={512} />, { ...size });
}
