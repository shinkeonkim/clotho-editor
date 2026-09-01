import { compileDataBindings, type AnimationDocument } from "@kokoa/clotho";
import type { StageHandle } from "@kokoa/clotho/dom";

// Preview now renders through clotho's DOM adapter rather than a React island.
//
// This is the point of the migration for the editor: the preview and the published
// animation go through the same `buildScene` + `patchScene`, so what the author sees
// here is what a reader gets. Before, the Studio had its own canvas renderer and the
// site had another, and the two could disagree.

let previewRoot: HTMLDivElement | null = null;
let previewHandle: StageHandle | null = null;
let unsubscribePreview: (() => void) | null = null;

export interface PreviewOptions {
  loop: boolean;
  speed: number;
  onTime(time: number): void;
  onEnd(): void;
}

async function mountPreview(
  host: HTMLElement,
  doc: AnimationDocument,
  options: PreviewOptions,
): Promise<void> {
  const { mountStage } = await import("@kokoa/clotho/dom");
  // The stage only, without controls: the Studio has its own timeline and transport.
  previewHandle = mountStage(host, doc, {
    player: {
      autoplay: true,
      loop: options.loop,
      speed: options.speed,
      onEnd: options.onEnd,
    },
  });
  unsubscribePreview = previewHandle.player.subscribe((state) => {
    options.onTime(state.time);
  });
}

export function showPreview(
  canvasEl: SVGSVGElement | null,
  def: AnimationDocument,
  options: PreviewOptions,
): void {
  if (!canvasEl) return;
  const parent = canvasEl.parentElement;
  if (!parent) return;
  hidePreview(canvasEl);
  canvasEl.style.visibility = "hidden";
  previewRoot = document.createElement("div");
  const bg =
    def.canvas.background && def.canvas.background !== "transparent"
      ? def.canvas.background
      : "transparent";
  previewRoot.style.cssText = `position:absolute;left:0;top:0;width:${def.canvas.width}px;height:${def.canvas.height}px;background:${bg};z-index:2;overflow:hidden;`;
  parent.style.position = "relative";
  parent.appendChild(previewRoot);
  void mountPreview(previewRoot, compileDataBindings(def).document, options);
}

export function hidePreview(canvasEl: SVGSVGElement | null): void {
  if (canvasEl) canvasEl.style.visibility = "";
  // Destroying the handle stops the player's frame loop; without it the preview would
  // keep requesting frames after being detached.
  unsubscribePreview?.();
  unsubscribePreview = null;
  previewHandle?.destroy();
  previewHandle = null;
  if (previewRoot) {
    previewRoot.remove();
    previewRoot = null;
  }
}
