import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it("unlocks the alarm during the user's start gesture", async () => {
  const resume = vi.fn().mockResolvedValue(undefined);
  class FakeAudioContext {
    state = "suspended";
    resume = resume;
  }
  vi.stubGlobal("window", { AudioContext: FakeAudioContext });

  const { preparePhaseEndCue } = await import("./sound");
  preparePhaseEndCue();

  expect(resume).toHaveBeenCalledOnce();
});

it("plays a clear four-second alarm-clock pattern", async () => {
  const starts: number[] = [];
  const stops: number[] = [];
  const peaks: number[] = [];
  const waveforms: string[] = [];
  class FakeAudioContext {
    state = "running";
    currentTime = 10;
    destination = {};
    createOscillator() {
      const oscillator = {
        type: "sine",
        frequency: { value: 0 },
        connect: (gain: unknown) => gain,
        start(at: number) {
          starts.push(at);
          waveforms.push(this.type);
        },
        stop: (at: number) => stops.push(at),
      };
      return oscillator;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: (value: number) => {
            if (value > 0.01) peaks.push(value);
          },
        },
        connect: () => {},
      };
    }
  }
  vi.stubGlobal("window", { AudioContext: FakeAudioContext });

  const { playPhaseEndCue } = await import("./sound");
  playPhaseEndCue();

  expect(starts.length).toBe(6);
  expect(stops.at(-1)! - starts[0]).toBeCloseTo(4);
  expect(Math.max(...peaks)).toBeGreaterThanOrEqual(0.5);
  expect(waveforms).toEqual(Array(6).fill("square"));
});
