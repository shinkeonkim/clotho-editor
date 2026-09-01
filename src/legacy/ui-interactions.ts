import type { Selection } from "./state";
import { toggleSelectionFor } from "./state";
import type { StudioTool } from "./tool-state";

export interface SelectionModifiers {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export function hasSelectionModifier(modifiers: SelectionModifiers): boolean {
  return modifiers.shiftKey || modifiers.ctrlKey || modifiers.metaKey;
}

export function shouldDeferElementPointerDown(
  modifiers: SelectionModifiers,
  options: { isElement: boolean; isHandle: boolean },
): boolean {
  return (
    hasSelectionModifier(modifiers) && options.isElement && !options.isHandle
  );
}

export function nextPointerSelection(
  current: Selection,
  elementId: string,
  modifiers: SelectionModifiers,
): Selection {
  return hasSelectionModifier(modifiers)
    ? toggleSelectionFor(current, elementId)
    : { kind: "element", elementId };
}

const TOOL_SHORTCUTS: Readonly<Partial<Record<string, StudioTool>>> = {
  v: "select",
  r: "rect",
  o: "circle",
  l: "line",
  a: "arrow",
  t: "text",
  i: "image",
  b: "path",
  y: "polygon",
};

export function toolForShortcut(
  key: string,
  options: { isEditing: boolean; modifierKey: boolean; altKey: boolean },
): StudioTool | null {
  if (options.isEditing || options.modifierKey || options.altKey) return null;
  return TOOL_SHORTCUTS[key.toLowerCase()] ?? null;
}
