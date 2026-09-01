import { describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { profileAnimation } from "../src/performance-profiler-plugin";

describe("Scene Profiler", () => {
  test("scene 복잡도와 실제 frame 측정값을 함께 제공한다", () => {
    const document = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "profile",
      elements: [
        { id: "box", type: "rect", x: 0, y: 0, width: 20, height: 20 },
      ],
    });
    expect(profileAnimation(document, 3, 1000)).toMatchObject({
      elementCount: 1,
      trackCount: 0,
      keyframeCount: 0,
      sampleCount: 3,
      overBudget: false,
    });
  });
});
