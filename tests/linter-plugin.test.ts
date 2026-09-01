import { describe, expect, test } from "bun:test";
import {
  animationDocumentSchema,
  autofixDocument,
  lintDocument,
} from "@kokoa/clotho";

describe("Editor linter", () => {
  test("Editor가 core linter와 같은 finding 및 수정 결과를 사용한다", () => {
    const document = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "editor-lint",
      assets: { old: { kind: "external", url: "https://example.com/old.png" } },
    });
    expect(lintDocument(document)[0]?.ruleId).toBe("asset/no-unused");
    expect(autofixDocument(document).document.assets).toEqual({});
  });
});
