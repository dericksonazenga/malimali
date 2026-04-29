// Items sold under "Special" are physically taken from "Heavy" stock.
// Buying price (cost basis) for a Special sale = Heavy's weighted-average buy price.
// Selling price is always typed manually by the user.
export const SPECIAL_COMMODITY = "Special";
export const SPECIAL_SOURCE_COMMODITY = "Heavy";

export const isSpecialCommodity = (name?: string | null) =>
  (name || "").trim().toLowerCase() === SPECIAL_COMMODITY.toLowerCase();

/** Returns the commodity whose stock should actually move when this label is sold. */
export const resolveStockCommodity = (name?: string | null) =>
  isSpecialCommodity(name) ? SPECIAL_SOURCE_COMMODITY : (name || "");
