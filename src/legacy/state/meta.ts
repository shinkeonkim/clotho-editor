import type { AnimationDocument, DataValue } from "@kokoa/clotho";
import { encodeImageAsset, inlineAssetFromDataUri } from "@kokoa/clotho";
import { mutateDef, state } from "./internals";
import { getDef } from "./core";

export function updateMeta(
  patch: Partial<Pick<AnimationDocument, "title" | "description">>,
): void {
  const keys = Object.keys(patch).join(", ");
  mutateDef(
    (def) => {
      Object.assign(def, patch);
    },
    `메타 수정: ${keys}`,
    "meta",
  );
}

/** Update the locales offered to localized text elements in this document. */
export function updateLocales(locales: string[]): void {
  mutateDef(
    (def) => {
      (def as AnimationDocument & { locales: string[] }).locales = locales;
    },
    "문서 언어 변경",
    "meta",
  );
}

export function updateData(data: Record<string, DataValue>): void {
  mutateDef(
    (def) => {
      def.data = data;
    },
    "샘플 데이터 변경",
    "meta",
  );
}

export function updateResponsive(
  responsive: NonNullable<AnimationDocument["responsive"]>,
): void {
  mutateDef(
    (def) => {
      def.responsive = responsive;
    },
    "Responsive Stage 변경",
    "canvas",
  );
}

export function updateCanvas(
  patch: Partial<AnimationDocument["canvas"]>,
): void {
  const keys = Object.keys(patch).join(", ");
  mutateDef(
    (def) => {
      def.canvas = { ...def.canvas, ...patch };
    },
    `캔버스: ${keys}`,
    "canvas",
  );
}

export function updateSettings(
  patch: Partial<AnimationDocument["settings"]>,
): void {
  const keys = Object.keys(patch).join(", ");
  mutateDef(
    (def) => {
      def.settings = { ...def.settings, ...patch };
    },
    `설정: ${keys}`,
    "settings",
  );
}

export function uniqueElementId(type: string): string {
  if (!state.def) return type + "-1";
  const used = new Set(state.def.elements.map((e) => e.id));
  let i = 1;
  while (used.has(`${type}-${i}`)) i += 1;
  return `${type}-${i}`;
}

export function uniqueChapterId(): string {
  if (!state.def) return "chapter-1";
  const used = new Set(state.def.chapters.map((c) => c.id));
  let i = 1;
  while (used.has(`chapter-${i}`)) i += 1;
  return `chapter-${i}`;
}

export function uniqueEffectId(): string {
  if (!state.def) return "effect-1";
  const used = new Set(state.def.effects.map((e) => e.id));
  let i = 1;
  while (used.has(`effect-${i}`)) i += 1;
  return `effect-${i}`;
}

/**
 * Register an external image URL as a document asset and return its id.
 *
 * clotho v1 keeps image sources in a document-level `assets` registry rather than on the
 * element, so a document can be self-contained or host-resolved rather than tied to one
 * site's paths. An identical URL reuses its entry, so dropping the same image twice does
 * not grow the document.
 */
export function registerExternalAsset(url: string): string {
  const def = getDef();
  if (def) {
    for (const [id, asset] of Object.entries(def.assets)) {
      if (asset.kind === "external" && asset.url === url) return id;
    }
  }
  const id = uniqueAssetId();
  mutateDef(
    (draft) => {
      draft.assets[id] = { kind: "external", url };
    },
    `에셋 등록: ${id}`,
    "asset",
  );
  return id;
}

/** Register raw image bytes as an inline (base64) asset and return its id. */
export function registerInlineAsset(bytes: Uint8Array, mime: string): string {
  const { asset } = encodeImageAsset(bytes, mime);
  const def = getDef();
  if (def) {
    for (const [id, existing] of Object.entries(def.assets)) {
      if (
        existing.kind === "inline" &&
        existing.mime === asset.mime &&
        existing.data === asset.data
      )
        return id;
    }
  }
  const id = uniqueAssetId();
  mutateDef(
    (draft) => {
      draft.assets[id] = asset;
    },
    `에셋 등록: ${id}`,
    "asset",
  );
  return id;
}

function uniqueAssetId(): string {
  const def = getDef();
  const existing = def ? new Set(Object.keys(def.assets)) : new Set<string>();
  let n = 1;
  while (existing.has(`asset-${n}`)) n += 1;
  return `asset-${n}`;
}

/**
 * Register a `data:` URI as an inline asset and return its id.
 *
 * What a dropped or pasted file becomes. Storing it inline keeps the document
 * self-contained; a non-image or non-base64 URI falls back to an external reference so
 * the element still points at something.
 */
export function registerDataUriAsset(dataUri: string): string {
  const inline = inlineAssetFromDataUri(dataUri);
  if (!inline) return registerExternalAsset(dataUri);
  const def = getDef();
  if (def) {
    for (const [id, existing] of Object.entries(def.assets)) {
      if (
        existing.kind === "inline" &&
        existing.mime === inline.mime &&
        existing.data === inline.data
      )
        return id;
    }
  }
  const id = uniqueAssetId();
  mutateDef(
    (draft) => {
      draft.assets[id] = inline;
    },
    `에셋 등록: ${id}`,
    "asset",
  );
  return id;
}
