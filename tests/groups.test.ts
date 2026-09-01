// Group editing on the v1 model.
//
// This is the part of the Studio that could not be ported mechanically. Legacy grouped
// by `group.childIds` — a reference list that produced no nested `<g>`, so a group's
// transform never reached its children, and the legacy renderer had no `group` branch at
// all. Grouping did nothing. v1 grouping is `parentId` on the child, which means it
// works for the first time and needs its own tests.

import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema, type AnimationDocument } from "@kokoa/clotho";
import { setDef, getDef } from "../src/legacy/state";
import {
  childIdsOf,
  groupElements,
  isGroup,
  ungroupElement,
} from "../src/legacy/studio-groups";

function doc(): AnimationDocument {
  return animationDocumentSchema.parse({
    clothoVersion: 1,
    id: "demo",
    duration: 1000,
    elements: [
      { type: "rect", id: "a", x: 10, y: 20, width: 30, height: 40 },
      { type: "rect", id: "b", x: 100, y: 120, width: 30, height: 40 },
      { type: "rect", id: "c", x: 200, y: 220, width: 30, height: 40 },
    ],
  });
}

beforeEach(() => {
  setDef(doc());
});

describe("grouping", () => {
  it("sets parentId on the members rather than listing them", () => {
    const id = groupElements(["a", "b"]);
    expect(id).not.toBeNull();
    const groupId = id!;

    const def = getDef()!;
    const group = def.elements.find((el) => el.id === groupId)!;
    expect(isGroup(group)).toBe(true);
    expect(group).not.toHaveProperty("childIds");
    expect(def.elements.find((el) => el.id === "a")?.parentId).toBe(groupId);
    expect(def.elements.find((el) => el.id === "b")?.parentId).toBe(groupId);
    expect(def.elements.find((el) => el.id === "c")?.parentId).toBeUndefined();
  });

  // Children keep absolute coordinates, so the group's own transform must start at the
  // identity — otherwise every member jumps on the first render.
  it("creates the group with an identity transform", () => {
    const id = groupElements(["a", "b"])!;
    const group = getDef()!.elements.find((el) => el.id === id)!;
    expect(group).toMatchObject({ x: 0, y: 0, rotation: 0 });
  });

  it("leaves member coordinates untouched", () => {
    groupElements(["a", "b"]);
    const def = getDef()!;
    expect(def.elements.find((el) => el.id === "a")).toMatchObject({
      x: 10,
      y: 20,
    });
    expect(def.elements.find((el) => el.id === "b")).toMatchObject({
      x: 100,
      y: 120,
    });
  });

  it("reports children by scanning, in document order", () => {
    const id = groupElements(["a", "b"])!;
    expect(childIdsOf(id)).toEqual(["a", "b"]);
  });

  it("refuses to group fewer than two elements", () => {
    expect(groupElements(["a"])).toBeNull();
    expect(groupElements([])).toBeNull();
  });

  it("ignores ids that are not in the document", () => {
    expect(groupElements(["a", "ghost"])).toBeNull();
  });
});

describe("ungrouping", () => {
  it("clears parentId and removes the group", () => {
    const id = groupElements(["a", "b"])!;
    const freed = ungroupElement(id);

    expect(freed.sort()).toEqual(["a", "b"]);
    const def = getDef()!;
    expect(def.elements.find((el) => el.id === id)).toBeUndefined();
    expect(def.elements.find((el) => el.id === "a")?.parentId).toBeUndefined();
    expect(def.elements.find((el) => el.id === "b")?.parentId).toBeUndefined();
  });

  // Order matters: removing the group first would leave the children pointing at a
  // parent that no longer exists, which the tree builder reports as an error.
  it("leaves no dangling parentId behind", () => {
    const id = groupElements(["a", "b"])!;
    ungroupElement(id);
    const ids = new Set(getDef()!.elements.map((el) => el.id));
    for (const el of getDef()!.elements) {
      if (el.parentId !== undefined) expect(ids.has(el.parentId)).toBe(true);
    }
  });

  it("does nothing for an id that is not a group", () => {
    expect(ungroupElement("a")).toEqual([]);
  });
});
