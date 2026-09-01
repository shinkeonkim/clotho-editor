import { animationDocumentSchema, type AnimationDocument } from "@kokoa/clotho";

export interface AnimationSummary {
  id: string;
  title: string;
  description: string;
  updatedAt?: string;
  source?: "saved" | "example";
}

export interface AnimationRepository {
  list(): Promise<AnimationSummary[]>;
  load(id: string): Promise<AnimationDocument>;
  create(id: string, title: string): Promise<AnimationDocument>;
  save(def: AnimationDocument): Promise<AnimationDocument>;
  delete(id: string): Promise<void>;
}

export interface LocalStorageRepositoryOptions {
  storageKey?: string;
  examples?: readonly AnimationDocument[];
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

function browserStorage(): Storage {
  if (typeof localStorage === "undefined")
    throw new Error("이 저장소는 브라우저에서만 사용할 수 있습니다.");
  return localStorage;
}

export function createLocalStorageRepository(
  options: LocalStorageRepositoryOptions = {},
): AnimationRepository {
  const prefix = options.storageKey ?? "clotho-editor.animations";
  const examples = new Map(
    (options.examples ?? []).map((value) => {
      const def = animationDocumentSchema.parse(value);
      return [def.id, def] as const;
    }),
  );
  const storage = (): Pick<Storage, "getItem" | "setItem" | "removeItem"> =>
    options.storage ?? browserStorage();
  const indexKey = `${prefix}:index`;
  const documentKey = (id: string): string => `${prefix}:document:${id}`;
  const readIds = (): string[] => {
    const value = storage().getItem(indexKey);
    if (!value) return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  };
  const write = (def: AnimationDocument): AnimationDocument => {
    const parsed = animationDocumentSchema.parse(def);
    const ids = readIds();
    if (!ids.includes(parsed.id))
      storage().setItem(indexKey, JSON.stringify([...ids, parsed.id]));
    storage().setItem(documentKey(parsed.id), JSON.stringify(parsed));
    return parsed;
  };
  const read = (id: string): AnimationDocument | null => {
    const value = storage().getItem(documentKey(id));
    return value ? animationDocumentSchema.parse(JSON.parse(value)) : null;
  };

  return {
    async list() {
      const saved = readIds()
        .map((id) => read(id))
        .filter((def): def is AnimationDocument => def !== null);
      const savedIds = new Set(saved.map((def) => def.id));
      return [
        ...saved.map((def) => ({
          id: def.id,
          title: def.title || def.id,
          description: def.description,
          source: "saved" as const,
        })),
        ...[...examples.values()]
          .filter((def) => !savedIds.has(def.id))
          .map((def) => ({
            id: def.id,
            title: def.title || def.id,
            description: def.description,
            source: "example" as const,
          })),
      ];
    },
    async load(id) {
      const def = read(id) ?? examples.get(id);
      if (!def) throw new Error(`'${id}' 애니메이션을 찾을 수 없습니다.`);
      return structuredClone(def);
    },
    async create(id, title) {
      if (read(id)) throw new Error(`'${id}' 애니메이션이 이미 있습니다.`);
      return write(
        animationDocumentSchema.parse({
          clothoVersion: 1,
          id,
          title,
          description: "",
        }),
      );
    },
    async save(def) {
      return write(def);
    },
    async delete(id) {
      storage().removeItem(documentKey(id));
      storage().setItem(
        indexKey,
        JSON.stringify(readIds().filter((value) => value !== id)),
      );
    },
  };
}
