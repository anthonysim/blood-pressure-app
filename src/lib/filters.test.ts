import { describe, expect, it } from "vitest";
import { parseFilters, serializeFilters } from "./filters";

describe("parseFilters", () => {
  it("defaults to last 30 days with no other filters", () => {
    expect(parseFilters({})).toEqual({ range: "30d", period: [], category: [] });
  });

  it("parses repeated and comma-separated list params", () => {
    const f = parseFilters(new URLSearchParams("period=morning&period=night&category=stage1,stage2"));
    expect(f.period).toEqual(["morning", "night"]);
    expect(f.category).toEqual(["stage1", "stage2"]);
  });

  it("drops invalid values instead of throwing", () => {
    const f = parseFilters({ range: "forever", period: ["dawn"], sysMin: "abc", from: "2026-13" });
    expect(f).toEqual({ range: "30d", period: [], category: [], sysMin: undefined, from: undefined });
  });

  it("coerces numeric bounds and trims notes query", () => {
    expect(parseFilters({ sysMin: "130", diaMax: "90", q: "  coffee  " })).toMatchObject({
      sysMin: 130,
      diaMax: 90,
      q: "coffee",
    });
    expect(parseFilters({ q: "   " }).q).toBeUndefined();
  });
});

describe("serializeFilters", () => {
  it("round-trips and omits defaults", () => {
    const query = "range=custom&from=2026-11-01&to=2026-11-24&period=morning&sysMin=130&q=coffee";
    expect(serializeFilters(parseFilters(new URLSearchParams(query)))).toBe(query);
    expect(serializeFilters(parseFilters({}))).toBe("");
  });

  it("ignores from/to unless range is custom", () => {
    expect(serializeFilters(parseFilters({ range: "7d", from: "2026-11-01" }))).toBe("range=7d");
  });
});
