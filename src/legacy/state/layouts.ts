import {
  compileLayouts,
  type AnimationDocument,
  type LayoutMode,
} from "@kokoa/clotho";
import { mutateDef, state } from "./internals";

export interface LayoutCollision {
  readonly firstId: string;
  readonly secondId: string;
}

function uniqueLayoutId(def: AnimationDocument): string {
  const used = new Set(def.layouts.map((layout) => layout.id));
  let index = 1;
  while (used.has(`layout-${index}`)) index += 1;
  return `layout-${index}`;
}

export function createLayout(
  elementIds: readonly string[],
  mode: LayoutMode,
): void {
  if (elementIds.length === 0) return;
  mutateDef(
    (def) => {
      const selected = def.elements.filter((element) =>
        elementIds.includes(element.id),
      );
      if (selected.length === 0) return;
      const measured = compileLayouts({ ...def, layouts: [] }).boxes;
      const boxes = selected.flatMap((element) => {
        const box = measured[element.id];
        return box ? [box] : [];
      });
      const x = boxes.length > 0 ? Math.min(...boxes.map((box) => box.x)) : 0;
      const y = boxes.length > 0 ? Math.min(...boxes.map((box) => box.y)) : 0;
      def.layouts = def.layouts.filter(
        (layout) => !layout.elementIds.some((id) => elementIds.includes(id)),
      );
      def.layouts.push({
        id: uniqueLayoutId(def),
        mode,
        elementIds: selected.map((element) => element.id),
        x,
        y,
        gap: 16,
        align: "start",
        constraints: [],
      });
      def.elements = compileLayouts(def).document.elements;
    },
    `${mode} layout 생성`,
    "layout",
  );
}

export function detachFromLayout(elementIds: readonly string[]): void {
  const ids = new Set(elementIds);
  mutateDef(
    (def) => {
      def.layouts = def.layouts.flatMap((layout) => {
        const remaining = layout.elementIds.filter((id) => !ids.has(id));
        return remaining.length === 0
          ? []
          : [{ ...layout, elementIds: remaining }];
      });
    },
    "layout에서 분리",
    "layout",
  );
}

export function layoutIdsFor(elementIds: readonly string[]): string[] {
  if (!state.def) return [];
  const ids = new Set(elementIds);
  return state.def.layouts
    .filter((layout) => layout.elementIds.some((id) => ids.has(id)))
    .map((layout) => layout.id);
}

export function findLayoutCollisions(
  def: AnimationDocument,
): LayoutCollision[] {
  const { boxes } = compileLayouts(def);
  const collisions: LayoutCollision[] = [];
  for (const layout of def.layouts) {
    for (
      let firstIndex = 0;
      firstIndex < layout.elementIds.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < layout.elementIds.length;
        secondIndex += 1
      ) {
        const firstId = layout.elementIds[firstIndex]!;
        const secondId = layout.elementIds[secondIndex]!;
        const first = boxes[firstId];
        const second = boxes[secondId];
        if (!first || !second) continue;
        const overlaps =
          first.x < second.x + second.width &&
          first.x + first.width > second.x &&
          first.y < second.y + second.height &&
          first.y + first.height > second.y;
        if (overlaps) collisions.push({ firstId, secondId });
      }
    }
  }
  return collisions;
}
