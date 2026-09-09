import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  addCameraFocus,
  clearCamera,
  deleteCameraFocus,
  getCamera,
  getDef,
  getSelection,
  hasCamera,
  moveCameraKeyframe,
  removeCameraKeyframe,
  removeCameraTrack,
  setCameraKeyframe,
  setCameraStrokeScaling,
  setDef,
  updateCameraFocus,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "camera-demo",
      duration: 4000,
      canvas: { width: 800, height: 500 },
      elements: [
        { type: "rect", id: "a", x: 0, y: 0, width: 40, height: 40 },
        { type: "rect", id: "b", x: 600, y: 400, width: 40, height: 40 },
      ],
    }),
  );
});

const focus = (over: Record<string, unknown> = {}) => ({
  time: 500,
  duration: 600,
  elementIds: ["a"],
  padding: 24,
  maxZoom: 4,
  ...over,
});

describe("카메라가 없는 문서", () => {
  it("기본값을 돌려주되 카메라를 만들어 두지는 않는다", () => {
    expect(hasCamera()).toBe(false);
    expect(getCamera()).toEqual({
      tracks: [],
      focus: [],
      strokeScaling: "scale",
    });
    // 카메라가 없던 문서가 편집만으로 카메라를 갖게 되면 안 된다.
    expect(getDef()!.camera).toBeUndefined();
  });

  it("첫 편집에서 camera 필드를 만든다", () => {
    addCameraFocus(focus());
    expect(getDef()!.camera?.focus).toHaveLength(1);
    expect(hasCamera()).toBe(true);
  });
});

describe("focus 편집", () => {
  it("추가하면 그 focus가 선택된다", () => {
    addCameraFocus(focus());
    expect(getSelection()).toEqual({ kind: "camera", focusIndex: 0 });
  });

  it("시간순으로 정렬해 보관한다", () => {
    addCameraFocus(focus({ time: 2000 }));
    addCameraFocus(focus({ time: 500, elementIds: ["b"] }));
    expect(getCamera().focus.map((entry) => entry.time)).toEqual([500, 2000]);
  });

  // 정렬 때문에 index가 바뀌므로, 선택은 자리가 아니라 대상을 따라가야 한다.
  it("시간을 옮겨 순서가 바뀌어도 같은 focus를 선택한 채로 둔다", () => {
    addCameraFocus(focus({ time: 500, elementIds: ["a"] }));
    addCameraFocus(focus({ time: 2000, elementIds: ["b"] }));
    updateCameraFocus(0, { time: 3000 });
    const selection = getSelection();
    expect(selection.kind).toBe("camera");
    const index = selection.kind === "camera" ? selection.focusIndex : -1;
    expect(getCamera().focus[index!]?.elementIds).toEqual(["a"]);
  });

  it("삭제하면 카메라 전체 선택으로 돌아간다", () => {
    addCameraFocus(focus());
    deleteCameraFocus(0);
    expect(getCamera().focus).toHaveLength(0);
    expect(getSelection()).toEqual({ kind: "camera" });
  });
});

describe("track 편집", () => {
  it("현재 시각에 keyframe을 쓰고 시간순으로 정렬한다", () => {
    setCameraKeyframe("zoom", 2000, 2.5);
    setCameraKeyframe("zoom", 0, 1);
    expect(getCamera().tracks[0]).toMatchObject({
      property: "zoom",
      keyframes: [
        { time: 0, value: 1 },
        { time: 2000, value: 2.5 },
      ],
    });
  });

  it("같은 시각에 다시 쓰면 덮어쓴다", () => {
    setCameraKeyframe("x", 1000, 100);
    setCameraKeyframe("x", 1000, 400);
    expect(getCamera().tracks[0]?.keyframes).toEqual([
      { time: 1000, value: 400 },
    ]);
  });

  it("이동은 값을 유지한 채 시간만 바꾼다", () => {
    setCameraKeyframe("y", 1000, 250);
    moveCameraKeyframe("y", 1000, 1800);
    expect(getCamera().tracks[0]?.keyframes).toEqual([
      { time: 1800, value: 250 },
    ]);
  });

  // 스키마가 keyframe 최소 1개를 요구하므로, 비워진 track은 남기면 문서가 무효가 된다.
  it("마지막 keyframe을 지우면 track째 사라진다", () => {
    setCameraKeyframe("zoom", 1000, 2);
    removeCameraKeyframe("zoom", 1000);
    expect(getCamera().tracks).toHaveLength(0);
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("track 하나만 지워도 나머지는 남는다", () => {
    setCameraKeyframe("zoom", 0, 1);
    setCameraKeyframe("x", 0, 400);
    removeCameraTrack("zoom");
    expect(getCamera().tracks.map((track) => track.property)).toEqual(["x"]);
  });
});

describe("문서로서의 유효성", () => {
  it("strokeScaling을 저장한다", () => {
    setCameraStrokeScaling("fixed");
    expect(getDef()!.camera?.strokeScaling).toBe("fixed");
  });

  it("편집한 문서가 스키마를 통과한다", () => {
    addCameraFocus(focus());
    setCameraKeyframe("zoom", 0, 1);
    setCameraStrokeScaling("fixed");
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  // 카메라를 지운 문서는 카메라가 없던 문서와 같아야 한다 — 빈 카메라를 남기면
  // 렌더 결과는 같아도 diff와 저장 JSON이 달라진다.
  it("제거하면 camera 필드가 사라진다", () => {
    addCameraFocus(focus());
    clearCamera();
    expect(getDef()!.camera).toBeUndefined();
    expect(hasCamera()).toBe(false);
    expect(getSelection()).toEqual({ kind: "none" });
  });
});
