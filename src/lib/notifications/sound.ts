import { isSoundEnabled } from "./preferences";

const SOUND_URL = "/sounds/notification.mp3";
const DEDUPE_MS = 2000;

let audioEl: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;
let unlockBound = false;

const playedRecently = new Map<string, number>();

function cleanupDedupe() {
  const now = Date.now();
  for (const [key, ts] of playedRecently) {
    if (now - ts > DEDUPE_MS) playedRecently.delete(key);
  }
}

function shouldPlay(dedupeKey?: string, force = false): boolean {
  if (typeof window === "undefined" || !isSoundEnabled()) return false;
  if (force) return true;
  if (!dedupeKey) return true;

  cleanupDedupe();
  const last = playedRecently.get(dedupeKey);
  if (last && Date.now() - last < DEDUPE_MS) return false;
  playedRecently.set(dedupeKey, Date.now());
  return true;
}

function getAudioElement(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.preload = "auto";
    audioEl.volume = 0.65;
  }
  return audioEl;
}

async function getAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  audioCtx ??= new Ctx();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

async function playWithAudioElement(): Promise<boolean> {
  try {
    const el = getAudioElement();
    el.currentTime = 0;
    await el.play();
    return true;
  } catch {
    return false;
  }
}

async function playWebAudioChime(): Promise<void> {
  const ctx = await getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 784, start: 0, duration: 0.1, peak: 0.08 },
    { freq: 988, start: 0.08, duration: 0.11, peak: 0.065 },
    { freq: 1174.66, start: 0.16, duration: 0.2, peak: 0.055 },
  ];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.9, ctx.currentTime);
  master.connect(ctx.destination);

  for (const note of notes) {
    const now = ctx.currentTime + note.start;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, now);
    osc.connect(gain);
    gain.connect(master);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(note.peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.duration);

    osc.start(now);
    osc.stop(now + note.duration + 0.02);
  }
}

export function setupNotificationAudioUnlock() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;

  const unlock = () => {
    void getAudioContext();
    getAudioElement().load();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
}

export async function playNotificationSound(options?: { dedupeKey?: string; force?: boolean }) {
  const { dedupeKey, force = false } = options ?? {};
  if (!shouldPlay(dedupeKey, force)) return;

  const played = await playWithAudioElement();
  if (!played) {
    await playWebAudioChime();
  }
}
