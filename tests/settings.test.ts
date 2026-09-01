import { beforeEach, describe, expect, it } from "bun:test";
import { animationDocumentSchema } from "@kokoa/clotho";
import { getDef, setDef, updateSettings } from "../src/legacy/state";

beforeEach(() => {
  setDef(
    animationDocumentSchema.parse({
      clothoVersion: 1,
      id: "settings-demo",
      duration: 1000,
      chapters: [{ id: "one", time: 0, label: "One" }],
    }),
  );
});

describe("player settings editing", () => {
  it.each(["left", "right", "top", "bottom"] as const)(
    "stores the %s chapter-list position in document JSON",
    (chapterListPosition) => {
      updateSettings({ showChapterList: true, chapterListPosition });
      expect(getDef()!.settings).toMatchObject({
        showChapterList: true,
        chapterListPosition,
      });
      expect(animationDocumentSchema.safeParse(getDef()).success).toBe(true);
    },
  );
});
