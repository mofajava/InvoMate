import { describe, expect, it } from "vitest";
import { isCloudNewer } from "./drive";

describe("isCloudNewer", () => {
  it("treats a higher Drive version as newer", () => {
    expect(
      isCloudNewer({ version: "12", modifiedTime: "2026-01-01T00:00:00.000Z" }, { version: "11", modifiedTime: "2026-01-02T00:00:00.000Z" }),
    ).toBe(true);
    expect(
      isCloudNewer({ version: "11", modifiedTime: "2026-01-02T00:00:00.000Z" }, { version: "12", modifiedTime: "2026-01-01T00:00:00.000Z" }),
    ).toBe(false);
  });

  it("treats the same version as not newer so this device can save", () => {
    expect(
      isCloudNewer({ version: "8", modifiedTime: "2026-01-01T00:00:00.000Z" }, { version: "8", modifiedTime: "2026-01-01T00:00:00.000Z" }),
    ).toBe(false);
  });

  it("falls back to modifiedTime when version is missing", () => {
    expect(
      isCloudNewer({ version: "", modifiedTime: "2026-08-26T10:00:00.000Z" }, { modifiedTime: "2026-08-26T09:00:00.000Z" }),
    ).toBe(true);
    expect(
      isCloudNewer({ version: "", modifiedTime: "2026-08-26T09:00:00.000Z" }, { modifiedTime: "2026-08-26T10:00:00.000Z" }),
    ).toBe(false);
  });

  it("does not block save when this device has no known revision yet", () => {
    expect(isCloudNewer({ version: "3", modifiedTime: "2026-08-26T10:00:00.000Z" }, {})).toBe(false);
  });
});
