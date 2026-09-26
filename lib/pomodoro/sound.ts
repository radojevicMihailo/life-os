// lib/pomodoro/sound.ts
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function beepAt(audio: AudioContext, when: number, frequency: number): void {
  const durationSec = 0.4;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.55, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);
  osc.connect(gain).connect(audio.destination);
  osc.start(when);
  osc.stop(when + durationSec);
}

export function preparePhaseEndCue(): void {
  const audio = getCtx();
  if (audio?.state === "suspended") {
    void audio.resume();
  }
}

export function playPhaseEndCue(): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") {
    void audio.resume();
  }
  const now = audio.currentTime;
  for (let repeat = 0; repeat < 3; repeat += 1) {
    const pairStart = now + repeat * 1.5;
    beepAt(audio, pairStart, 784);
    beepAt(audio, pairStart + 0.6, 988);
  }
}
