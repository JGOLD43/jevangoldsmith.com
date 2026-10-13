import { isDay } from "./action-board";
import type { FoodEntry } from "./health";

export const FOOD_CAPTURE_PREFIX = "diet-capture:";
export type FoodCapture = {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  day: string;
  meal: FoodEntry["meal"];
  mode: "meal" | "label";
  photo: string | null;
  description: string;
  status: "pending" | "reviewed" | "discarded";
  foodEntryId?: string;
};
export function validateFoodCapture(value: unknown): asserts value is FoodCapture {
  const capture = value as FoodCapture;
  if (
    !capture ||
    capture.version !== 1 ||
    typeof capture.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(capture.id) ||
    typeof capture.createdAt !== "string" ||
    !Number.isFinite(Date.parse(capture.createdAt)) ||
    typeof capture.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(capture.updatedAt)) ||
    !isDay(capture.day) ||
    !["Breakfast", "Lunch", "Dinner", "Snack", "Other"].includes(
      capture.meal,
    ) ||
    !["meal", "label"].includes(capture.mode) ||
    !["pending", "reviewed", "discarded"].includes(capture.status) ||
    typeof capture.description !== "string" ||
    capture.description.length > 8000
  )
    throw Error(
      "This food capture is incomplete. Please choose the photo again.",
    );
  if (capture.status === "pending") {
    if (
      (capture.photo !== null &&
        (typeof capture.photo !== "string" ||
          capture.photo.length > 900000 ||
          !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(capture.photo))) ||
      (!capture.photo && !capture.description.trim())
    )
      throw Error("Choose a smaller JPEG food photo.");
  } else if (
    capture.photo !== null ||
    (capture.status === "reviewed" && capture.foodEntryId !== capture.id)
  ) {
    throw Error("This capture has an invalid review receipt.");
  }
}
