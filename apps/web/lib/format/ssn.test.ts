import { describe, expect, it } from "vitest";
import { formatSsn, isCompleteSsn, maskSsn, ssnDigits } from "./ssn";

describe("formatSsn", () => {
  it("adds the dashes as the digits arrive", () => {
    expect(formatSsn("")).toBe("");
    expect(formatSsn("123")).toBe("123");
    expect(formatSsn("1234")).toBe("123-4");
    expect(formatSsn("12345")).toBe("123-45");
    expect(formatSsn("123456")).toBe("123-45-6");
    expect(formatSsn("123456789")).toBe("123-45-6789");
  });

  it("never shows more than nine digits", () => {
    expect(formatSsn("1234567890123")).toBe("123-45-6789");
  });
});

describe("ssnDigits", () => {
  it("keeps only digits, capped at nine", () => {
    expect(ssnDigits("123-45-6789")).toBe("123456789");
    expect(ssnDigits("123 45 6789")).toBe("123456789");
    expect(ssnDigits("abc")).toBe("");
    expect(ssnDigits("1234567890123")).toBe("123456789");
  });
});

/**
 * The invariant the field broke.
 *
 * Whatever the input displays has to come back out as the same digits, or
 * typing destroys what is already there. The old field masked by
 * replacing each character with a bullet, so the displayed value held no
 * digits at all: every keystroke, the handler stripped the bullets and
 * kept only the character that had just arrived. Nine keystrokes stored
 * one digit.
 */
describe("display round-trips back to the same digits", () => {
  const typed = "123456789";

  it("survives the formatted display at every length", () => {
    for (let i = 0; i <= typed.length; i++) {
      const digits = typed.slice(0, i);
      expect(ssnDigits(formatSsn(digits))).toBe(digits);
    }
  });

  it("accumulates a digit at a time, the way typing does", () => {
    let stored = "";
    for (const key of typed) {
      // What the browser hands the handler: what was on screen, plus the
      // new keystroke at the caret.
      stored = ssnDigits(formatSsn(stored) + key);
    }
    expect(stored).toBe(typed);
    expect(formatSsn(stored)).toBe("123-45-6789");
  });

  /** The bug, pinned: a display carrying no digits loses everything. */
  it("shows why a bullet-masked display cannot be fed back", () => {
    let stored = "";
    for (const key of typed) {
      const bulletDisplay = stored.replace(/./g, "•");
      stored = ssnDigits(bulletDisplay + key);
    }
    expect(stored).toBe("9");
    expect(stored).not.toBe(typed);
  });
});

describe("isCompleteSsn", () => {
  it("wants all nine", () => {
    expect(isCompleteSsn("123456789")).toBe(true);
    expect(isCompleteSsn("12345678")).toBe(false);
    expect(isCompleteSsn("")).toBe(false);
  });
});

describe("maskSsn", () => {
  it("shows the last four and never the rest", () => {
    expect(maskSsn("123456789")).toBe("•••-••-6789");
    expect(maskSsn("123456789")).not.toContain("123");
  });

  it("says so when there is nothing, or not enough", () => {
    expect(maskSsn("")).toBe("—");
    expect(maskSsn("1234")).toBe("Incomplete");
  });
});
