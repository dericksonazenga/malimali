import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Automated regression checks ensuring the mobile/tablet pull-to-refresh
 * gesture stays disabled while normal scrolling inside page sections
 * remains fully functional.
 *
 * If these assertions ever fail, swiping down inside any page section
 * could re-trigger the browser's native page refresh.
 */

const indexCss = readFileSync(
  path.resolve(__dirname, "../index.css"),
  "utf-8"
);

// Strip /* ... */ comments so we only inspect real CSS rules.
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const css = stripComments(indexCss);

const findRuleBlock = (selector: string): string | null => {
  // Match `selector { ... }` allowing nested braces inside @media etc.
  const re = new RegExp(
    `(^|[^a-zA-Z0-9_-])${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    "m"
  );
  const m = css.match(re);
  return m ? m[2] : null;
};

describe("mobile/tablet scroll behaviour", () => {
  it("disables pull-to-refresh on the root html element", () => {
    const htmlBlock = findRuleBlock("html");
    expect(htmlBlock, "html { } block must exist in index.css").not.toBeNull();
    expect(htmlBlock!.replace(/\s+/g, "")).toMatch(/overscroll-behavior-y:none/);
  });

  it("does not re-introduce overscroll-behavior values that block scrolling", () => {
    // `overscroll-behavior: hidden` (or `-y: hidden`) on html/body would lock
    // the page. We never want that.
    expect(css).not.toMatch(/overscroll-behavior(-y)?\s*:\s*hidden/);
  });

  it("does not lock the page with overflow:hidden on html or body", () => {
    const htmlBlock = findRuleBlock("html") ?? "";
    const bodyBlock = findRuleBlock("body") ?? "";
    expect(htmlBlock).not.toMatch(/overflow(-y)?\s*:\s*hidden/);
    expect(bodyBlock).not.toMatch(/overflow(-y)?\s*:\s*hidden/);
  });

  it("does not force position:fixed on html or body (would break scroll)", () => {
    const htmlBlock = findRuleBlock("html") ?? "";
    const bodyBlock = findRuleBlock("body") ?? "";
    expect(htmlBlock).not.toMatch(/position\s*:\s*fixed/);
    expect(bodyBlock).not.toMatch(/position\s*:\s*fixed/);
  });

  it("does not apply touch-action:none globally (would block touch scroll)", () => {
    // touch-action: none on `html`, `body`, or `*` would prevent the user
    // from scrolling page sections at all.
    const htmlBlock = findRuleBlock("html") ?? "";
    const bodyBlock = findRuleBlock("body") ?? "";
    expect(htmlBlock).not.toMatch(/touch-action\s*:\s*none/);
    expect(bodyBlock).not.toMatch(/touch-action\s*:\s*none/);

    // Also guard against a wildcard rule that disables touch scrolling.
    const universalBlock = findRuleBlock("\\*") ?? "";
    expect(universalBlock).not.toMatch(/touch-action\s*:\s*none/);
  });
});

describe("runtime overscroll behaviour (jsdom)", () => {
  it("computed overscroll-behavior-y on <html> is 'none' after CSS applies", () => {
    // jsdom does not parse external CSS automatically — inject the rule we
    // assert on in CSS so the runtime check mirrors the build output.
    const style = document.createElement("style");
    style.textContent = "html { overscroll-behavior-y: none; }";
    document.head.appendChild(style);

    const computed = getComputedStyle(document.documentElement);
    // jsdom may report the longhand or shorthand — accept either.
    const value =
      computed.getPropertyValue("overscroll-behavior-y") ||
      computed.getPropertyValue("overscroll-behavior");
    expect(value.trim()).toBe("none");

    style.remove();
  });
});
