import { describe, expect, it } from "bun:test";
import { bindTimelinePointerDocument } from "../src/legacy/timeline";

describe("분리된 타임라인의 문서 이벤트", () => {
  it("popup document에 drag 이벤트를 한 번만 연결하고 합칠 때 제거한다", () => {
    const added: string[] = [];
    const removed: string[] = [];
    const fakeDocument = {
      addEventListener(type: string) {
        added.push(type);
      },
      removeEventListener(type: string) {
        removed.push(type);
      },
    } as unknown as Document;

    const firstCleanup = bindTimelinePointerDocument(fakeDocument);
    const secondCleanup = bindTimelinePointerDocument(fakeDocument);

    expect(firstCleanup).toBe(secondCleanup);
    expect(added).toEqual(["mousemove", "mouseup"]);

    firstCleanup();
    expect(removed).toEqual(["mousemove", "mouseup"]);
  });
});
