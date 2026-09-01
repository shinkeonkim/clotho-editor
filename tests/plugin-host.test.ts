import { describe, expect, it } from "bun:test";
import type { AnimationDocument } from "@kokoa/clotho";
import {
  createEditorPluginContext,
  validateEditorPlugin,
  type EditorPluginDefinition,
  type EditorPluginHostState,
} from "../src/plugin-host";

const document = {
  clothoVersion: 1,
  id: "plugin-document",
  title: "원본",
  description: "",
  category: "general",
  tags: [],
  duration: 1000,
  locales: ["ko", "en"],
  data: {},
  canvas: { width: 800, height: 500, background: "transparent" },
  assets: {},
  elements: [],
  layouts: [],
  chapters: [],
  checkpoints: [],
  effects: [],
  settings: {
    loop: false,
    autoplay: false,
    showCaption: false,
    showChapterList: false,
    chapterListPosition: "right" as const,
  },
} satisfies AnimationDocument;

function plugin(
  overrides: Partial<EditorPluginDefinition> = {},
): EditorPluginDefinition {
  return {
    manifest: {
      id: "example.plugin",
      name: "Example",
      capabilities: ["editor"],
      editor: { panels: ["source"] },
    },
    panels: {
      source: { id: "source", label: "Source", mount: () => {} },
    },
    ...overrides,
  };
}

describe("Editor plugin manifest 연결", () => {
  it("manifest에 선언한 contribution 구현을 허용한다", () => {
    expect(validateEditorPlugin(plugin())).toEqual([]);
  });

  it("선언과 구현이 다르거나 editor capability가 없으면 거부한다", () => {
    const issues = validateEditorPlugin(
      plugin({
        manifest: {
          id: "broken.plugin",
          name: "Broken",
          capabilities: [],
          editor: { panels: ["missing"] },
        },
      }),
    );
    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("editor capability"),
        expect.stringContaining("missing 구현"),
        expect.stringContaining("source가 manifest"),
      ]),
    );
  });
});

describe("Editor plugin 권한", () => {
  function state(): EditorPluginHostState & { written?: AnimationDocument } {
    return {
      getDocument: () => document,
      replaceDocument(next) {
        this.written = next;
      },
      getSelection: () => ({ kind: "none" }),
      setSelection: () => {},
    };
  }

  it("권한이 없으면 문서 읽기와 쓰기를 막는다", () => {
    const context = createEditorPluginContext("locked.plugin", {}, state());
    expect(() => context.getDocument()).toThrow(/documentRead 권한/);
    expect(() => context.replaceDocument(document)).toThrow(
      /documentWrite 권한/,
    );
  });

  it("plugin과 host 사이에서 document를 복제해 전달한다", () => {
    const host = state();
    const context = createEditorPluginContext(
      "trusted.plugin",
      { documentRead: true, documentWrite: true },
      host,
    );
    const read = context.getDocument();
    expect(read).toEqual(document);
    expect(read).not.toBe(document);

    const changed = { ...read, title: "변경" };
    context.replaceDocument(changed);
    expect(host.written).toEqual(changed);
    expect(host.written).not.toBe(changed);
  });
});
