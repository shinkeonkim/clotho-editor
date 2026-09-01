import { beforeEach, describe, expect, test } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import {
  addCheckpoint,
  deleteCheckpoint,
  getDef,
  setDef,
  updateCheckpoint,
} from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "checkpoint-editor",
      duration: 2000,
    }),
  );
});

describe("checkpoint editing", () => {
  test("추가, 수정, 정렬과 삭제를 schema-valid 상태로 유지한다", () => {
    addCheckpoint({
      id: "later",
      time: 1200,
      prompt: "계속",
      required: true,
      interaction: "continue",
    });
    addCheckpoint({
      id: "predict",
      time: 500,
      prompt: "다음 값은?",
      required: true,
      interaction: "choice",
      options: [{ value: "2", label: "2" }],
    });
    expect(getDef()!.checkpoints.map(({ id }) => id)).toEqual([
      "predict",
      "later",
    ]);
    updateCheckpoint("predict", { predicate: { type: "equals", value: "2" } });
    expect(getDef()!.checkpoints[0]).toMatchObject({
      predicate: { value: "2" },
    });
    deleteCheckpoint("later");
    expect(getDef()!.checkpoints).toHaveLength(1);
    expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
  });
});
