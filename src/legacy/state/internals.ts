import type { AnimationDocument, AnimationElement } from "@kokoa/clotho";
import { animationDocumentSchema } from "@kokoa/clotho";
import type {
  HistoryEntry,
  HistoryKind,
  InternalState,
  Listener,
} from "./types";

const listeners = new Set<Listener>();

export const state: InternalState = {
  def: null,
  dirty: false,
  selection: { kind: "none" },
  currentTime: 0,
  isDraft: false,
};

const HISTORY_LIMIT = 60;

export const past: HistoryEntry[] = [];
export const future: HistoryEntry[] = [];

let inTransient = false;

export function snapshotJson(): string | null {
  return state.def ? JSON.stringify(state.def) : null;
}

export function pushHistory(label: string, kind: HistoryKind): void {
  const snap = snapshotJson();
  if (snap === null) return;
  past.push({ snap, label, kind, timestamp: Date.now() });
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
}

export function setInTransient(value: boolean): void {
  inTransient = value;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  for (const fn of listeners) fn();
}

export function mutateDef(
  fn: (def: AnimationDocument) => void,
  label = "edit",
  kind: HistoryKind = "other",
): void {
  if (!state.def) return;
  if (!inTransient) pushHistory(label, kind);
  const cloned = JSON.parse(JSON.stringify(state.def));
  fn(cloned);
  const parsed = animationDocumentSchema.safeParse(cloned);
  if (!parsed.success) {
    past.pop();
    console.warn("[studio.state] invalid mutation", parsed.error.issues);
    return;
  }
  // Older compatible Clotho versions strip newly introduced localization
  // properties. Preserve them while the editor supports the current schema.
  const localized = cloned as AnimationDocument & { locales?: string[] };
  const next = parsed.data as AnimationDocument & { locales?: string[] };
  if (localized.locales) next.locales = localized.locales;
  next.elements = next.elements.map((element, index) => {
    const source = localized.elements[index] as AnimationElement & {
      locales?: string[];
      translations?: Record<string, string>;
    };
    if (source?.id !== element.id || element.type !== "text") return element;
    return {
      ...element,
      ...(source.locales ? { locales: source.locales } : {}),
      ...(source.translations ? { translations: source.translations } : {}),
    } as AnimationElement;
  });
  state.def = next;
  state.dirty = true;
  emit();
}
