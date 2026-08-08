import { afterEach, expect, test } from "bun:test";
import { loadAnimation, saveAnimation } from "./api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Given a loaded animation revision, when saved twice, then each PUT uses the latest revision", async () => {
  // Given
  const sentRevisions = [];
  let responseRevision = 7;
  // v1 envelope: the editor reads and writes clotho documents now.
  const def = { clothoVersion: 1, id: "revision-animation", title: "Revision Animation", elements: [] };
  globalThis.fetch = async (_input, init) => {
    if (init?.method !== "PUT") return Response.json({ def, revision: responseRevision });
    if (typeof init.body !== "string") throw new TypeError("Expected a JSON body");
    const body = JSON.parse(init.body);
    if (typeof body !== "object" || body === null || typeof body.revision !== "number") throw new TypeError("Expected a revision");
    sentRevisions.push(body.revision);
    responseRevision += 1;
    return Response.json({ def: body.def, revision: responseRevision });
  };

  // When
  const loaded = await loadAnimation("revision-animation");
  await saveAnimation({ ...loaded, title: "First Save" });
  await saveAnimation({ ...loaded, title: "Second Save" });

  // Then
  expect(sentRevisions).toEqual([7, 8]);
});
