import { animationDocumentSchema, type AnimationDocument } from "@kokoa/clotho";

/** 검증된 애니메이션 문서를 읽기 쉬운 JSON으로 변환한다. */
export function animationDocumentToJson(def: AnimationDocument): string {
  const parsed = garbageCollectAnimationAssets(def);
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

/** 어떤 image 요소에서도 참조하지 않는 asset을 제거한 새 문서를 반환한다. */
export function garbageCollectAnimationAssets(
  def: AnimationDocument,
): AnimationDocument {
  const parsed = animationDocumentSchema.parse(def);
  const used = new Set(
    parsed.elements
      .filter((element) => element.type === "image")
      .map((element) => element.assetId),
  );
  return animationDocumentSchema.parse({
    ...parsed,
    assets: Object.fromEntries(
      Object.entries(parsed.assets).filter(([id]) => used.has(id)),
    ),
  });
}

/** 문서 ID를 운영체제에서 안전하게 사용할 수 있는 파일 이름으로 바꾼다. */
export function animationDocumentFileName(def: AnimationDocument): string {
  const id = def.id.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
  return `${id || "animation"}.json`;
}

/** 현재 문서를 브라우저에서 JSON 파일로 내려받는다. */
export function downloadAnimationJson(def: AnimationDocument): void {
  if (
    typeof document === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("JSON 파일은 브라우저에서만 내려받을 수 있습니다.");
  }

  const url = URL.createObjectURL(
    new Blob([animationDocumentToJson(def)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = animationDocumentFileName(def);
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
