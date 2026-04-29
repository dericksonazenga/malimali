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

describe("scroll containers inside page sections", () => {
  it("app scroll containers explicitly contain overscroll chaining", () => {
    const appScrollBlock = findRuleBlock(".app-scroll") ?? "";
    expect(appScrollBlock).toMatch(/overscroll-behavior-y\s*:\s*contain/);
    expect(appScrollBlock).toMatch(/-webkit-overflow-scrolling\s*:\s*touch/);
  });

  it("generic vertical overflow containers contain touch overscroll on mobile", () => {
    const overflowAutoBlock = findRuleBlock(".overflow-y-auto") ?? "";
    const overflowScrollBlock = findRuleBlock(".overflow-y-scroll") ?? "";
    expect(overflowAutoBlock).toMatch(/overscroll-behavior-y\s*:\s*contain/);
    expect(overflowAutoBlock).toMatch(/-webkit-overflow-scrolling\s*:\s*touch/);
    expect(overflowScrollBlock).toMatch(/overscroll-behavior-y\s*:\s*contain/);
    expect(overflowScrollBlock).toMatch(/-webkit-overflow-scrolling\s*:\s*touch/);
  });

  it("touch-scroll-y keeps vertical swipes scrolling instead of refreshing", () => {
    const touchScrollBlock = findRuleBlock(".touch-scroll-y") ?? "";
    expect(touchScrollBlock).toMatch(/overscroll-behavior-y\s*:\s*contain/);
    expect(touchScrollBlock).toMatch(/-webkit-overflow-scrolling\s*:\s*touch/);
    expect(touchScrollBlock).toMatch(/touch-action\s*:\s*pan-y/);
  });

  it("inner scroll containers do not declare touch-action:none", () => {
    // A `touch-action: none` rule on a generic `.overflow-y-auto` style
    // would prevent the user from scrolling cards, lists, and tables on
    // touch devices.
    const overflowAutoBlock = findRuleBlock("\\.overflow-y-auto") ?? "";
    const overflowScrollBlock = findRuleBlock("\\.overflow-y-scroll") ?? "";
    expect(overflowAutoBlock).not.toMatch(/touch-action\s*:\s*none/);
    expect(overflowScrollBlock).not.toMatch(/touch-action\s*:\s*none/);
  });
});

describe("root layout scroll safety", () => {
  it("keeps the app rooted to the viewport without locking inner scroll", () => {
    expect(css).toMatch(/#root\s*\{[^}]*height\s*:\s*100%/);
    expect(css).toMatch(/html\s*,\s*body\s*,\s*#root\s*\{[^}]*min-height\s*:\s*100dvh/);
  });

  it("app scroll container keeps min-height reset so flex children can scroll", () => {
    const appScrollBlock = findRuleBlock(".app-scroll") ?? "";
    expect(appScrollBlock).toMatch(/min-height\s*:\s*0/);
  });
});
