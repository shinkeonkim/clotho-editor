import { describe, expect, it } from "bun:test";
import { toggleSelectionFor } from "../src/legacy/state";

describe("modifier-key multi-selection", () => {
  it("adds and removes elements without losing the remaining selection", () => {
    const first = toggleSelectionFor({ kind: "none" }, "rect-1");
    expect(first).toEqual({ kind: "element", elementId: "rect-1" });

    const second = toggleSelectionFor(first, "circle-1");
    expect(second).toEqual({
      kind: "elements",
      elementIds: ["rect-1", "circle-1"],
    });

    const remaining = toggleSelectionFor(second, "rect-1");
    expect(remaining).toEqual({ kind: "element", elementId: "circle-1" });
  });
});
