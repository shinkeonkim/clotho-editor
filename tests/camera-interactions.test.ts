import { describe, expect, it } from "bun:test";
import {
  cameraDragMode,
  cameraDragResult,
  centreDistance,
  type CameraDrag,
} from "../src/legacy/camera-interactions";

const drag = (over: Partial<CameraDrag> = {}): CameraDrag => ({
  mode: "pan",
  focusIndex: -1,
  time: 1000,
  startX: 400,
  startY: 250,
  startCenterX: 400,
  startCenterY: 250,
  startZoom: 1,
  startPadding: 24,
  startDistance: 100,
  ...over,
});

describe("무엇을 편집하는 드래그인가", () => {
  it("track이 화면을 결정할 때는 안쪽이 이동, 모서리가 zoom이다", () => {
    expect(cameraDragMode("pan", { kind: "tracks" })).toBe("pan");
    expect(cameraDragMode("resize", { kind: "tracks" })).toBe("zoom");
  });

  // focus 아래에서 카메라 중심은 대상의 중심이다. 이동을 track keyframe으로 쓰면
  // 다음 프레임에 focus가 덮어써서 "고장난 컨트롤"과 구분되지 않는다.
  it("focus가 화면을 결정할 때는 이동이 아예 없고 모서리는 padding이다", () => {
    expect(cameraDragMode("pan", { kind: "focus", index: 0 })).toBeNull();
    expect(cameraDragMode("resize", { kind: "focus", index: 0 })).toBe(
      "padding",
    );
  });

  it("테두리는 선택만 하고 카메라가 없으면 아무 의미도 없다", () => {
    expect(cameraDragMode("border", { kind: "tracks" })).toBeNull();
    expect(cameraDragMode("resize", { kind: "none" })).toBeNull();
  });
});

describe("이동", () => {
  // 지도와 같다. 그림을 잡고 끄는 것이므로 오른쪽으로 끌면 왼쪽에 있던 것이 보인다.
  it("포인터와 반대로 중심을 옮긴다", () => {
    expect(cameraDragResult(drag(), { x: 460, y: 280 })).toEqual({
      centerX: 340,
      centerY: 220,
    });
  });

  it("정수 좌표만 쓴다", () => {
    const result = cameraDragResult(drag(), { x: 400.4, y: 250.6 });
    expect(Number.isInteger(result.centerX)).toBe(true);
    expect(Number.isInteger(result.centerY)).toBe(true);
  });
});

describe("zoom", () => {
  // 모서리를 바깥으로 끌면 보이는 사각형이 커지고, 큰 사각형은 작은 zoom이다.
  it("바깥으로 끌면 축소되고 안쪽으로 끌면 확대된다", () => {
    const out = cameraDragResult(drag({ mode: "zoom" }), { x: 600, y: 250 });
    const inward = cameraDragResult(drag({ mode: "zoom" }), { x: 450, y: 250 });
    expect(out.zoom).toBeLessThan(1);
    expect(inward.zoom).toBeGreaterThan(1);
  });

  it("거리가 그대로면 zoom도 그대로다", () => {
    expect(
      cameraDragResult(drag({ mode: "zoom" }), { x: 500, y: 250 }).zoom,
    ).toBe(1);
  });

  it("사용할 수 없는 배율까지 내려가지 않는다", () => {
    const result = cameraDragResult(
      drag({ mode: "zoom", startZoom: 1, startDistance: 1 }),
      { x: 4000, y: 250 },
    );
    expect(result.zoom).toBeGreaterThanOrEqual(0.05);
  });
});

describe("padding", () => {
  it("바깥으로 끌면 여백이 늘고 안쪽으로 끌면 줄어든다", () => {
    const out = cameraDragResult(drag({ mode: "padding" }), { x: 600, y: 250 });
    const inward = cameraDragResult(drag({ mode: "padding" }), {
      x: 450,
      y: 250,
    });
    expect(out.padding).toBeGreaterThan(24);
    expect(inward.padding).toBeLessThan(24);
  });

  // 비율만 쓰면 padding 0에서는 무엇을 해도 0이라 드래그가 멈춘 것처럼 보인다.
  it("padding 0에서도 늘어난다", () => {
    const result = cameraDragResult(
      drag({ mode: "padding", startPadding: 0 }),
      { x: 600, y: 250 },
    );
    expect(result.padding).toBeGreaterThan(0);
  });

  it("음수가 되지 않는다", () => {
    const result = cameraDragResult(drag({ mode: "padding" }), {
      x: 400,
      y: 250,
    });
    expect(result.padding).toBeGreaterThanOrEqual(0);
  });
});

describe("centreDistance", () => {
  it("중심을 정확히 지나가도 0으로 나누지 않는다", () => {
    expect(centreDistance({ x: 400, y: 250 }, 400, 250)).toBe(1);
  });
});
