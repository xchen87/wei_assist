import { describe, expect, it } from "vitest";
import { formatShortName, householdKeyword } from "./name";

describe("formatShortName", () => {
  it("abbreviates the given name", () => {
    expect(formatShortName("Dana Whitfield")).toBe("D. Whitfield");
  });

  it("keeps every name after the first", () => {
    expect(formatShortName("Inés María Okonjo")).toBe("I. María Okonjo");
  });

  it("leaves a single name alone", () => {
    expect(formatShortName("Prince")).toBe("Prince");
    expect(formatShortName("")).toBe("");
  });
});

describe("householdKeyword", () => {
  it("keeps the family name and drops the generic tail", () => {
    expect(householdKeyword("Achebe Household")).toBe("Achebe");
    expect(householdKeyword("Alvarez Family Trust")).toBe("Alvarez");
  });

  it("keeps a hyphenated family name whole", () => {
    expect(householdKeyword("Chen–Okafor Household")).toBe("Chen–Okafor");
  });

  /** Without this the Whitakers shorten to "The", which names nobody. */
  it("drops a leading article before taking the first word", () => {
    expect(householdKeyword("The Whitakers")).toBe("Whitakers");
    expect(householdKeyword("the whitakers")).toBe("whitakers");
  });

  it("does not mistake a name that merely starts with those letters", () => {
    expect(householdKeyword("Theodorou Household")).toBe("Theodorou");
  });

  it("copes with a one-word name, extra spaces and an empty string", () => {
    expect(householdKeyword("Ramirez")).toBe("Ramirez");
    expect(householdKeyword("  Ghosh   Household ")).toBe("Ghosh");
    expect(householdKeyword("")).toBe("");
    expect(householdKeyword("The")).toBe("The");
  });
});
