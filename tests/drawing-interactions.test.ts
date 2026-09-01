import { describe, expect, it } from "bun:test";
import {
  dragBounds,
  isShapeDrag,
  regularPolygonPoints,
} from "../src/legacy/drawing-interactions";

describe("도형 도구 pointer 시나리오", () => {
  it("pointer를 놓은 방향과 관계없이 drag 영역을 계산한다", () => {
    expect(dragBounds({ x: 120, y: 90 }, { x: 20, y: 30 })).toEqual({
      x: 20,
      y: 30,
      width: 100,
      height: 60,
      centerX: 70,
      centerY: 60,
      distance: Math.hypot(100, 60),
    });
  });

  it("짧은 pointer 이동은 click으로, 충분한 이동은 drag로 처리한다", () => {
    expect(isShapeDrag({ x: 10, y: 10 }, { x: 12, y: 12 })).toBe(false);
    expect(isShapeDrag({ x: 10, y: 10 }, { x: 20, y: 20 })).toBe(true);
  });

  it("polygon preview와 확정 요소가 같은 점 계산을 공유한다", () => {
    const points = regularPolygonPoints({ x: 100, y: 100 }, 40, 6);
    expect(points.split(" ")).toHaveLength(6);
    expect(points).toStartWith("100.0,60.0");
  });

  it("polygon 변 개수를 지원 범위로 제한한다", () => {
    expect(regularPolygonPoints({ x: 0, y: 0 }, 10, 2).split(" ")).toHaveLength(
      3,
    );
    expect(
      regularPolygonPoints({ x: 0, y: 0 }, 10, 100).split(" "),
    ).toHaveLength(24);
  });
});
