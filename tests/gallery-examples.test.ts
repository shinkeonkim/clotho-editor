import { describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { exampleAnimations } from "../app/examples";

describe("Cloudflare editor gallery examples", () => {
  it("Clotho gallery의 JSON 문서 13개를 모두 제공한다", () => {
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
      "spotlight",
      "trail",
      "camera",
    ]);
  });

  it("모든 예시가 현재 Clotho schema로 다시 검증된다", () => {
    for (const document of exampleAnimations) {
      expect(() => animationDocumentSchema.parse(document)).not.toThrow();
    }
  });

  /**
   * 편집기가 편집할 수 있는 것과 열어볼 수 있는 것이 어긋나지 않게 한다.
   *
   * camera·spotlight·trail 편집 기능은 각각 별도 라운드에 들어갔는데 예시는 따라오지
   * 않았고, 그래서 한동안 **편집기가 다룰 줄 아는 기능인데 열어볼 문서가 하나도 없는**
   * 상태였다. 목록에서 하나가 빠지면 여기서 걸린다.
   */
  it("편집기가 편집하는 기능마다 열어볼 예시가 있다", () => {
    const hasCamera = exampleAnimations.some(
      (document) =>
        document.camera !== undefined &&
        (document.camera.focus.length > 0 || document.camera.tracks.length > 0),
    );
    const effectTypes = new Set(
      exampleAnimations.flatMap((document) =>
        document.effects.map((effect) => effect.type),
      ),
    );

    expect(hasCamera).toBe(true);
    for (const type of [
      "highlight",
      "pulse",
      "flow",
      "spotlight",
      "trail",
    ] as const) {
      expect(effectTypes).toContain(type);
    }
  });
});
