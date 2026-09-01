import type { AnimationDocument } from "@kokoa/clotho";

export type Selection =
  | { kind: "none" }
  | { kind: "element"; elementId: string }
  | { kind: "elements"; elementIds: string[] }
  | { kind: "chapter"; chapterId: string }
  | { kind: "effect"; effectId: string };

export interface InternalState {
  def: AnimationDocument | null;
  dirty: boolean;
  selection: Selection;
  currentTime: number;
  isDraft: boolean;
}

export type HistoryKind =
  | "meta"
  | "canvas"
  | "settings"
  | "add"
  | "delete"
  | "move"
  | "style"
  | "rotate"
  | "resize"
  | "reorder"
  | "track"
  | "appearance"
  | "chapter"
  | "effect"
  | "group"
  // Registering an image asset is a document edit, so it belongs in history.
  | "asset"
  | "other";

export interface HistoryEntry {
  snap: string;
  label: string;
  kind: HistoryKind;
  timestamp: number;
}

export type Listener = () => void;
