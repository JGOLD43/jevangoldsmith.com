import { fetch } from "expo/fetch";
import * as Crypto from "expo-crypto";
import {
  emptyDietNutrition,
  type FoodComponent,
  type DietNutrition,
} from "@/domain/diet";

type ReferenceFood = {
  id: string;
  name: string;
  nutrition: DietNutrition;
  portions: { label: string; amount: number }[];
};
const catalogue = require("@/assets/food-reference.json") as {
  provider: string;
  foods: ReferenceFood[];
};
export function findReferenceFoods(query: string): FoodComponent[] {
  const terms = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
  if (query.trim().length < 2) return [];
  return catalogue.foods
    .map((f) => ({
      f,
      score: terms.every((t) => f.name.toLowerCase().includes(t))
        ? (f.name.toLowerCase().startsWith(terms[0]) ? 0 : 1) +
          f.name.length / 1000
        : Infinity,
    }))
    .filter((r) => Number.isFinite(r.score))
    .sort((a, b) => a.score - b.score)
    .slice(0, 20)
    .map(({ f }) => ({
      id: Crypto.randomUUID(),
      name: f.name,
      brand: "",
      amount: 100,
      unit: "g",
      basisAmount: 100,
      nutrition: f.nutrition,
      portions: f.portions,
      source: {
        kind: "database",
        provider: catalogue.provider,
        recordId: f.id,
        url: "https://fdc.nal.usda.gov/food-details/" + f.id + "/nutrients",
      },
    }));
}
export function validFoodBarcode(code: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, place = 0; i >= 0; i--, place++)
    sum += Number(code[i]) * (place % 2 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}
export async function lookupFoodBarcode(
  code: string,
  signal: AbortSignal,
): Promise<FoodComponent> {
  code = code.replace(/\s/g, "");
  if (!validFoodBarcode(code))
    throw Error("Enter the printed barcode, including its check digit.");
  const response = await fetch(
    "https://world.openfoodfacts.org/api/v2/product/" +
      code +
      ".json?fields=code,product_name,brands,nutriments,nutrition_data_per",
    {
      signal,
      redirect: "error",
      headers: {
        Accept: "application/json",
        "User-Agent": "TridentDiet/1.0 (https://github.com/JGOLD43/theon)",
      },
    },
  );
  if (!response.ok)
    throw Error(
      "The food database could not be reached. Enter the label manually.",
    );
  if (Number(response.headers.get("content-length") || 0) > 2 * 1024 * 1024)
    throw Error("The food result was too large. Enter the label manually.");
  const text = await response.text();
  if (text.length > 2 * 1024 * 1024)
    throw Error("The food result was too large. Enter the label manually.");
  const data = JSON.parse(text),
    p = data.product;
  if (
    data.status !== 1 ||
    !p ||
    typeof p.product_name !== "string" ||
    !p.product_name.trim() ||
    typeof p.code !== "string" ||
    !validFoodBarcode(p.code) ||
    p.code.replace(/^0+/, "") !== code.replace(/^0+/, "")
  )
    throw Error("No matching pack was found. Enter its label manually.");
  const n = p.nutriments || {},
    num = (k: string) =>
      typeof n[k + "_100g"] === "number" &&
      Number.isFinite(n[k + "_100g"]) &&
      n[k + "_100g"] >= 0 &&
      n[k + "_100g"] <= 1000000
        ? (n[k + "_100g"] as number)
        : null;
  const kj = num("energy-kj") ?? num("energy"),
    sodium = num("sodium");
  return {
    id: Crypto.randomUUID(),
    name: p.product_name.slice(0, 300),
    brand: (Array.isArray(p.brands)
      ? p.brands.join(", ")
      : typeof p.brands === "string"
        ? p.brands
        : ""
    ).slice(0, 300),
    amount: 100,
    unit: p.nutrition_data_per === "100ml" ? "ml" : "g",
    basisAmount: 100,
    unitNeedsReview: true,
    nutrition: {
      calories: num("energy-kcal") ?? (kj === null ? null : kj / 4.184),
      protein: num("proteins"),
      carbs: num("carbohydrates"),
      fat: num("fat"),
      fibre: num("fiber"),
      sugar: num("sugars"),
      saturatedFat: num("saturated-fat"),
      sodium: sodium === null ? null : sodium * 1000,
    },
    source: {
      kind: "database",
      provider: "Open Food Facts · check your pack",
      recordId: code,
      url: "https://world.openfoodfacts.org/product/" + code,
      checkedAt: new Date().toISOString(),
    },
  };
}
export function manualFood(): FoodComponent {
  return {
    id: Crypto.randomUUID(),
    name: "",
    brand: "",
    amount: 100,
    unit: "g",
    basisAmount: 100,
    nutrition: emptyDietNutrition(),
    source: { kind: "manual", provider: "Values supplied by you" },
  };
}
