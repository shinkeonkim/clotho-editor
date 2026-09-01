import type { AnimationDocument } from "@kokoa/clotho";
import type { PaletteCommand } from "./legacy/studio-palette";
import type { Selection } from "./legacy/state";

export type EditorPluginSlot = "toolbar" | "panel" | "inspector";

export interface EditorPluginManifestLike {
  id: string;
  name: string;
  capabilities: readonly string[];
  editor?: {
    toolbarItems?: readonly string[];
    panels?: readonly string[];
    inspectors?: readonly string[];
  };
}

export interface EditorPluginPermissions {
  ui?: boolean;
  documentRead?: boolean;
  documentWrite?: boolean;
}

export interface EditorPluginContext {
  readonly pluginId: string;
  getDocument(): AnimationDocument;
  replaceDocument(document: AnimationDocument): void;
  getSelection(): Selection;
  setSelection(selection: Selection): void;
}

export interface EditorPluginView {
  id: string;
  label: string;
  mount(
    container: HTMLElement,
    context: EditorPluginContext,
  ): void | (() => void);
}

export interface EditorPluginDefinition {
  manifest: EditorPluginManifestLike;
  toolbarItems?: Record<string, EditorPluginView>;
  panels?: Record<string, EditorPluginView>;
  inspectors?: Record<string, EditorPluginView>;
  commands?: readonly PaletteCommand[];
}

export type EditorPluginPermissionResolver = (
  plugin: EditorPluginManifestLike,
) => EditorPluginPermissions;

export type DocumentImporter = (
  input: unknown,
) => AnimationDocument | Promise<AnimationDocument>;

export interface EditorPluginHostState {
  getDocument(): AnimationDocument | null;
  replaceDocument(document: AnimationDocument): void;
  getSelection(): Selection;
  setSelection(selection: Selection): void;
}

export interface EditorPluginMountResult {
  commands: PaletteCommand[];
  dispose(): void;
}

export interface EditorPluginIssue {
  pluginId: string;
  message: string;
}

const SLOT_KEYS: Record<
  EditorPluginSlot,
  keyof NonNullable<EditorPluginManifestLike["editor"]>
> = {
  toolbar: "toolbarItems",
  panel: "panels",
  inspector: "inspectors",
};

function viewsFor(
  plugin: EditorPluginDefinition,
  slot: EditorPluginSlot,
): Record<string, EditorPluginView> {
  if (slot === "toolbar") return plugin.toolbarItems ?? {};
  if (slot === "panel") return plugin.panels ?? {};
  return plugin.inspectors ?? {};
}

export function validateEditorPlugin(
  plugin: EditorPluginDefinition,
): EditorPluginIssue[] {
  const issues: EditorPluginIssue[] = [];
  const { id, capabilities, editor } = plugin.manifest;
  if (!capabilities.includes("editor")) {
    issues.push({ pluginId: id, message: "editor capability가 필요합니다." });
  }
  for (const slot of ["toolbar", "panel", "inspector"] as const) {
    const declared = new Set(editor?.[SLOT_KEYS[slot]] ?? []);
    const implemented = new Set(Object.keys(viewsFor(plugin, slot)));
    for (const viewId of declared) {
      if (!implemented.has(viewId)) {
        issues.push({
          pluginId: id,
          message: `${slot} ${viewId} 구현이 없습니다.`,
        });
      }
    }
    for (const viewId of implemented) {
      if (!declared.has(viewId)) {
        issues.push({
          pluginId: id,
          message: `${slot} ${viewId}가 manifest에 없습니다.`,
        });
      }
    }
  }
  return issues;
}

function permissionError(
  pluginId: string,
  permission: keyof EditorPluginPermissions,
): Error {
  return new Error(
    `Editor plugin ${pluginId}에는 ${permission} 권한이 없습니다.`,
  );
}

export function createEditorPluginContext(
  pluginId: string,
  permissions: EditorPluginPermissions,
  state: EditorPluginHostState,
): EditorPluginContext {
  return Object.freeze({
    pluginId,
    getDocument() {
      if (!permissions.documentRead)
        throw permissionError(pluginId, "documentRead");
      const document = state.getDocument();
      if (!document) throw new Error("열린 애니메이션이 없습니다.");
      return structuredClone(document);
    },
    replaceDocument(document: AnimationDocument) {
      if (!permissions.documentWrite)
        throw permissionError(pluginId, "documentWrite");
      state.replaceDocument(structuredClone(document));
    },
    getSelection() {
      if (!permissions.documentRead)
        throw permissionError(pluginId, "documentRead");
      return structuredClone(state.getSelection());
    },
    setSelection(selection: Selection) {
      if (!permissions.documentWrite)
        throw permissionError(pluginId, "documentWrite");
      state.setSelection(structuredClone(selection));
    },
  });
}

export function mountEditorPlugins(
  root: HTMLElement,
  plugins: readonly EditorPluginDefinition[],
  resolvePermissions: EditorPluginPermissionResolver,
  state: EditorPluginHostState,
): EditorPluginMountResult {
  const cleanups: (() => void)[] = [];
  const commands: PaletteCommand[] = [];
  const seen = new Set<string>();

  for (const plugin of plugins) {
    const { id } = plugin.manifest;
    if (seen.has(id))
      throw new Error(`Editor plugin ${id}가 중복 등록되었습니다.`);
    seen.add(id);
    const issues = validateEditorPlugin(plugin);
    if (issues.length > 0)
      throw new Error(issues.map((issue) => issue.message).join(" "));
    const permissions = resolvePermissions(plugin.manifest);
    if (!permissions.ui) continue;
    const context = createEditorPluginContext(id, permissions, state);
    commands.push(...(plugin.commands ?? []));

    for (const slot of ["toolbar", "panel", "inspector"] as const) {
      const target = root.querySelector<HTMLElement>(
        `[data-editor-plugin-slot="${slot}"]`,
      );
      if (!target) continue;
      for (const viewId of plugin.manifest.editor?.[SLOT_KEYS[slot]] ?? []) {
        const view = viewsFor(plugin, slot)[viewId];
        if (!view) continue;
        const container = document.createElement(
          slot === "toolbar" ? "span" : "section",
        );
        container.dataset.editorPlugin = id;
        container.dataset.editorPluginView = viewId;
        container.setAttribute("aria-label", view.label);
        target.append(container);
        const cleanup = view.mount(container, context);
        if (cleanup) cleanups.push(cleanup);
      }
    }
  }

  return {
    commands,
    dispose() {
      cleanups.reverse().forEach((cleanup) => cleanup());
      root
        .querySelectorAll("[data-editor-plugin]")
        .forEach((element) => element.remove());
    },
  };
}
