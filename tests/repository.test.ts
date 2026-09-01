import { describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { createLocalStorageRepository } from "../src/repository";

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const example = animationDocumentSchema.parse({
  clothoVersion: 1,
  id: "example",
  title: "예시",
  description: "기본 문서",
});

describe("localStorage 애니메이션 저장소", () => {
  test("예시와 사용자가 저장한 문서를 함께 표시한다", async () => {
    const repository = createLocalStorageRepository({
      storage: memoryStorage(),
      examples: [example],
    });
    const created = await repository.create("mine", "내 문서");
    await repository.save({ ...created, description: "수정됨" });

    expect(await repository.list()).toEqual([
      expect.objectContaining({ id: "mine", source: "saved" }),
      expect.objectContaining({ id: "example", source: "example" }),
    ]);
    expect((await repository.load("mine")).description).toBe("수정됨");
  });

  test("예시를 수정하면 같은 ID의 로컬 문서로 저장한다", async () => {
    const repository = createLocalStorageRepository({
      storage: memoryStorage(),
      examples: [example],
    });
    await repository.save({
      ...(await repository.load("example")),
      title: "수정한 예시",
    });

    expect((await repository.load("example")).title).toBe("수정한 예시");
    expect(await repository.list()).toHaveLength(1);
  });
});
