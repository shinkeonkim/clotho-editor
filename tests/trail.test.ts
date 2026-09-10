import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema, buildScene } from "@kokoa/clotho";
import type { AnimationEffect } from "@kokoa/clotho";
import {
  addEffect,
  deleteElement,
  getDef,
  replaceEffect,
  setDef,
  updateEffect,
} from "../src/legacy/state";

const ON_STAGE = [{ start: 0, end: 4000, entryDuration: 0, exitDuration: 0 }];

const sweep = (property = "cx") => ({
  property,
  keyframes: [
    { time: 0, value: 40 },
    { time: 3000, value: 640, ease: "linear" },
  ],
});

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "trail-demo",
      duration: 4000,
      canvas: { width: 800, height: 300 },
      elements: [
        {
          type: "circle",
          id: "cursor",
          cx: 40,
          cy: 150,
          r: 12,
          appearances: ON_STAGE,
          tracks: [sweep()],
        },
        {
          type: "circle",
          id: "still",
          cx: 400,
          cy: 60,
          r: 12,
          appearances: ON_STAGE,
        },
      ],
    }),
  );
});

const trail = (over: Record<string, unknown> = {}): AnimationEffect =>
  ({
    id: "tr",
    type: "trail",
    elementId: "cursor",
    time: 0,
    duration: 4000,
    window: 1200,
    samples: 12,
    mode: "auto",
    fade: true,
    color: "#94a3b8",
    width: 2,
    ...over,
  }) as AnimationEffect;

const effectAt = (index = 0) => getDef()!.effects[index];

describe("trail editing", () => {
  it("stores a trail and keeps the document valid", () => {
    addEffect(trail());
    expect(effectAt()).toMatchObject({ type: "trail", elementId: "cursor" });
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("edits the fields that decide the tail's shape", () => {
    addEffect(trail());
    updateEffect("tr", {
      window: 2400,
      samples: 20,
      mode: "dots",
      fade: false,
      width: 5,
    } as Partial<AnimationEffect>);
    expect(effectAt()).toMatchObject({
      window: 2400,
      samples: 20,
      mode: "dots",
      fade: false,
      width: 5,
    });
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });
});

// A trail names one element and a spotlight names a set, so switching between
// them is a conversion. A patch would leave `elementIds` next to `elementId` and
// the schema would reject the result, dropping the edit with nothing said.
describe("changing a trail's type", () => {
  it("carries the target across to a spotlight and back", () => {
    addEffect(trail());
    replaceEffect("tr", {
      id: "tr",
      type: "spotlight",
      elementIds: ["cursor"],
      time: 0,
      duration: 1200,
      dim: 0.7,
      lit: 0,
      litColor: "#fde68a",
      shape: "bbox",
      padding: 12,
      fadeIn: 200,
    } as AnimationEffect);
    expect(effectAt()).not.toHaveProperty("elementId");

    replaceEffect("tr", trail());
    expect(effectAt()).toMatchObject({ type: "trail", elementId: "cursor" });
    expect(effectAt()).not.toHaveProperty("elementIds");
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("leaves no stale field behind when a highlight becomes a trail", () => {
    addEffect({
      id: "tr",
      type: "highlight",
      elementId: "cursor",
      time: 0,
      duration: 500,
      color: "#facc15",
    } as AnimationEffect);
    replaceEffect("tr", trail());
    expect(effectAt()).not.toHaveProperty("color2");
    expect(effectAt()).toMatchObject({ window: 1200, samples: 12 });
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });
});

describe("deleting the element a trail follows", () => {
  it("ends the effect, as it does for the other single-target effects", () => {
    addEffect(trail());
    deleteElement("cursor");
    expect(getDef()!.effects).toHaveLength(0);
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });
});

/**
 * The canvas preview draws whatever `buildScene` produces for the effect, rather
 * than re-deriving the samples. These pin the two facts the preview reports back
 * to the author: that a stationary target draws nothing at all, and that the
 * pieces are addressable by the effect's id.
 */
describe("what the canvas preview can show", () => {
  const pieces = (at: number): string[] => {
    const def = getDef()!;
    return buildScene(def, at, {})
      .nodes.map((node) => String(node.key))
      .filter((key) => key.startsWith("tr-"));
  };

  it("has pieces to draw for a moving target", () => {
    addEffect(trail());
    expect(pieces(2000).length).toBeGreaterThan(0);
  });

  it("has nothing to draw for a target that never moves", () => {
    addEffect(trail({ elementId: "still" }));
    expect(pieces(2000)).toHaveLength(0);
  });
});
