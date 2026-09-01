// Image attaching on the v1 asset model.
//
// Legacy put a URL straight on the element (`image.src`), which tied a document to one
// host's paths — plausibly why `image` was used zero times across 383 real documents.
// v1 keeps sources in a document-level registry, so a document can be self-contained
// (`inline`), point outward (`external`), or defer to the host (`ref`). These pin the
// editor side of that: registering a source and handing the element an id.

import { beforeEach, describe, expect, it } from "bun:test";
import {
  animationDocumentSchema,
  parseDocument,
  resolveAsset,
} from "@kokoa/clotho";
import {
  getDef,
  registerDataUriAsset,
  registerExternalAsset,
  registerInlineAsset,
  setDef,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "demo",
      duration: 1000,
      elements: [],
    }),
  );
});

describe("external assets", () => {
  it("registers a URL and returns an id the element can reference", () => {
    const id = registerExternalAsset("/uploads/logo.png");
    expect(getDef()!.assets[id]).toEqual({
      kind: "external",
      url: "/uploads/logo.png",
    });
  });

  // Dropping the same image twice should not grow the document.
  it("reuses the entry for an identical URL", () => {
    const first = registerExternalAsset("/uploads/logo.png");
    const second = registerExternalAsset("/uploads/logo.png");
    expect(second).toBe(first);
    expect(Object.keys(getDef()!.assets)).toHaveLength(1);
  });

  it("gives different URLs different ids", () => {
    const a = registerExternalAsset("/a.png");
    const b = registerExternalAsset("/b.png");
    expect(a).not.toBe(b);
    expect(Object.keys(getDef()!.assets)).toHaveLength(2);
  });
});

describe("inline assets", () => {
  it("stores raw bytes as base64 so the document is self-contained", () => {
    const id = registerInlineAsset(new Uint8Array([1, 2, 3]), "image/png");
    expect(getDef()!.assets[id]).toEqual({
      kind: "inline",
      mime: "image/png",
      data: "AQID",
    });
  });

  // What a dropped or pasted file arrives as.
  it("stores a data URI inline rather than as an external reference", () => {
    const id = registerDataUriAsset("data:image/png;base64,AQID");
    expect(getDef()!.assets[id]).toMatchObject({
      kind: "inline",
      mime: "image/png",
    });
  });

  it("falls back to external for a data URI it cannot inline", () => {
    const id = registerDataUriAsset("data:text/plain;base64,aGk=");
    expect(getDef()!.assets[id]!.kind).toBe("external");
  });
});

describe("the registered asset actually resolves", () => {
  it("produces a document clotho can render", () => {
    const id = registerInlineAsset(new Uint8Array([1, 2, 3]), "image/png");
    const draft = getDef()!;
    const withImage = {
      ...draft,
      elements: [
        {
          type: "image",
          id: "im",
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          assetId: id,
          appearances: [{ start: 0, end: 1000 }],
        },
      ],
    };

    const parsed = parseDocument(withImage);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const resolved = resolveAsset(id, parsed.document.assets);
    expect(resolved.status).toBe("resolved");
    expect(resolved.href).toBe("data:image/png;base64,AQID");
  });
});
