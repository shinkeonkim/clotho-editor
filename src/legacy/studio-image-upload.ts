import {
  addElement,
  getDef,
  registerDataUriAsset,
  registerExternalAsset,
  uniqueElementId,
} from "./state";

export type SetStatus = (text: string, kind?: "ok" | "warn" | "error") => void;

export interface ImageUploadHost {
  app: HTMLElement;
  setStatus: SetStatus;
  resolveImage?: ImageUploadResolver;
}

export type ImageUploadResolver = (file: File) => Promise<string> | string;

function loadImageSize(src: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다"));
    reader.readAsDataURL(file);
  });
}

// MinIO(media-api) 미가용: 업로드 대신 data URL 로 인라인해 def 에 직접 직렬화한다.
export async function uploadAndInsertImage(
  file: File,
  host: ImageUploadHost,
): Promise<void> {
  const def = getDef();
  if (!def) {
    host.setStatus("먼저 애니메이션을 열거나 만드세요", "warn");
    return;
  }
  try {
    host.setStatus("이미지 처리 중…");
    const source = host.resolveImage
      ? await host.resolveImage(file)
      : await readAsDataUrl(file);
    const cx = def.canvas.width / 2;
    const cy = def.canvas.height / 2;
    const tempImg = await loadImageSize(source);
    const maxDim = Math.min(def.canvas.width, def.canvas.height) * 0.5;
    let w = tempImg?.w ?? 200;
    let h = tempImg?.h ?? 200;
    if (w > maxDim || h > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const id = uniqueElementId("img");
    addElement({
      type: "image",
      id,
      rotation: 0,
      appearances: [],
      tracks: [],
      bindings: [],
      x: Math.round(cx - w / 2),
      y: Math.round(cy - h / 2),
      width: w,
      height: h,
      assetId: source.startsWith("data:")
        ? registerDataUriAsset(source)
        : registerExternalAsset(source),
      preserveAspectRatio: "xMidYMid meet",
      opacity: 1,
    });
    host.setStatus(`이미지 삽입 완료 (${file.name})`, "ok");
  } catch (err) {
    host.setStatus(
      "이미지 삽입 실패: " + (err instanceof Error ? err.message : String(err)),
      "error",
    );
  }
}

export function setupImageDropAndPaste(host: ImageUploadHost): void {
  const canvasWrap = host.app.querySelector<HTMLElement>(".studio-canvas-wrap");
  if (canvasWrap) {
    canvasWrap.addEventListener("dragover", (e) => {
      if (!e.dataTransfer) return;
      const hasFiles = Array.from(e.dataTransfer.items ?? []).some(
        (it) => it.kind === "file",
      );
      if (hasFiles) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        canvasWrap.classList.add("is-drop-target");
      }
    });
    canvasWrap.addEventListener("dragleave", () =>
      canvasWrap.classList.remove("is-drop-target"),
    );
    canvasWrap.addEventListener("drop", (e) => {
      canvasWrap.classList.remove("is-drop-target");
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        void uploadAndInsertImage(file, host);
      }
    });
  }
  document.addEventListener("paste", (e) => {
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadAndInsertImage(file, host);
          return;
        }
      }
    }
  });
}
