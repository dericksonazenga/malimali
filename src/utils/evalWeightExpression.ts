/**
 * Safely evaluate a simple math expression containing numbers, +, -, *
 * Returns the computed result or 0 if invalid.
 * Examples: "1+1-1*2" → evaluates using standard math precedence
 *           "50+30" → 80
 *           "100*2" → 200
 */
export function evalWeightExpression(expr: string): number {
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  // Only allow digits, decimal points, +, -, *, spaces
  if (!/^[\d\s+\-*.]+$/.test(trimmed)) return parseFloat(trimmed) || 0;

  try {
    // Use Function constructor to safely evaluate simple math
    const result = new Function(`"use strict"; return (${trimmed});`)();
    if (typeof result === "number" && isFinite(result)) {
      return Math.max(0, result);
    }
    return 0;
  } catch {
    return parseFloat(trimmed) || 0;
  }
}

/**
 * Check if a string contains math operators (+, -, *)
 */
export function hasMathOperators(expr: string): boolean {
  return /[+\-*]/.test(expr.replace(/^-/, "")); // ignore leading negative
}
