import type { Checkpoint } from "@kokoa/clotho";
import { mutateDef } from "./internals";

export function addCheckpoint(checkpoint: Checkpoint): void {
  mutateDef(
    (def) => {
      def.checkpoints.push(checkpoint);
      def.checkpoints.sort((a, b) => a.time - b.time);
    },
    `Checkpoint 추가: ${checkpoint.id}`,
    "checkpoint",
  );
}

export function updateCheckpoint(id: string, patch: Partial<Checkpoint>): void {
  mutateDef(
    (def) => {
      const index = def.checkpoints.findIndex(
        (checkpoint) => checkpoint.id === id,
      );
      if (index < 0) return;
      def.checkpoints[index] = {
        ...def.checkpoints[index],
        ...patch,
      } as Checkpoint;
      def.checkpoints.sort((a, b) => a.time - b.time);
    },
    `Checkpoint 수정: ${id}`,
    "checkpoint",
  );
}

export function deleteCheckpoint(id: string): void {
  mutateDef(
    (def) => {
      def.checkpoints = def.checkpoints.filter(
        (checkpoint) => checkpoint.id !== id,
      );
    },
    `Checkpoint 삭제: ${id}`,
    "checkpoint",
  );
}

export function uniqueCheckpointId(): string {
  return `checkpoint-${Date.now().toString(36)}`;
}
