import { describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { makeDefaultElement } from "../src/legacy/element-list";
import { toolForShortcut } from "../src/legacy/ui-interactions";

const noModifiers = { isEditing: false, modifierKey: false, altKey: false };

describe("math 요소 만들기", () => {
  it("클릭한 자리에 schema가 받아들이는 요소를 만든다", () => {
    const el = makeDefaultElement("math", "eq-1", 120, 80);
    expect(el).toMatchObject({ type: "math", id: "eq-1", x: 120, y: 80 });

    // 편집기가 만든 요소가 문서에 들어갈 수 없다면 도구가 있으나 마나다.
    const parsed = animationDocumentSchema.safeParse({
      clothoVersion: 1,
      id: "doc",
      duration: 1000,
      canvas: { width: 400, height: 200 },
      elements: [el],
    });
    expect(parsed.success).toBe(true);
  });

  it("기본 수식은 조판되면 원문과 달라 보이는 것으로 둔다", () => {
    // 분수는 조판 결과가 원문과 확연히 다르므로, 호스트가 조판기를 연결했는지
    // 한눈에 알 수 있다. 조판기가 없으면 원문이 그대로 보이는 것이 정상이다.
    const el = makeDefaultElement("math", "eq-2", 0, 0);
    expect((el as { tex: string }).tex).toContain("\\frac");
  });

  it("알 수 없는 타입은 여전히 null이다", () => {
    expect(makeDefaultElement("nope", "x", 0, 0)).toBeNull();
  });
});

describe("math 도구 단축키", () => {
  it("M이 math 도구를 고른다", () => {
    expect(toolForShortcut("m", noModifiers)).toBe("math");
    expect(toolForShortcut("M", noModifiers)).toBe("math");
  });

  it("입력 중이거나 수정키를 누른 동안에는 도구를 바꾸지 않는다", () => {
    expect(
      toolForShortcut("m", { ...noModifiers, isEditing: true }),
    ).toBeNull();
    expect(
      toolForShortcut("m", { ...noModifiers, modifierKey: true }),
    ).toBeNull();
  });
});
