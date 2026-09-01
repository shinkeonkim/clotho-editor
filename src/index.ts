// Public entry for the clotho editor.
//
// The editor is a port of the Studio that grew inside two blogs, rebuilt on
// @kokoa/clotho. What it no longer carries is everything clotho now provides:
// the document schema, the runtime, the anchor geometry, and — most consequentially —
// the canvas preview, which used to be a second renderer that could disagree with the
// one readers saw.
//
// See docs/PORTING.md for what moved and why.

export { Studio } from "./Studio";
export type { StudioProps } from "./Studio";
export { StudioMount } from "./StudioMount";
export type { StudioMountProps } from "./StudioMount";
export {
  animationDocumentFileName,
  animationDocumentToJson,
  downloadAnimationJson,
} from "./export-json";

// The headless pieces, for hosts building their own shell.
export * from "./legacy/state";
export {
  childIdsOf,
  groupElements,
  ungroupElement,
  isGroup,
} from "./legacy/studio-groups";

// Host wiring: where documents are stored and which assets the editor reaches for.
// Both default to what the original Studio used, so an existing host needs no change.
export { configureApi, apiBaseUrl } from "./legacy/api";
export { configureAnimationRepository } from "./legacy/api";
export { createLocalStorageRepository } from "./repository";
export type {
  AnimationRepository,
  AnimationSummary,
  LocalStorageRepositoryOptions,
} from "./repository";
export { configureHost, placeholderImageUrl } from "./legacy/host";
export type { HostOptions } from "./legacy/host";
export type { ImageUploadResolver } from "./legacy/studio-image-upload";
