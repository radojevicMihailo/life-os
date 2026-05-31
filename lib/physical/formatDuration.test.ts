import { describe, expect, it } from "vitest";
import { mmSsToSeconds, secondsToMmSs } from "./formatDuration";

describe("secondsToMmSs", () => {
  it("zero", () => expect(secondsToMmSs(0)).toBe("0:00"));
  it("under a minute", () => expect(secondsToMmSs(7)).toBe("0:07"));
  it("exactly a minute", () => expect(secondsToMmSs(60)).toBe("1:00"));
  it("multi-digit minutes", () => expect(secondsToMmSs(605)).toBe("10:05"));
  it("hours fold into minutes", () => expect(secondsToMmSs(3725)).toBe("62:05"));
  it("negative input clamps to zero", () => expect(secondsToMmSs(-5)).toBe("0:00"));
});

describe("mmSsToSeconds", () => {
  it("plain integer string returns seconds", () => expect(mmSsToSeconds("45")).toBe(45));
  it("m:ss form", () => expect(mmSsToSeconds("5:07")).toBe(307));
  it("mm:ss form", () => expect(mmSsToSeconds("12:30")).toBe(750));
  it("rejects garbage", () => expect(mmSsToSeconds("abc")).toBeNull());
  it("rejects seconds >= 60", () => expect(mmSsToSeconds("1:75")).toBeNull());
  it("empty string is null", () => expect(mmSsToSeconds("")).toBeNull());
});
