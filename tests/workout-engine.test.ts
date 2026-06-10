import { describe, it, expect } from "vitest";
import { scoreTemplate, selectTemplate } from "@/lib/workout-engine";
import type { TemplateCandidate } from "@/lib/workout-engine";

const T = (over: Partial<TemplateCandidate>): TemplateCandidate => ({
  id: over.key ?? "id",
  key: over.key ?? "k",
  goal: "muscle_gain",
  experience: "beginner",
  gender: "any",
  training_days: 3,
  title: "t",
  ...over,
});

describe("scoreTemplate", () => {
  it("rewards an exact match the most", () => {
    const crit = { goal: "muscle_gain", experience: "beginner", gender: "male", trainingDays: 3 } as const;
    const exact = scoreTemplate(crit, T({ goal: "muscle_gain", experience: "beginner", gender: "any", training_days: 3 }));
    const off = scoreTemplate(crit, T({ goal: "muscle_gain", experience: "advanced", gender: "any", training_days: 5 }));
    expect(exact.score).toBeGreaterThan(off.score);
  });

  it("disqualifies templates outside the goal family", () => {
    const crit = { goal: "muscle_gain", experience: "beginner", gender: "male", trainingDays: 3 } as const;
    // weight_loss is NOT in muscle_gain's family
    const res = scoreTemplate(crit, T({ goal: "weight_loss" }));
    expect(res.score).toBe(-Infinity);
  });

  it("accepts a related goal as fallback (weight_loss ⇄ fat_loss)", () => {
    const crit = { goal: "weight_loss", experience: "beginner", gender: "female", trainingDays: 3 } as const;
    const res = scoreTemplate(crit, T({ goal: "fat_loss", experience: "beginner", gender: "any", training_days: 3 }));
    expect(res.score).toBeGreaterThan(0);
  });

  it("prefers a gender-specific template over 'any' when it matches", () => {
    const crit = { goal: "muscle_gain", experience: "beginner", gender: "female", trainingDays: 3 } as const;
    const female = scoreTemplate(crit, T({ gender: "female" }));
    const any = scoreTemplate(crit, T({ gender: "any" }));
    expect(female.score).toBeGreaterThan(any.score);
  });

  it("penalizes training-day distance", () => {
    const crit = { goal: "muscle_gain", experience: "beginner", gender: "male", trainingDays: 3 } as const;
    const close = scoreTemplate(crit, T({ training_days: 4 }));
    const far = scoreTemplate(crit, T({ training_days: 6 }));
    expect(close.score).toBeGreaterThan(far.score);
  });
});

describe("selectTemplate", () => {
  const catalog: TemplateCandidate[] = [
    T({ key: "mg_beg_any_3", goal: "muscle_gain", experience: "beginner", gender: "any", training_days: 3 }),
    T({ key: "mg_int_any_4", goal: "muscle_gain", experience: "intermediate", gender: "any", training_days: 4 }),
    T({ key: "fl_beg_any_3", goal: "fat_loss", experience: "beginner", gender: "any", training_days: 3 }),
  ];

  it("returns the exact template and flags it exact", () => {
    const res = selectTemplate({ goal: "muscle_gain", experience: "beginner", gender: "male", trainingDays: 3 }, catalog);
    expect(res?.template.key).toBe("mg_beg_any_3");
    expect(res?.exact).toBe(true);
  });

  it("falls back to the nearest template when no exact exists", () => {
    const res = selectTemplate({ goal: "muscle_gain", experience: "intermediate", gender: "male", trainingDays: 5 }, catalog);
    expect(res?.template.key).toBe("mg_int_any_4");
    expect(res?.exact).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const crit = { goal: "fat_loss", experience: "beginner", gender: "female", trainingDays: 3 } as const;
    const a = selectTemplate(crit, catalog);
    const b = selectTemplate(crit, catalog);
    expect(a?.template.key).toBe(b?.template.key);
    expect(a?.template.key).toBe("fl_beg_any_3");
  });

  it("returns null when no goal-family match exists", () => {
    const onlyStrength = [T({ key: "x", goal: "strength_training" })];
    // weight_loss family = {weight_loss, fat_loss, general_fitness} — excludes strength_training
    const res = selectTemplate({ goal: "weight_loss", experience: "beginner", gender: "male", trainingDays: 3 }, onlyStrength);
    expect(res).toBeNull();
  });

  it("returns null for an empty catalog", () => {
    expect(selectTemplate({ goal: "muscle_gain", experience: "beginner", gender: "male", trainingDays: 3 }, [])).toBeNull();
  });
});
