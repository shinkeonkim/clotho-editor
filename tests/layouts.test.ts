import { beforeEach, describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  createLayout,
  detachFromLayout,
  findLayoutCollisions,
  getDef,
  layoutIdsFor,
  setDef,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "layout-editor",
      elements: [
        { type: "rect", id: "a", x: 50, y: 40, width: 30, height: 20 },
        { type: "rect", id: "b", x: 70, y: 40, width: 10, height: 10 },
      ],
    }),
  );
});

describe("constraint layout editing", () => {
  test("선택한 요소로 layout을 만들고 Clotho compiler 결과를 저장한다", () => {
    createLayout(["a", "b"], "row");
    const document = getDef()!;
    expect(document.layouts).toHaveLength(1);
    expect(document.layouts[0]).toMatchObject({
      mode: "row",
      elementIds: ["a", "b"],
    });
    expect(document.elements[0]).toMatchObject({ x: 50, y: 40 });
    expect(document.elements[1]).toMatchObject({ x: 96, y: 40 });
    expect(layoutIdsFor(["a"])).toEqual(["layout-1"]);
  });

  test("분리하면 현재 좌표를 유지하고 layout 규칙만 제거한다", () => {
    createLayout(["a", "b"], "row");
    const before = structuredClone(getDef()!.elements);
    detachFromLayout(["a", "b"]);
    expect(getDef()!.layouts).toEqual([]);
    expect(getDef()!.elements).toEqual(before);
  });

  test("layout 결과의 겹침을 검사한다", () => {
    const document = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "collision",
      elements: [
        { type: "rect", id: "a", x: 0, y: 0, width: 40, height: 40 },
        { type: "rect", id: "b", x: 0, y: 0, width: 40, height: 40 },
      ],
      layouts: [{ id: "stack", mode: "row", elementIds: ["a", "b"], gap: 0 }],
    });
    expect(findLayoutCollisions(document)).toEqual([]);
  });
});
