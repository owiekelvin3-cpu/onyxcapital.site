"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle, RefreshCw, Upload, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Phase = "idle" | "camera" | "countdown" | "preview" | "error";

type FaceDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

interface FaceVerificationCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function isSecureCameraContext() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost";
}

function mapCameraError(error: unknown, t: (key: string) => string): string {
  if (!isSecureCameraContext()) return t("kyc.faceCameraInsecure");
  if (!navigator.mediaDevices?.getUserMedia) return t("kyc.faceCameraUnsupported");

  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") return t("kyc.faceCameraDenied");
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return t("kyc.faceCameraMissing");
  if (name === "NotReadableError" || name === "TrackStartError") return t("kyc.faceCameraBusy");
  if (name === "SecurityError") return t("kyc.faceCameraBlocked");
  return t("kyc.faceCameraError");
}

export function FaceVerificationCapture({ value, onChange, disabled }: FaceVerificationCaptureProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetectorLike | null>(null);
  const rafRef = useRef<number>(0);
  const countdownTimerRef = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>(value ? "preview" : "idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [faceReady, setFaceReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<"center" | "hold">("center");
  const [showUploadFallback, setShowUploadFallback] = useState(false);

  useEffect(() => {
    if (!value) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    setPhase("preview");
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const cleanupCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    setFaceReady(false);
  }, []);

  useEffect(() => () => cleanupCamera(), [cleanupCamera]);

  const watchFace = useCallback(() => {
    const tick = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => void tick());
        return;
      }

      try {
        if (!detectorRef.current && window.FaceDetector) {
          detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        }

        if (detectorRef.current) {
          const faces = await detectorRef.current.detect(videoRef.current);
          const face = faces[0];
          if (face) {
            const box = face.boundingBox;
            const vw = videoRef.current.videoWidth || 1;
            const vh = videoRef.current.videoHeight || 1;
            const cx = (box.x + box.width / 2) / vw;
            const cy = (box.y + box.height / 2) / vh;
            const size = Math.max(box.width / vw, box.height / vh);
            const ready = cx > 0.28 && cx < 0.72 && cy > 0.22 && cy < 0.72 && size > 0.18 && size < 0.72;
            setFaceReady(ready);
            setChallenge(ready ? "hold" : "center");
          } else {
            setFaceReady(false);
            setChallenge("center");
          }
        } else {
          setFaceReady(true);
          setChallenge("hold");
        }
      } catch {
        setFaceReady(true);
        setChallenge("hold");
      }

      rafRef.current = requestAnimationFrame(() => void tick());
    };

    rafRef.current = requestAnimationFrame(() => void tick());
  }, []);

  const attachStreamToVideo = useCallback(
    (stream: MediaStream, attempt = 0) => {
      const video = videoRef.current;
      if (!video) {
        if (attempt < 10) window.setTimeout(() => attachStreamToVideo(stream, attempt + 1), 50);
        else {
          setError(t("kyc.faceCameraError"));
          setPhase("error");
          setShowUploadFallback(true);
          cleanupCamera();
        }
        return;
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      void video
        .play()
        .then(() => watchFace())
        .catch(() => {
          setError(t("kyc.faceCameraError"));
          setPhase("error");
          setShowUploadFallback(true);
          cleanupCamera();
        });
    },
    [cleanupCamera, t, watchFace]
  );

  const startCamera = async () => {
    if (disabled) return;
    setError("");
    setShowUploadFallback(false);
    onChange(null);
    cleanupCamera();

    if (!isSecureCameraContext()) {
      setError(t("kyc.faceCameraInsecure"));
      setPhase("error");
      setShowUploadFallback(true);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("kyc.faceCameraUnsupported"));
      setPhase("error");
      setShowUploadFallback(true);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (firstError) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true }).catch(() => {
          throw firstError;
        });
      }

      streamRef.current = stream;
      setPhase("camera");
      setChallenge("center");
      setFaceReady(false);
      requestAnimationFrame(() => attachStreamToVideo(stream));
    } catch (err) {
      setError(mapCameraError(err, t));
      setPhase("error");
      setShowUploadFallback(true);
    }
  };

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    );
    if (!blob) {
      setError(t("kyc.faceCaptureFailed"));
      setPhase("camera");
      return;
    }

    cleanupCamera();
    onChange(new File([blob], `face-selfie-${Date.now()}.jpg`, { type: "image/jpeg" }));
    setPhase("preview");
  }, [cleanupCamera, onChange, t]);

  const beginCountdown = () => {
    if (!faceReady || disabled) return;
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    setPhase("countdown");
    setCountdown(3);
    let remaining = 3;
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownTimerRef.current) {
          window.clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        void captureFrame();
      }
    }, 700);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">{t("kyc.faceTitle")}</h3>
        <p className="mt-1 text-sm text-text-tertiary">{t("kyc.faceDesc")}</p>
      </div>

      <div
        className={cn(
          "relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-[#0a0a0b] shadow-lg",
          phase === "idle" || phase === "error" ? "min-h-[260px]" : "aspect-[3/4]"
        )}
      >
        {(phase === "camera" || phase === "countdown") && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 42% 52% at 50% 46%, transparent 54%, rgba(0,0,0,0.72) 56%)",
              }}
            />
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-[46%] h-[58%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 transition-colors",
                faceReady ? "border-green shadow-[0_0_0_1px_rgba(34,197,94,0.35)]" : "border-white/50"
              )}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-center">
              <p className="text-sm font-medium text-white">
                {phase === "countdown"
                  ? t("kyc.faceHoldStill")
                  : challenge === "hold"
                    ? t("kyc.faceReadyPrompt")
                    : t("kyc.faceCenterPrompt")}
              </p>
              {phase === "countdown" && (
                <p className="mt-2 text-4xl font-semibold text-green">{countdown}</p>
              )}
            </div>
          </>
        )}

        {phase === "preview" && previewUrl && (
          <img src={previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {(phase === "idle" || phase === "error") && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-green ring-1 ring-white/15">
              <Camera className="relative h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-white">{t("kyc.faceStartTitle")}</p>
            <p className="max-w-[16rem] text-xs leading-relaxed text-white/65">{t("kyc.faceStartDesc")}</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!file) return;
          if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
            setError(t("kyc.faceUploadType"));
            return;
          }
          if (file.size > 10 * 1024 * 1024) {
            setError(t("kyc.errorFileSize"));
            return;
          }
          cleanupCamera();
          onChange(file);
          setPhase("preview");
          setShowUploadFallback(false);
          setError("");
        }}
      />

      {error && (
        <div className="rounded-xl border border-red/25 bg-red/5 px-3 py-2.5 text-sm text-red">
          <p>{error}</p>
          {phase === "error" && <p className="mt-1 text-xs opacity-80">{t("kyc.faceCameraHelp")}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" || phase === "error" ? (
          <>
            <Button type="button" disabled={disabled} onClick={() => void startCamera()}>
              <Camera className="h-4 w-4" />
              {phase === "error" ? t("kyc.faceRetryCta") : t("kyc.faceStartCta")}
            </Button>
            {(showUploadFallback || phase === "error") && (
              <Button type="button" variant="outline" disabled={disabled} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {t("kyc.faceUploadFallback")}
              </Button>
            )}
          </>
        ) : null}

        {phase === "camera" ? (
          <>
            <Button type="button" disabled={disabled || !faceReady} onClick={beginCountdown}>
              <Camera className="h-4 w-4" />
              {t("kyc.faceCapture")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => {
                cleanupCamera();
                setPhase(value ? "preview" : "idle");
              }}
            >
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
          </>
        ) : null}

        {phase === "preview" && value ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-2 text-xs font-semibold text-green">
              <CheckCircle className="h-3.5 w-3.5" />
              {t("kyc.faceCaptured")}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void startCamera()}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t("kyc.faceRetake")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
