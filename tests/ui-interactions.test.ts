import { describe, expect, it } from "bun:test";
import {
  nextPointerSelection,
  shouldDeferElementPointerDown,
  toolForShortcut,
  type SelectionModifiers,
} from "../src/legacy/ui-interactions";

const noModifier: SelectionModifiers = {
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
};

describe("canvas와 요소 목록의 선택 시나리오", () => {
  it("일반 클릭은 기존 다중 선택을 하나의 요소로 바꾼다", () => {
    expect(
      nextPointerSelection(
        { kind: "elements", elementIds: ["rect-1", "circle-1"] },
        "text-1",
        noModifier,
      ),
    ).toEqual({ kind: "element", elementId: "text-1" });
  });

  for (const modifier of ["shiftKey", "ctrlKey", "metaKey"] as const) {
    it(`${modifier} 클릭은 기존 선택을 유지하면서 요소를 추가한다`, () => {
      expect(
        nextPointerSelection(
          { kind: "element", elementId: "rect-1" },
          "circle-1",
          { ...noModifier, [modifier]: true },
        ),
      ).toEqual({
        kind: "elements",
        elementIds: ["rect-1", "circle-1"],
      });
    });
  }

  it("선택된 요소를 modifier 클릭하면 해당 요소만 선택에서 제외한다", () => {
    expect(
      nextPointerSelection(
        { kind: "elements", elementIds: ["rect-1", "circle-1"] },
        "rect-1",
        { ...noModifier, shiftKey: true },
      ),
    ).toEqual({ kind: "element", elementId: "circle-1" });
  });

  it("modifier mousedown은 이동을 시작하지 않고 click 선택 처리까지 기다린다", () => {
    expect(
      shouldDeferElementPointerDown(
        { ...noModifier, metaKey: true },
        { isElement: true, isHandle: false },
      ),
    ).toBe(true);
    expect(
      shouldDeferElementPointerDown(
        { ...noModifier, metaKey: true },
        { isElement: true, isHandle: true },
      ),
    ).toBe(false);
  });
});

describe("도구 단축키 시나리오", () => {
  const shortcuts = {
    v: "select",
    r: "rect",
    o: "circle",
    l: "line",
    a: "arrow",
    t: "text",
    i: "image",
    b: "path",
    y: "polygon",
  } as const;

  for (const [key, tool] of Object.entries(shortcuts)) {
    it(`${key.toUpperCase()}는 ${tool} 도구를 선택한다`, () => {
      expect(
        toolForShortcut(key.toUpperCase(), {
          isEditing: false,
          modifierKey: false,
          altKey: false,
        }),
      ).toBe(tool);
    });
  }

  it("input, textarea, contenteditable 입력 중에는 단축키를 무시한다", () => {
    expect(
      toolForShortcut("r", {
        isEditing: true,
        modifierKey: false,
        altKey: false,
      }),
    ).toBeNull();
  });

  it("Command, Ctrl 또는 Alt 조합은 도구 단축키로 처리하지 않는다", () => {
    expect(
      toolForShortcut("a", {
        isEditing: false,
        modifierKey: true,
        altKey: false,
      }),
    ).toBeNull();
    expect(
      toolForShortcut("a", {
        isEditing: false,
        modifierKey: false,
        altKey: true,
      }),
    ).toBeNull();
  });
});
