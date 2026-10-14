import type {BlockDetails} from "./types";
export const cardioTypes = ["stationary_bike", "outdoor_bike", "elliptical", "rowing", "stepper", "walking", "jump_rope", "other"] as const;
export type CardioType = typeof cardioTypes[number];
export const cardioLabels: Record<CardioType, string> = {
  stationary_bike: "Sobni bicikl", outdoor_bike: "Bicikl napolju", elliptical: "Eliptik",
  rowing: "Veslački ergometar", stepper: "Steper / stepenice", walking: "Hodanje",
  jump_rope: "Vijača", other: "Ostali kardio",
};
export const cardioResultKeys = ["resistance", "incline", "floors", "averageHeartRate", "calories"] as const;
export function cardioName(details: Pick<BlockDetails, "cardioType" | "cardioName">): string {
  return details.cardioType === "other" ? details.cardioName?.trim() || cardioLabels.other : details.cardioType ? cardioLabels[details.cardioType] : "Kardio";
}
