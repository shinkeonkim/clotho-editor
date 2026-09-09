import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import type { AnimationEffect } from "@kokoa/clotho";
import {
  addEffect,
  deleteElement,
  getDef,
  replaceEffect,
  setDef,
  updateEffect,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "spot-demo",
      duration: 4000,
      canvas: { width: 800, height: 500 },
      elements: [
        { type: "rect", id: "a", x: 0, y: 0, width: 40, height: 40 },
        { type: "rect", id: "b", x: 600, y: 400, width: 40, height: 40 },
        { type: "rect", id: "c", x: 300, y: 200, width: 40, height: 40 },
      ],
    }),
  );
});

const spotlight = (over: Record<string, unknown> = {}): AnimationEffect =>
  ({
    id: "sp",
    type: "spotlight",
    elementIds: ["a"],
    time: 0,
    duration: 1200,
    dim: 0.7,
    lit: 0,
    litColor: "#fde68a",
    shape: "bbox",
    padding: 12,
    fadeIn: 200,
    ...over,
  }) as AnimationEffect;

const effectAt = (index = 0) => getDef()!.effects[index];

describe("spotlight editing", () => {
  it("stores a spotlight with its target set", () => {
    addEffect(spotlight({ elementIds: ["a", "c"] }));
    expect(effectAt()).toMatchObject({
      type: "spotlight",
      elementIds: ["a", "c"],
    });
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("edits the colours on both sides", () => {
    addEffect(spotlight());
    updateEffect("sp", {
      dimColor: "#1e1b4b",
      lit: 0.3,
      litColor: "#bfdbfe",
    } as Partial<AnimationEffect>);
    expect(effectAt()).toMatchObject({
      dimColor: "#1e1b4b",
      lit: 0.3,
      litColor: "#bfdbfe",
    });
  });
});

// A patch cannot cross the singular/plural line: merging the new fields over the
// old ones leaves a shape the schema rejects, and a rejected edit is dropped with
// nothing said.
describe("changing an effect's type", () => {
  it("carries the target across when a spotlight becomes a highlight", () => {
    addEffect(spotlight({ elementIds: ["b", "c"] }));
    replaceEffect("sp", {
      id: "sp",
      type: "highlight",
      elementId: "b",
      time: 0,
      duration: 1200,
      color: "#facc15",
    } as AnimationEffect);
    expect(effectAt()).toMatchObject({ type: "highlight", elementId: "b" });
    expect(effectAt()).not.toHaveProperty("elementIds");
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("leaves no stale fields behind in either direction", () => {
    addEffect({
      id: "sp",
      type: "flow",
      elementId: "a",
      time: 0,
      duration: 800,
      color: "#facc15",
      particles: 3,
      radius: 4,
    } as AnimationEffect);
    replaceEffect("sp", spotlight({ elementIds: ["a"] }));
    expect(effectAt()).not.toHaveProperty("particles");
    expect(effectAt()).not.toHaveProperty("elementId");
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });
});

describe("deleting an element a spotlight points at", () => {
  // The other three effects decorate one element, so losing it ends them. A
  // spotlight names a set, and losing one of three still leaves something to light.
  it("narrows the target set rather than dropping the effect", () => {
    addEffect(spotlight({ elementIds: ["a", "b", "c"] }));
    deleteElement("b");
    expect(effectAt()).toMatchObject({ elementIds: ["a", "c"] });
  });

  it("drops the spotlight when its last target goes", () => {
    addEffect(spotlight({ elementIds: ["a"] }));
    deleteElement("a");
    expect(getDef()!.effects).toHaveLength(0);
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });

  it("still ends a single-target effect, as before", () => {
    addEffect({
      id: "hl",
      type: "highlight",
      elementId: "a",
      time: 0,
      duration: 500,
      color: "#facc15",
    } as AnimationEffect);
    deleteElement("a");
    expect(getDef()!.effects).toHaveLength(0);
  });
});
