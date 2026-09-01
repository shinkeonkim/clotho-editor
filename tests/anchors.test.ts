import { describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { anchorPointOf, anchorPointsOf } from "../src/legacy/canvas-utils";

const rect = animationDocumentSchema.parse({
  clothoVersion: 1,
  id: "anchors",
  elements: [{ type: "rect", id: "box", x: 10, y: 20, width: 100, height: 60 }],
}).elements[0];
const state = { x: 10, y: 20, width: 100, height: 60 };

describe("대각선 anchor", () => {
  test("편집 화면에 네 모서리를 연결점으로 제공한다", () => {
    expect(anchorPointsOf(rect, state)).toEqual(
      expect.arrayContaining([
        { x: 10, y: 20, anchor: "top-left" },
        { x: 110, y: 20, anchor: "top-right" },
        { x: 10, y: 80, anchor: "bottom-left" },
        { x: 110, y: 80, anchor: "bottom-right" },
      ]),
    );
  });

  test("저장된 모서리 anchor를 중심점으로 바꾸지 않는다", () => {
    expect(anchorPointOf(rect, state, "top-left")).toEqual({ x: 10, y: 20 });
    expect(anchorPointOf(rect, state, "bottom-right")).toEqual({
      x: 110,
      y: 80,
    });
  });
});
