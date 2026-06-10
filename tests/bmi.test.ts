import { describe, it, expect } from "vitest";
import { calculateBmi, categorizeBmi } from "@/lib/utils/bmi";

describe("calculateBmi", () => {
  it("computes BMI correctly for normal stats", () => {
    // 70kg at 175cm → 22.9
    const res = calculateBmi(175, 70);
    expect(res?.bmi).toBe(22.9);
    expect(res?.category).toBe("Normal");
  });

  it("returns null for missing or invalid inputs", () => {
    expect(calculateBmi(null, 70)).toBeNull();
    expect(calculateBmi(175, null)).toBeNull();
    expect(calculateBmi(0, 70)).toBeNull();
    expect(calculateBmi(175, 0)).toBeNull();
  });

  it("rounds to one decimal place", () => {
    const res = calculateBmi(180, 81);
    expect(res?.bmi).toBe(25);
  });
});

describe("categorizeBmi", () => {
  it("classifies each band correctly", () => {
    expect(categorizeBmi(17)).toBe("Underweight");
    expect(categorizeBmi(18.5)).toBe("Normal");
    expect(categorizeBmi(24.9)).toBe("Normal");
    expect(categorizeBmi(25)).toBe("Overweight");
    expect(categorizeBmi(29.9)).toBe("Overweight");
    expect(categorizeBmi(30)).toBe("Obese");
    expect(categorizeBmi(35)).toBe("Obese");
  });
});
