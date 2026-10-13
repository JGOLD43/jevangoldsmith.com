// Nutrition is a supplied snapshot, never a diagnosis or an inferred target.
export const DIET_NUTRIENTS = [
  "calories",
  "protein",
  "carbs",
  "fat",
  "fibre",
  "sugar",
  "saturatedFat",
  "sodium",
] as const;
export type DietNutrient = (typeof DIET_NUTRIENTS)[number];
export type DietNutrition = Record<DietNutrient, number | null>;
export const DIET_LABELS: Record<DietNutrient, string> = {
  calories: "Energy",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
  fibre: "Fibre",
  sugar: "Sugar",
  saturatedFat: "Saturated fat",
  sodium: "Sodium",
};
export const dietUnit = (key: DietNutrient) =>
  key === "calories" ? "kcal" : key === "sodium" ? "mg" : "g";
export const emptyDietNutrition = (): DietNutrition =>
  Object.fromEntries(DIET_NUTRIENTS.map((key) => [key, null])) as DietNutrition;
export type FoodSource = {
  kind: "database" | "label" | "estimate" | "manual" | "recipe";
  provider: string;
  recordId?: string;
  url?: string;
  checkedAt?: string;
};
export type FoodComponent = {
  id: string;
  name: string;
  brand: string;
  amount: number;
  unit: "g" | "ml" | "serving";
  basisAmount: number;
  nutrition: DietNutrition;
  source: FoodSource;
  portions?: { label: string; amount: number }[];
  unitNeedsReview?: boolean;
  servingName?: string;
};
export type DietDetail = { version: 1; components: FoodComponent[] };
export type DietTemplate = {
  version: 1;
  id: string;
  updatedAt: string;
  title: string;
  components: FoodComponent[];
  archived: boolean;
};
export type DietSettings = {
  version: 1;
  id: "personal";
  updatedAt: string;
  goals: Record<"calories" | "protein" | "carbs" | "fat", number | null>;
};
export const DIET_TEMPLATE_PREFIX = "diet-template:";
export const DIET_SETTINGS_PREFIX = "diet-settings:";
export function componentNutrition(component: FoodComponent): DietNutrition {
  const factor = component.amount / component.basisAmount;
  return Object.fromEntries(
    DIET_NUTRIENTS.map((key) => [
      key,
      component.nutrition[key] === null
        ? null
        : component.nutrition[key]! * factor,
    ]),
  ) as DietNutrition;
}
export function sumComponents(components: FoodComponent[]) {
  return Object.fromEntries(
    DIET_NUTRIENTS.map((key) => {
      const supplied = components.filter((c) => c.nutrition[key] !== null);
      return [
        key,
        {
          total: supplied.length
            ? supplied.reduce((sum, c) => sum + componentNutrition(c)[key]!, 0)
            : null,
          supplied: supplied.length,
          entries: components.length,
        },
      ];
    }),
  ) as Record<
    DietNutrient,
    { total: number | null; supplied: number; entries: number }
  >;
}
export function detailNutrition(detail: DietDetail): DietNutrition {
  const totals = sumComponents(detail.components);
  return Object.fromEntries(
    DIET_NUTRIENTS.map((key) => [key, totals[key].total]),
  ) as DietNutrition;
}
export const formatNutrition = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("en-AU", {
        maximumFractionDigits: value >= 100 ? 0 : 1,
      }).format(value);
const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max;
const quantity = (value: unknown, max = 1000000) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value <= max;
export function validateComponents(components: FoodComponent[]) {
  if (
    !Array.isArray(components) ||
    !components.length ||
    components.length > 40
  )
    throw Error("Add between 1 and 40 foods to this meal.");
  const ids = new Set<string>();
  for (const c of components) {
    if (
      !c ||
      !text(c.id, 100) ||
      !/^[\w-]+$/.test(c.id) ||
      ids.has(c.id) ||
      !text(c.name, 300) ||
      !c.name.trim() ||
      !text(c.brand, 300)
    )
      throw Error("Give each food a name.");
    ids.add(c.id);
    if (
      c.servingName !== undefined &&
      (!text(c.servingName, 100) || !c.servingName.trim())
    )
      throw Error("Give this serving a short name or leave it blank.");
    if (c.unitNeedsReview !== undefined && c.unitNeedsReview !== false)
      throw Error(
        "Check whether your pack declares nutrition per 100 g or 100 ml before saving.",
      );
    if (
      !quantity(c.amount, 100000) ||
      c.amount <= 0 ||
      !quantity(c.basisAmount, 100000) ||
      c.basisAmount <= 0 ||
      !["g", "ml", "serving"].includes(c.unit)
    )
      throw Error(
        "Enter a positive amount and nutrition reference amount. Grams and millilitres cannot be interchanged.",
      );
    if (
      !c.nutrition ||
      DIET_NUTRIENTS.some(
        (k) => c.nutrition[k] !== null && !quantity(c.nutrition[k]),
      )
    )
      throw Error(
        "Nutrition must be blank or a non-negative number. Sodium is in milligrams.",
      );
    const s = c.source;
    if (
      !s ||
      !["database", "label", "estimate", "manual", "recipe"].includes(s.kind) ||
      !text(s.provider, 300) ||
      (s.recordId !== undefined && !text(s.recordId, 200)) ||
      (s.checkedAt !== undefined &&
        (!text(s.checkedAt, 100) || !Number.isFinite(Date.parse(s.checkedAt))))
    )
      throw Error("Check this food’s source.");
    if (
      s.url !== undefined &&
      (!text(s.url, 1000) ||
        !/^https:\/\/(fdc\.nal\.usda\.gov|world\.openfoodfacts\.org)\//.test(
          s.url,
        ))
    )
      throw Error("Choose a supported nutrition source link.");
    if (
      c.portions !== undefined &&
      (!Array.isArray(c.portions) ||
        c.portions.length > 30 ||
        c.portions.some(
          (p) =>
            !text(p.label, 200) || !quantity(p.amount, 100000) || p.amount <= 0,
        ))
    )
      throw Error("Check the serving sizes.");
    if (
      DIET_NUTRIENTS.some((k) => {
        const n = componentNutrition(c)[k];
        return n !== null && !quantity(n);
      })
    )
      throw Error(
        "This portion is too large. Check the amount and reference size.",
      );
  }
}
export function validateDietDetail(
  detail: DietDetail,
  nutrition: Record<string, number | null>,
) {
  if (!detail || detail.version !== 1)
    throw Error("This food entry has an unsupported format.");
  validateComponents(detail.components);
  const total = detailNutrition(detail);
  for (const k of ["calories", "protein", "carbs", "fat"] as const) {
    if (
      total[k] === null
        ? nutrition[k] !== null
        : nutrition[k] === null || Math.abs(total[k]! - nutrition[k]!) > 0.01
    )
      throw Error("The meal total changed. Review the food amounts again.");
  }
}
