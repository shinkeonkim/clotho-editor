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
  garbageCollectAnimationAssets,
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
export {
  createEditorPluginContext,
  mountEditorPlugins,
  validateEditorPlugin,
} from "./plugin-host";
export {
  createTemplateEditorPlugin,
  initialParameterValue,
  parameterInputValue,
} from "./template-editor-plugin";
export { createVisualRegressionPlugin } from "./visual-regression-plugin";
export {
  createStoryEditorPlugin,
  appendStoryEdge,
  replaceStoryNodeDocument,
} from "./story-editor-plugin";
export type { StoryEditorOptions } from "./story-editor-plugin";
export {
  createResponsiveInspectorPlugin,
  addDefaultResponsiveVariants,
  RESPONSIVE_VIEWPORTS,
} from "./responsive-inspector-plugin";
export {
  createPerformanceProfilerPlugin,
  profileAnimation,
} from "./performance-profiler-plugin";
export type { SceneProfile } from "./performance-profiler-plugin";
export type {
  DocumentImporter,
  EditorPluginContext,
  EditorPluginDefinition,
  EditorPluginHostState,
  EditorPluginManifestLike,
  EditorPluginMountResult,
  EditorPluginPermissionResolver,
  EditorPluginPermissions,
  EditorPluginSlot,
  EditorPluginView,
} from "./plugin-host";
