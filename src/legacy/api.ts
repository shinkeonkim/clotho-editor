import { animationDocumentSchema, type AnimationDocument } from '@shinkeonkim/clotho';

// Where documents live is the host's business, not the editor's.
//
// This was hardcoded to one blog's admin route. A standalone editor cannot assume any
// particular backend, so the base is configurable and defaults to the previous value —
// existing hosts keep working without a change.
const DEFAULT_BASE = '/api/admin/animations';
let BASE = DEFAULT_BASE;

/** Point the editor at the host's animation endpoints. Call once at startup. */
export function configureApi(options: { baseUrl?: string }): void {
  if (options.baseUrl) BASE = options.baseUrl.replace(/\/+$/, '');
}

/** The base currently in use, for hosts that need to build matching links. */
export function apiBaseUrl(): string {
  return BASE;
}

const revisions = new Map<string, number>();

export interface AnimationSummary {
  id: string;
  title: string;
  description: string;
  updatedAt?: string;
}

export class MissingAnimationRevisionError extends Error {}
export class AnimationStudioApiError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readJson(res: Response): Promise<unknown> {
  if (!res.ok) {
    const text = await res.text();
    throw new AnimationStudioApiError(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function parseRevision(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError('Animation revision is malformed');
  }
  return value;
}

function parseAnimationEnvelope(value: unknown): { readonly def: AnimationDocument; readonly revision: number } {
  if (!isRecord(value)) throw new TypeError('Animation response is malformed');
  return { def: animationDocumentSchema.parse(value.def), revision: parseRevision(value.revision) };
}

export async function listAnimations(): Promise<AnimationSummary[]> {
  const res = await fetch(BASE);
  const data = await readJson(res);
  if (!isRecord(data) || !Array.isArray(data.items)) throw new TypeError('Animation list response is malformed');
  return data.items.map((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string' || typeof item.description !== 'string') {
      throw new TypeError('Animation summary is malformed');
    }
    return { id: item.id, title: item.title, description: item.description, ...(typeof item.updatedAt === 'string' ? { updatedAt: item.updatedAt } : {}) };
  });
}

export async function loadAnimation(id: string): Promise<AnimationDocument> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`);
  const data = parseAnimationEnvelope(await readJson(res));
  revisions.set(data.def.id, data.revision);
  return data.def;
}

export async function saveAnimation(def: AnimationDocument): Promise<AnimationDocument> {
  const revision = revisions.get(def.id);
  if (revision === undefined) throw new MissingAnimationRevisionError(`Animation '${def.id}' has no loaded revision`);
  const res = await fetch(`${BASE}/${encodeURIComponent(def.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ def, revision }),
  });
  const data = parseAnimationEnvelope(await readJson(res));
  revisions.set(data.def.id, data.revision);
  return data.def;
}

export async function createAnimation(id: string, title: string): Promise<AnimationDocument> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title }),
  });
  const data = parseAnimationEnvelope(await readJson(res));
  revisions.set(data.def.id, data.revision);
  return data.def;
}

export async function deleteAnimation(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await readJson(res);
  revisions.delete(id);
}

export async function duplicateAnimation(
  sourceId: string,
  newId: string,
  newTitle: string,
): Promise<AnimationDocument> {
  const source = await loadAnimation(sourceId);
  const cloned: AnimationDocument = { ...source, id: newId, title: newTitle };
  await createAnimation(newId, newTitle);
  return await saveAnimation(cloned);
}
