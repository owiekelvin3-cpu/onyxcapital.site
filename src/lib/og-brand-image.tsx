import { BRAND } from "@/lib/constants";

/** Shared JSX for Next.js OG / Twitter card images (inline styles only). */
export function OgBrandImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#0a0a0a",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -80,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(226,255,76,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -160,
          left: -100,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(226,255,76,0.08) 0%, transparent 70%)",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "#E2FF4C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="42" height="42" viewBox="0 0 32 32" fill="none">
            <path
              fillRule="evenodd"
              d="M16 6.15c-5.44 0-9.85 4.41-9.85 9.85S10.56 25.85 16 25.85 25.85 21.44 25.85 16 21.44 6.15 16 6.15zm0 4.4a5.45 5.45 0 1 0 0 10.9 5.45 5.45 0 0 0 0-10.9z"
              fill="#111111"
            />
          </svg>
        </div>
        <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.02em" }}>{BRAND.name}</span>
      </div>

      <div
        style={{
          position: "relative",
          maxWidth: 920,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <p
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: 0,
          }}
        >
          {BRAND.tagline}
        </p>
        <p
          style={{
            fontSize: 26,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.72)",
            marginTop: 28,
            marginBottom: 0,
          }}
        >
          Trade crypto, stocks, and forex — one secure platform.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 600, color: "#E2FF4C" }}>{BRAND.domain}</span>
        <span style={{ fontSize: 18, color: "rgba(255,255,255,0.45)" }}>{BRAND.fullName}</span>
      </div>
    </div>
  );
}

/** Compact logo mark for favicons / apple touch icon. */
export function OgLogoMark({ boxSize }: { boxSize: number }) {
  const radius = Math.round(boxSize * 0.1875);
  const svgSize = Math.round(boxSize * 0.5625);
  return (
    <div
      style={{
        width: boxSize,
        height: boxSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111111",
        borderRadius: radius,
      }}
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 32 32" fill="none">
        <path
          fillRule="evenodd"
          d="M16 6.15c-5.44 0-9.85 4.41-9.85 9.85S10.56 25.85 16 25.85 25.85 21.44 25.85 16 21.44 6.15 16 6.15zm0 4.4a5.45 5.45 0 1 0 0 10.9 5.45 5.45 0 0 0 0-10.9z"
          fill="#E2FF4C"
        />
      </svg>
    </div>
  );
}
