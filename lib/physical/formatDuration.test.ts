import { describe, expect, it } from "vitest";
import {
  hhmmssToSeconds,
  mmSsToSeconds,
  secondsToHhmmss,
  secondsToMmSs,
} from "./formatDuration";

describe("secondsToMmSs", () => {
  it("zero", () => expect(secondsToMmSs(0)).toBe("0:00"));
  it("under a minute", () => expect(secondsToMmSs(7)).toBe("0:07"));
  it("exactly a minute", () => expect(secondsToMmSs(60)).toBe("1:00"));
  it("multi-digit minutes", () => expect(secondsToMmSs(605)).toBe("10:05"));
  it("hours fold into minutes", () => expect(secondsToMmSs(3725)).toBe("62:05"));
  it("negative input clamps to zero", () => expect(secondsToMmSs(-5)).toBe("0:00"));
});

describe("mmSsToSeconds", () => {
  it("m:ss form", () => expect(mmSsToSeconds("5:07")).toBe(307));
  it("mm:ss form", () => expect(mmSsToSeconds("12:30")).toBe(750));
  it("rejects garbage", () => expect(mmSsToSeconds("abc")).toBeNull());
  it("rejects plain integer", () => expect(mmSsToSeconds("45")).toBeNull());
  it("rejects seconds >= 60", () => expect(mmSsToSeconds("1:75")).toBeNull());
  it("empty string is null", () => expect(mmSsToSeconds("")).toBeNull());
});

describe("secondsToHhmmss", () => {
  it("zero", () => expect(secondsToHhmmss(0)).toBe("00:00:00"));
  it("under a minute", () => expect(secondsToHhmmss(7)).toBe("00:00:07"));
  it("under an hour", () => expect(secondsToHhmmss(605)).toBe("00:10:05"));
  it("with hours", () => expect(secondsToHhmmss(3725)).toBe("01:02:05"));
  it("two-digit hours", () => expect(secondsToHhmmss(36000)).toBe("10:00:00"));
});

describe("hhmmssToSeconds", () => {
  it("h:mm:ss form", () => expect(hhmmssToSeconds("1:02:05")).toBe(3725));
  it("zero hours", () => expect(hhmmssToSeconds("0:10:05")).toBe(605));
  it("rejects mm:ss form", () => expect(hhmmssToSeconds("12:30")).toBeNull());
  it("rejects minutes >= 60", () => expect(hhmmssToSeconds("1:60:00")).toBeNull());
  it("rejects seconds >= 60", () => expect(hhmmssToSeconds("1:00:60")).toBeNull());
  it("empty string is null", () => expect(hhmmssToSeconds("")).toBeNull());
});
