import { describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  animationDocumentFileName,
  animationDocumentToJson,
  garbageCollectAnimationAssets,
} from "../src/export-json";

describe("JSON 내보내기", () => {
  test("문서를 다시 불러올 수 있는 들여쓰기 JSON으로 만든다", () => {
    const def = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "sample",
      title: "예시",
      description: "",
    });
    const json = animationDocumentToJson(def);

    expect(json.endsWith("\n")).toBe(true);
    expect(json).toContain('\n  "title": "예시"');
    expect(animationDocumentSchema.parse(JSON.parse(json))).toEqual(def);
  });

  test("문서 ID를 안전한 파일 이름으로 만든다", () => {
    const def = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "sample",
      title: "예시",
      description: "",
    });
    expect(animationDocumentFileName({ ...def, id: "경로 / sample" })).toBe(
      "-sample.json",
    );
  });
});

test("JSON 내보내기에서 사용하지 않는 image asset을 제거한다", () => {
  const def = animationDocumentSchema.parse({
    clothoVersion: 1,
    id: "assets",
    assets: {
      used: { kind: "external", url: "https://example.com/used.png" },
      orphan: { kind: "external", url: "https://example.com/orphan.png" },
    },
    elements: [
      {
        type: "image",
        id: "image",
        assetId: "used",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ],
  });
  expect(Object.keys(garbageCollectAnimationAssets(def).assets)).toEqual([
    "used",
  ]);
  expect(animationDocumentToJson(def)).not.toContain("orphan.png");
});
