/**
 * Centralized case-insensitive name/text matching helpers.
 * Use these whenever comparing user-entered names (customers, commodities,
 * workers, roles, etc.) so that "John", "JOHN" and "john" are treated as
 * the same value across the app.
 */

/** Normalize a name/text value: trim + lowercase. Returns "" for null/undefined. */
export const normalizeName = (value?: string | null): string =>
  (value ?? "").trim().toLowerCase();

/** Case-insensitive equality check on two name/text values. */
export const namesEqual = (a?: string | null, b?: string | null): boolean =>
  normalizeName(a) === normalizeName(b);

/** Case-insensitive "includes" check (useful for search filters). */
export const nameIncludes = (haystack?: string | null, needle?: string | null): boolean =>
  normalizeName(haystack).includes(normalizeName(needle));
