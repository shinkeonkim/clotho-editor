import { beforeEach, describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  getDef,
  setDef,
  updateChapter,
  updateElementBase,
  updateLocales,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "localized-text",
      duration: 1000,
      elements: [
        {
          type: "text",
          id: "greeting",
          x: 20,
          y: 40,
          content: "안녕하세요",
        },
      ],
      chapters: [{ id: "insert", time: 0, label: "{queue}에 삽입" }],
    }),
  );
});

describe("text 국제화 편집", () => {
  test("기존 content를 기본 문구로 유지한다", () => {
    const text = getDef()!.elements[0];
    expect(text.type).toBe("text");
    if (text.type !== "text") return;
    expect(text.content).toBe("안녕하세요");
    expect(text.translations).toEqual({});
  });

  test("문서 언어와 요소별 언어 및 번역을 저장한다", () => {
    updateLocales(["ko", "en", "ja", "zh-CN"]);
    updateElementBase("greeting", {
      locales: ["ko", "en", "ja", "zh-CN", "fr"],
      translations: {
        en: "Hello",
        ja: "こんにちは",
        "zh-CN": "你好",
        fr: "Bonjour",
      },
    });

    const def = getDef()!;
    expect(def.locales).toEqual(["ko", "en", "ja", "zh-CN"]);
    const text = def.elements[0];
    expect(text.type).toBe("text");
    if (text.type !== "text") return;
    expect(text.locales).toContain("fr");
    expect(text.translations.ja).toBe("こんにちは");
    expect(animationDocumentSchema.safeParse(def).success).toBe(true);
  });

  test("text와 chapter의 주석 대상을 저장한다", () => {
    updateElementBase("greeting", {
      content: "{queue}를 확인합니다",
      references: { queue: "queue-box" },
    });
    updateChapter("insert", {
      references: { queue: ["queue-box", "front-node"] },
    });

    const def = getDef()!;
    const text = def.elements[0];
    expect(text.type).toBe("text");
    if (text.type !== "text") return;
    expect(text.references.queue).toBe("queue-box");
    expect(def.chapters[0]?.references.queue).toEqual([
      "queue-box",
      "front-node",
    ]);
    expect(animationDocumentSchema.safeParse(def).success).toBe(true);
  });
});
