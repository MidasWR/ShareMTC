import { describe, expect, it } from "vitest";
import { getTabElementID, getTabPanelElementID, nextTabByArrow, splitTabItems, TabItem } from "./Tabs";

type TabID = "one" | "two" | "three" | "four" | "five";

const items: TabItem<TabID>[] = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
  { id: "four", label: "Four" },
  { id: "five", label: "Five" }
];

describe("tabs helpers", () => {
  it("splits tabs into visible and overflow groups", () => {
    const { visibleItems, overflowItems } = splitTabItems(items, 3);
    expect(visibleItems.map((item) => item.id)).toEqual(["one", "two", "three"]);
    expect(overflowItems.map((item) => item.id)).toEqual(["four", "five"]);
  });

  it("cycles right and left with keyboard navigation", () => {
    expect(nextTabByArrow(items, "two", "ArrowRight")).toBe("three");
    expect(nextTabByArrow(items, "one", "ArrowLeft")).toBe("five");
  });

  it("keeps all tabs visible when collapseAfter is unbounded", () => {
    const { visibleItems, overflowItems } = splitTabItems(items, Number.POSITIVE_INFINITY);
    expect(visibleItems).toHaveLength(5);
    expect(overflowItems).toHaveLength(0);
  });

  it("builds stable aria ids for tab and panel linkage", () => {
    expect(getTabElementID("scope", "two")).toBe("scope-tab-two");
    expect(getTabPanelElementID("scope", "two")).toBe("scope-panel-two");
  });
});
