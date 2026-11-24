import { describe, expect, it } from "vitest";
import { classify, periodForHour } from "./bp";

describe("classify", () => {
  it.each([
    [119, 79, "normal"],
    [120, 79, "elevated"],
    [129, 79, "elevated"],
    [130, 70, "stage1"],
    [119, 80, "stage1"],
    [139, 89, "stage1"],
    [140, 70, "stage2"],
    [110, 90, "stage2"],
    [180, 120, "stage2"],
    [181, 80, "crisis"],
    [150, 121, "crisis"],
  ] as const)("%i/%i → %s", (sys, dia, expected) => {
    expect(classify(sys, dia)).toBe(expected);
  });
});

describe("periodForHour", () => {
  it.each([
    [0, "morning"],
    [10, "morning"],
    [11, "noon"],
    [16, "noon"],
    [17, "night"],
    [23, "night"],
  ] as const)("hour %i → %s", (hour, expected) => {
    expect(periodForHour(hour)).toBe(expected);
  });
});
