import type { AnimationDocument } from "@kokoa/clotho";
import { emit, mutateDef, state } from "./internals";
import { getDef } from "./core";

type Chart = NonNullable<AnimationDocument["charts"]>[number];

/**
 * Charts are an authoring-time spec, not elements, so they get their own mutations
 * rather than riding on the element ones. Every mutation is re-parsed through the
 * schema by `mutateDef`, which means a half-filled chart is rejected outright —
 * `encode.x` and `encode.y` are required and non-empty, and the size must be
 * positive. So a new chart has to be born valid rather than assembled into validity.
 */
export function uniqueChartId(): string {
  const def = getDef();
  const taken = new Set((def?.charts ?? []).map((c) => c.id));
  for (let i = 1; ; i += 1) {
    const id = `chart-${i}`;
    if (!taken.has(id)) return id;
  }
}

export function addChart(chart: Chart): void {
  mutateDef(
    (def) => {
      def.charts.push(chart);
    },
    `Chart 추가: ${chart.id}`,
    "add",
  );
  state.selection = { kind: "none" };
  emit();
}

export function updateChart(id: string, patch: Partial<Chart>): void {
  const keys = Object.keys(patch).join(", ");
  mutateDef(
    (def) => {
      const idx = def.charts.findIndex((c) => c.id === id);
      if (idx < 0) return;
      def.charts[idx] = { ...def.charts[idx], ...patch } as Chart;
    },
    `Chart 수정: ${keys}`,
    "meta",
  );
}

export function deleteChart(id: string): void {
  mutateDef(
    (def) => {
      def.charts = def.charts.filter((c) => c.id !== id);
    },
    `Chart 삭제: ${id}`,
    "delete",
  );
}

/**
 * A chart that parses on its first frame.
 *
 * The two sample rows exist so `encode` has real field names to point at: an empty
 * `data` array would make the encode pickers a pair of empty dropdowns, and the
 * author would have to guess that the fields come from the rows.
 */
export function defaultChart(id: string): Chart {
  return {
    id,
    x: 60,
    y: 40,
    width: 420,
    height: 240,
    kind: "bar",
    data: [
      { name: "naive", ms: 120 },
      { name: "memo", ms: 45 },
    ],
    encode: { x: "name", y: "ms" },
    scale: {},
    axes: {
      x: { label: "", ticks: 5, grid: false, hidden: false },
      y: { label: "", ticks: 5, grid: true, hidden: false },
    },
    reveal: { mode: "none", start: 0, duration: 1200, stagger: 0 },
    palette: [],
    legend: false,
  } as Chart;
}
