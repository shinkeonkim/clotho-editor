import { describe, expect, test } from "bun:test";
import { defineStory } from "@kokoa/clotho";
import {
  appendStoryEdge,
  replaceStoryNodeDocument,
} from "../src/story-editor-plugin";

const doc = (id: string) => ({
  clothoVersion: 1 as const,
  id,
  duration: 1000,
  elements: [],
});
const manifest = defineStory({
  storyVersion: 1,
  id: "flow",
  initialNode: "a",
  nodes: [
    { id: "a", document: doc("a") },
    { id: "b", document: doc("b") },
  ],
});

describe("Story Graph 편집", () => {
  test("node 문서를 현재 Editor 문서로 교체한다", () => {
    const next = replaceStoryNodeDocument(
      manifest,
      "a",
      defineStory({
        ...manifest,
        nodes: [{ id: "a", document: doc("changed") }],
      }).nodes[0]!.document,
    );
    expect(next.nodes[0]?.document.id).toBe("changed");
  });
  test("검증된 edge를 추가한다", () => {
    expect(
      appendStoryEdge(manifest, {
        id: "a-b",
        from: "a",
        to: "b",
        label: "다음",
      }).edges,
    ).toHaveLength(1);
  });
});
