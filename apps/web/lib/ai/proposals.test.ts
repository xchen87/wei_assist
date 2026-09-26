import { describe, expect, it } from "vitest";
import { defaultMeetingTitle, parseInstant, parseMeetingFields, parseTaskFields } from "./proposals";

const now = new Date("2026-09-26T12:00:00Z");

describe("parseMeetingFields", () => {
  it("accepts a well-formed proposal and derives the end time", () => {
    const r = parseMeetingFields({ kind: "Review", starts_at: "2026-09-29T14:00:00Z", duration_min: 45, location: "Video", reason: "Review is 56d overdue." }, now);
    expect(r).toMatchObject({ ok: true, value: { meetingKind: "Review", location: "Video", note: null, title: null } });
    if (r.ok) expect(r.value.endsAt.toISOString()).toBe("2026-09-29T14:45:00.000Z");
  });
  it("rejects the past, unknown kinds, bad locations, missing reasons and overlong notes", () => {
    const ok = { kind: "Review", starts_at: "2026-09-29T14:00:00Z", reason: "r" };
    expect(parseMeetingFields({ ...ok, starts_at: "2026-09-25T14:00:00Z" }, now)).toMatchObject({ ok: false, error: "starts_at is in the past." });
    expect(parseMeetingFields({ ...ok, kind: "Lunch" }, now).ok).toBe(false);
    expect(parseMeetingFields({ ...ok, location: "Mars" }, now).ok).toBe(false);
    expect(parseMeetingFields({ ...ok, reason: "  " }, now)).toMatchObject({ ok: false, error: expect.stringContaining("reason is required") });
    expect(parseMeetingFields({ ...ok, note: "x".repeat(1201) }, now).ok).toBe(false);
    expect(parseMeetingFields({ ...ok, duration_min: 5 }, now).ok).toBe(false);
  });
  it("defaults duration to 60 minutes", () => {
    const r = parseMeetingFields({ kind: "Check-in", starts_at: "2026-09-29T14:00:00Z", reason: "r" }, now);
    if (r.ok) expect(r.value.endsAt.getTime() - r.value.startsAt.getTime()).toBe(3_600_000);
  });
});

describe("parseTaskFields", () => {
  it("accepts a task due today, defaults priority, and rejects a past due date", () => {
    expect(parseTaskFields({ title: "Send IPS", due_at: "2026-09-26", reason: "r" }, now)).toMatchObject({ ok: true, value: { priority: "normal" } });
    expect(parseTaskFields({ title: "Send IPS", due_at: "2026-09-25", reason: "r" }, now)).toMatchObject({ ok: false, error: expect.stringContaining("in the past") });
    expect(parseTaskFields({ title: "Send IPS", due_at: "next week", reason: "r" }, now).ok).toBe(false);
    expect(parseTaskFields({ title: "", reason: "r" }, now)).toMatchObject({ ok: false, error: "title is required." });
    expect(parseTaskFields({ title: "T", priority: "urgent", reason: "r" }, now).ok).toBe(false);
  });
  it("allows no due date", () => {
    expect(parseTaskFields({ title: "T", reason: "r" }, now)).toMatchObject({ ok: true, value: { dueAt: null } });
  });
});

describe("defaultMeetingTitle", () => {
  it("names the meeting the way the seed does", () => {
    expect(defaultMeetingTitle("Ramirez Household", "Review")).toBe("Ramirez Household — review");
    expect(defaultMeetingTitle("Yoon Household", "Proposal")).toBe("Yoon Household — proposal walkthrough");
  });
});

describe("parseInstant", () => {
  it("reads a zone-less time as UTC, never as the server's local zone", () => {
    expect(parseInstant("2026-09-28T13:00:00")?.toString()).toBe(new Date("2026-09-28T13:00:00Z").toString());
    expect(parseInstant("2026-09-28T13:00")?.toString()).toBe(new Date("2026-09-28T13:00:00Z").toString());
    expect(parseInstant("2026-09-28")?.toString()).toBe(new Date("2026-09-28T00:00:00Z").toString());
    expect(parseInstant("2026-09-28T13:00:00.000Z")?.toString()).toBe(new Date("2026-09-28T13:00:00Z").toString());
  });
  it("refuses an explicit non-UTC offset instead of converting it", () => {
    expect(parseInstant("2026-09-28T13:00:00-07:00")).toBe("offset");
    expect(parseInstant("2026-09-28T13:00:00+00:00")?.toString()).toBe(new Date("2026-09-28T13:00:00Z").toString());
  });
  it("rejects anything that is not a date-time", () => {
    expect(parseInstant("next Monday")).toBeNull();
    expect(parseInstant("2026-13-40T10:00:00Z")).toBeNull();
    expect(parseInstant(42)).toBeNull();
  });
  it("the bug as reported: a 1pm slot proposed without its Z stays 1pm", () => {
    const r = parseMeetingFields({ kind: "Review", starts_at: "2026-09-28T13:00:00", reason: "r" }, now);
    expect(r.ok && r.value.startsAt.toISOString()).toBe("2026-09-28T13:00:00.000Z");
    expect(parseMeetingFields({ kind: "Review", starts_at: "2026-09-28T13:00:00-07:00", reason: "r" }, now)).toMatchObject({ ok: false, error: expect.stringContaining("offset") });
  });
});
