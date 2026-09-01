import { beforeEach, describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  getCurrentSnapshot,
  getDef,
  setDef,
  updateData,
  updateElementBase,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "data-binding-editor",
      duration: 1000,
      data: { queue: { size: 2 } },
      elements: [{ type: "text", id: "size", x: 20, y: 40, content: "0" }],
    }),
  );
});

describe("데이터 연결 편집", () => {
  test("sample data와 binding을 원본 문서에 보존하고 canvas snapshot에 적용한다", () => {
    updateElementBase("size", {
      bindings: [{ property: "content", pointer: "/queue/size", formatter: "string" }],
    });
    updateData({ queue: { size: 7 } });

    expect(getDef()!.data).toEqual({ queue: { size: 7 } });
    expect(getDef()!.elements[0]?.bindings).toHaveLength(1);
    expect(getCurrentSnapshot().get("size")?.content).toBe("7");
  });
});
