/**
 * BMI utilities. BMI is a *supporting* metric only — fitness goals remain the
 * primary focus across the product. Pure functions, unit-tested.
 */

export type BmiCategory = "Underweight" | "Normal" | "Overweight" | "Obese";

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
}

/** Compute BMI from height (cm) and weight (kg). Returns null if inputs invalid. */
export function calculateBmi(heightCm: number | null | undefined, weightKg: number | null | undefined): BmiResult | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const meters = heightCm / 100;
  const raw = weightKg / (meters * meters);
  const bmi = Math.round(raw * 10) / 10;
  return { bmi, category: categorizeBmi(bmi) };
}

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/** Tailwind-friendly tone token per category, for badges. */
export function bmiTone(category: BmiCategory): "amber" | "emerald" | "orange" | "red" {
  switch (category) {
    case "Underweight":
      return "amber";
    case "Normal":
      return "emerald";
    case "Overweight":
      return "orange";
    case "Obese":
      return "red";
  }
}
