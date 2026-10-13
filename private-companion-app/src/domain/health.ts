import { isDay } from "./action-board.ts";
import { validateDietDetail, type DietDetail } from "./diet.ts";

export const HEALTH_PREFIX = "health:";
export const NUTRIENTS = ["calories", "protein", "carbs", "fat"] as const;
export type Nutrition = Record<(typeof NUTRIENTS)[number], number | null>;
export type Exercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  kg: number | null;
  note: string;
};
type Base = {
  version: 1;
  id: string;
  updatedAt: string;
  title: string;
  notes: string;
  archived: boolean;
};
export type Recipe = Base & {
  kind: "recipe";
  ingredients: string;
  instructions: string;
  servings: number;
  minutes: number | null;
  confidence: "learning" | "can-cook";
  tags: string;
  nutrition: Nutrition;
};
export type Workout = Base & {
  kind: "workout";
  day: string;
  activity: string;
  minutes: number | null;
  exercises: Exercise[];
};
export type FoodEntry = Base & {
  kind: "food";
  day: string;
  meal: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Other";
  portion: string;
  nutrition: Nutrition;
  recipeId: string | null;
  diet?: DietDetail;
};
export const CHECKIN_METRICS = {
  weight: { label: "Weight", unit: "kg", max: 1000 },
  waist: { label: "Waist", unit: "cm", max: 500 },
  sleep: { label: "Sleep", unit: "hours", max: 24 },
  energy: { label: "Energy", unit: "/ 5", max: 5 },
  mood: { label: "Mood", unit: "/ 5", max: 5 },
} as const;
export type CheckInMetric = keyof typeof CHECKIN_METRICS;
export type CheckIn = Base & {
  kind: "checkin";
  day: string;
  metrics: Record<CheckInMetric, number | null>;
  symptoms: string;
};
export type HealthRecord = Recipe | Workout | FoodEntry | CheckIn;
export const emptyNutrition = (): Nutrition => ({
  calories: null,
  protein: null,
  carbs: null,
  fat: null,
});
export function localHealthDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function newHealthRecord(
  kind: HealthRecord["kind"],
  id: string,
  day: string,
): HealthRecord {
  const base: Base = {
    version: 1,
    id,
    updatedAt: "",
    title: "",
    notes: "",
    archived: false,
  };
  if (kind === "checkin")
    return {
      ...base,
      kind,
      day,
      title: "Daily check-in",
      symptoms: "",
      metrics: {
        weight: null,
        waist: null,
        sleep: null,
        energy: null,
        mood: null,
      },
    };
  if (kind === "recipe")
    return {
      ...base,
      kind,
      ingredients: "",
      instructions: "",
      servings: 1,
      minutes: null,
      confidence: "learning",
      tags: "",
      nutrition: emptyNutrition(),
    };
  if (kind === "food")
    return {
      ...base,
      kind,
      day,
      meal: "Dinner",
      portion: "",
      recipeId: null,
      nutrition: emptyNutrition(),
    };
  return {
    ...base,
    kind,
    day,
    activity: "Strength",
    minutes: null,
    exercises: [],
  };
}
export function foodFromRecipe(
  recipe: Recipe,
  id: string,
  day: string,
  portions = 1,
): FoodEntry {
  if (!Number.isFinite(portions) || portions <= 0)
    throw Error("Enter a positive number of servings.");
  return {
    ...(newHealthRecord("food", id, day) as FoodEntry),
    title: recipe.title,
    recipeId: recipe.id,
    portion: `${portions} serving${portions === 1 ? "" : "s"}`,
    nutrition: Object.fromEntries(
      NUTRIENTS.map((key) => [
        key,
        recipe.nutrition[key] === null
          ? null
          : recipe.nutrition[key]! * portions,
      ]),
    ) as Nutrition,
  };
}
// Report only supplied numbers. A partial food log is not total daily intake.
export function nutritionSummary(entries: FoodEntry[]) {
  return Object.fromEntries(
    NUTRIENTS.map((key) => {
      const supplied = entries.filter((entry) => entry.nutrition[key] !== null);
      return [
        key,
        {
          total: supplied.length
            ? supplied.reduce((sum, entry) => sum + entry.nutrition[key]!, 0)
            : null,
          supplied: supplied.length,
          entries: entries.length,
        },
      ];
    }),
  ) as Record<
    (typeof NUTRIENTS)[number],
    { total: number | null; supplied: number; entries: number }
  >;
}
function text(value: unknown, max = 20000): value is string {
  return typeof value === "string" && value.length <= max;
}
function number(value: unknown, max = 1000000) {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= max)
  );
}
export function validateHealth(record: HealthRecord, today = localHealthDay()) {
  if (
    !record ||
    record.version !== 1 ||
    !/^[a-zA-Z0-9-]{1,100}$/.test(record.id) ||
    !text(record.updatedAt, 100) ||
    (record.updatedAt && !Number.isFinite(Date.parse(record.updatedAt))) ||
    !text(record.title, 300) ||
    !record.title.trim() ||
    !text(record.notes) ||
    typeof record.archived !== "boolean"
  )
    throw Error(
      "Give this record a name and keep the notes under 20,000 characters.",
    );
  if (record.kind !== "recipe" && (!isDay(record.day) || record.day > today))
    throw Error("Choose a valid date on or before today.");
  if (record.kind === "recipe" || record.kind === "food") {
    if (
      !record.nutrition ||
      NUTRIENTS.some((key) => !number(record.nutrition[key]))
    )
      throw Error(
        "Nutrition must be blank or a non-negative number. Use kcal for energy and grams for macros.",
      );
  }
  if (record.kind === "recipe") {
    if (
      !text(record.ingredients) ||
      !text(record.instructions) ||
      !text(record.tags, 1000) ||
      !["learning", "can-cook"].includes(record.confidence) ||
      !number(record.minutes, 10000) ||
      !Number.isFinite(record.servings) ||
      record.servings <= 0 ||
      record.servings > 10000
    )
      throw Error("Check the recipe servings, cooking time and instructions.");
  } else if (record.kind === "food") {
    if (record.diet !== undefined) validateDietDetail(record.diet, record.nutrition);
    if (
      !["Breakfast", "Lunch", "Dinner", "Snack", "Other"].includes(
        record.meal,
      ) ||
      !text(record.portion, 300) ||
      (record.recipeId !== null &&
        !/^[a-zA-Z0-9-]{1,100}$/.test(record.recipeId))
    )
      throw Error("Check the meal and portion.");
  } else if (record.kind === "checkin") {
    if (
      !record.metrics ||
      !text(record.symptoms, 2000) ||
      (Object.keys(CHECKIN_METRICS) as CheckInMetric[]).some((key) => {
        const value = record.metrics[key];
        return (
          !number(value, CHECKIN_METRICS[key].max) ||
          (value !== null &&
            (key === "energy" || key === "mood") &&
            (value < 1 || !Number.isInteger(value)))
        );
      })
    )
      throw Error(
        "Check measurements; sleep is 0–24 hours and energy and mood are whole numbers from 1 to 5.",
      );
    if (
      Object.values(record.metrics).every((value) => value === null) &&
      !record.symptoms.trim() &&
      !record.notes.trim()
    )
      throw Error(
        "Add a measurement, how you feel or a note to this check-in.",
      );
  } else if (record.kind === "workout") {
    if (
      !text(record.activity, 100) ||
      !number(record.minutes, 10000) ||
      !Array.isArray(record.exercises) ||
      record.exercises.length > 200 ||
      record.exercises.some(
        (e) =>
          !e ||
          !text(e.name, 300) ||
          !e.name.trim() ||
          !text(e.note, 2000) ||
          !number(e.kg, 10000) ||
          !number(e.sets, 10000) ||
          !number(e.reps, 10000) ||
          [e.sets, e.reps].some((v) => v !== null && !Number.isInteger(v)),
      )
    )
      throw Error(
        "Name each exercise; sets and reps must be whole numbers, and duration and load non-negative.",
      );
  } else throw Error("Unknown health record.");
  return record;
}

export function healthDayOffset(day: string, offset: number) {
  const date = new Date(day + "T12:00:00");
  date.setDate(date.getDate() + offset);
  return localHealthDay(date);
}
export function repeatHealthRecord(
  record: Workout | FoodEntry,
  id: string,
  day: string,
) {
  return {
    ...record,
    id,
    day,
    updatedAt: "",
    archived: false,
    ...(record.kind === "workout"
      ? { exercises: record.exercises.map((e) => ({ ...e })) }
      : { nutrition: { ...record.nutrition } }),
  } as Workout | FoodEntry;
}
// Windows end on the chosen date; archives and future records are excluded.
export function healthWindow(
  records: HealthRecord[],
  end: string,
  days: number,
) {
  const start = healthDayOffset(end, 1 - days);
  const dated = records.filter(
    (r): r is Workout | FoodEntry | CheckIn =>
      !r.archived && r.kind !== "recipe" && r.day >= start && r.day <= end,
  );
  const workouts = dated.filter((r): r is Workout => r.kind === "workout");
  const foods = dated.filter((r): r is FoodEntry => r.kind === "food");
  const checkins = dated
    .filter((r): r is CheckIn => r.kind === "checkin")
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) || a.updatedAt.localeCompare(b.updatedAt),
    );
  return {
    start,
    dated,
    workouts,
    foods,
    checkins,
    recordedDays: new Set(dated.map((r) => r.day)).size,
    minutes: workouts.some((r) => r.minutes !== null)
      ? workouts.reduce((sum, r) => sum + (r.minutes ?? 0), 0)
      : null,
  };
}
// One latest supplied observation per day; missing values are never filled in.
export function healthMetricSeries(checkins: CheckIn[], metric: CheckInMetric) {
  const daily = new Map<string, { day: string; value: number }>();
  [...checkins]
    .sort(
      (a, b) =>
        a.day.localeCompare(b.day) || a.updatedAt.localeCompare(b.updatedAt),
    )
    .forEach((r) => {
      if (r.metrics[metric] !== null)
        daily.set(r.day, { day: r.day, value: r.metrics[metric]! });
    });
  return [...daily.values()];
}
export function validateHealthChange(
  record: HealthRecord,
  existing: HealthRecord | null,
  today = localHealthDay(),
) {
  validateHealth(record, today);
  if ((existing?.updatedAt ?? "") !== record.updatedAt)
    throw Error(
      "This record changed in another window. Your draft is kept. Reload the saved record before trying again.",
    );
  if (existing && existing.kind !== record.kind)
    throw Error("Keep the original record type.");
}
