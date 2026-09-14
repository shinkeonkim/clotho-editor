import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import type { AnimationDocument } from "@kokoa/clotho";
import {
  addChart,
  defaultChart,
  deleteChart,
  getDef,
  setDef,
  uniqueChartId,
  updateChart,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "charts",
      duration: 2000,
      canvas: { width: 640, height: 360 },
    }),
  );
});

const doc = () => getDef() as AnimationDocument;
const valid = () => animationDocumentSchema.safeParse(getDef()).success;

describe("chart state", () => {
  it("adds a chart that is born valid", () => {
    // `mutateDef` re-parses every mutation, so a chart assembled into validity
    // afterwards would be rejected on the way in.
    addChart(defaultChart(uniqueChartId()));
    expect(doc().charts).toHaveLength(1);
    expect(doc().charts[0]).toMatchObject({
      id: "chart-1",
      kind: "bar",
      encode: { x: "name", y: "ms" },
    });
    expect(valid()).toBe(true);
  });

  it("gives the default chart data for encode to point at", () => {
    // Empty data would leave the encode pickers as two blank dropdowns with no clue
    // that the field names come from the rows.
    const chart = defaultChart("c");
    expect(chart.data.length).toBeGreaterThan(0);
    expect(Object.keys(chart.data[0]!)).toContain(chart.encode.x);
    expect(Object.keys(chart.data[0]!)).toContain(chart.encode.y);
  });

  it("hands out ids that do not collide", () => {
    addChart(defaultChart(uniqueChartId()));
    addChart(defaultChart(uniqueChartId()));
    expect(doc().charts.map((c) => c.id)).toEqual(["chart-1", "chart-2"]);
    expect(valid()).toBe(true);
  });

  it("edits a chart without disturbing its siblings", () => {
    addChart(defaultChart("a"));
    addChart(defaultChart("b"));
    updateChart("b", { kind: "line", width: 500 });
    expect(doc().charts[1]).toMatchObject({
      id: "b",
      kind: "line",
      width: 500,
    });
    expect(doc().charts[0]).toMatchObject({ id: "a", kind: "bar" });
    expect(valid()).toBe(true);
  });

  it("refuses an edit that would not parse", () => {
    addChart(defaultChart("a"));
    const before = JSON.stringify(doc().charts[0]);
    // width must be positive; mutateDef re-parses and drops the change rather than
    // writing a document the schema rejects.
    updateChart("a", { width: 0 } as never);
    expect(JSON.stringify(doc().charts[0])).toBe(before);
    expect(valid()).toBe(true);
  });

  it("deletes by id", () => {
    addChart(defaultChart("a"));
    addChart(defaultChart("b"));
    deleteChart("a");
    expect(doc().charts.map((c) => c.id)).toEqual(["b"]);
    expect(valid()).toBe(true);
  });
});
