import { describe, expect, test } from "bun:test";
import { animationDocumentSchema, compileResponsiveStage } from "@kokoa/clotho";
import {
  addDefaultResponsiveVariants,
  RESPONSIVE_VIEWPORTS,
} from "../src/responsive-inspector-plugin";
import { getDef, setDef, updateResponsive } from "../src/legacy/state";

describe("Responsive Stage 검사", () => {
  test("compact, regular, wide breakpoint를 한 번만 만든다", () => {
    const document = animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "responsive-editor",
    });
    const next = addDefaultResponsiveVariants(document);
    expect(next.responsive?.map(({ id }) => id)).toEqual([
      "compact",
      "regular",
      "wide",
    ]);
    expect(addDefaultResponsiveVariants(next)).toBe(next);
  });
  test("세 viewport 모두 같은 core compiler로 검사한다", () => {
    const document = addDefaultResponsiveVariants(
      animationDocumentSchema.parse({
        clothoVersion: 1,
        id: "responsive-preview",
      }),
    );
    expect(
      RESPONSIVE_VIEWPORTS.map(
        ({ width }) => compileResponsiveStage(document, width).id,
      ),
    ).toEqual([
      "responsive-preview",
      "responsive-preview",
      "responsive-preview",
    ]);
  });
  test("Editor state에서 variant와 element override를 저장한다", () => {
    setDef(
      animationDocumentSchema.parse({
        clothoVersion: 1,
        id: "responsive-state",
      }),
    );
    updateResponsive([
      {
        id: "compact",
        minWidth: 0,
        maxWidth: 479,
        elementOverrides: { label: { x: 20, fontSize: 24 } },
      },
    ]);
    expect(getDef()?.responsive?.[0]?.elementOverrides.label).toMatchObject({
      x: 20,
      fontSize: 24,
    });
  });
});
