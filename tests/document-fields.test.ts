import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import type { AnimationDocument } from "@kokoa/clotho";
import {
  addChapter,
  getDef,
  setDef,
  updateChapter,
  updateElementBase,
  updateStyle,
} from "../src/legacy/state";

const base = () =>
  animationDocumentSchema.parse({
    clothoVersion: 1,
    id: "fields",
    duration: 2000,
    canvas: { width: 400, height: 200 },
    elements: [
      {
        type: "code",
        id: "snip",
        x: 10,
        y: 10,
        width: 200,
        height: 100,
        content: "const a = 1;",
        appearances: [
          { start: 0, end: 2000, entryDuration: 0, exitDuration: 0 },
        ],
      },
    ],
  });

beforeEach(() => setDef(base()));

const doc = () => getDef() as AnimationDocument;
const valid = () => animationDocumentSchema.safeParse(getDef()).success;

describe("render style", () => {
  it("writes a complete style even though only the preset was chosen", () => {
    updateStyle({ preset: "sketch" });
    // `roughness` carries a schema default, so a half-written style would not parse.
    expect(doc().style).toMatchObject({ preset: "sketch" });
    expect(typeof doc().style!.roughness).toBe("number");
    expect(valid()).toBe(true);
  });

  it("keeps the seed the author gave it", () => {
    updateStyle({ preset: "sketch" });
    updateStyle({ seed: "bellman-ford" });
    expect(doc().style).toMatchObject({
      preset: "sketch",
      seed: "bellman-ford",
    });
    expect(valid()).toBe(true);
  });

  it("removes the field entirely rather than writing clean", () => {
    updateStyle({ preset: "mono" });
    expect(doc().style).toBeDefined();
    updateStyle(null);
    // An explicit `clean` and no style at all render identically, and the shorter
    // document is the truer one.
    expect(doc().style).toBeUndefined();
    expect(valid()).toBe(true);
  });
});

describe("presenter notes", () => {
  it("round-trips on a chapter without disturbing the subtitle", () => {
    addChapter({
      id: "c1",
      time: 0,
      label: "Round 1",
      subtitle: "간선 완화",
      notes: "",
      references: {},
    });
    updateChapter("c1", { notes: "왜 |V|-1번인지 묻는다" });
    const ch = doc().chapters[0]!;
    expect(ch.notes).toBe("왜 |V|-1번인지 묻는다");
    expect(ch.subtitle).toBe("간선 완화");
    expect(valid()).toBe(true);
  });
});

describe("source-linked code", () => {
  const source = () =>
    (doc().elements[0] as { source?: Record<string, string> }).source;

  it("records where the content came from", () => {
    updateElementBase("snip", {
      source: { file: "src/core/runtime/snapshot.ts", region: "compute" },
    } as never);
    expect(source()).toMatchObject({
      file: "src/core/runtime/snapshot.ts",
      region: "compute",
    });
    expect(valid()).toBe(true);
  });

  it("drops the link when the file is cleared", () => {
    updateElementBase("snip", { source: { file: "a.ts" } } as never);
    expect(source()).toBeDefined();
    // A source with no file is not a source; leaving a half-record behind would
    // make `clotho sync` chase a path that is not there.
    updateElementBase("snip", { source: undefined } as never);
    expect(source()).toBeUndefined();
    expect(valid()).toBe(true);
  });
});
