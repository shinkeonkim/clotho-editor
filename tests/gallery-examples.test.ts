import { describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { exampleAnimations } from "../app/examples";

describe("Cloudflare editor gallery examples", () => {
  it("Clotho gallery의 JSON 문서 10개를 모두 제공한다", () => {
    expect(exampleAnimations.map((document) => document.id)).toEqual([
      "incident-walkthrough",
      "elements",
      "transitions",
      "easing",
      "interpolation",
      "iteration",
      "effects",
      "connectors",
      "groups",
      "chapters",
    ]);
  });

  it("모든 예시가 현재 Clotho schema로 다시 검증된다", () => {
    for (const document of exampleAnimations) {
      expect(() => animationDocumentSchema.parse(document)).not.toThrow();
    }
  });
});
