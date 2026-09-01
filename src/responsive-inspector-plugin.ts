import { compileResponsiveStage, type AnimationDocument } from "@kokoa/clotho";
import { renderDocumentToSvg } from "@kokoa/clotho/svg";
import type { EditorPluginDefinition } from "./plugin-host";

export const RESPONSIVE_VIEWPORTS = [
  { id: "compact", label: "모바일", width: 375 },
  { id: "regular", label: "본문", width: 768 },
  { id: "wide", label: "넓은 화면", width: 1280 },
] as const;

export function addDefaultResponsiveVariants(
  document: AnimationDocument,
): AnimationDocument {
  if (document.responsive?.length) return document;
  return {
    ...document,
    responsive: [
      {
        id: "compact",
        minWidth: 0,
        maxWidth: 479,
        chapterListPosition: "bottom",
        elementOverrides: {},
      },
      { id: "regular", minWidth: 480, maxWidth: 959, elementOverrides: {} },
      { id: "wide", minWidth: 960, elementOverrides: {} },
    ],
  };
}

export function createResponsiveInspectorPlugin(): EditorPluginDefinition {
  return {
    manifest: {
      id: "dev.clotho.responsive",
      name: "Responsive Stage",
      capabilities: ["editor"],
      editor: { inspectors: ["responsive"] },
    },
    inspectors: {
      responsive: {
        id: "responsive",
        label: "Responsive Stage",
        mount(container, context) {
          const render = () => {
            const document = context.getDocument();
            container.innerHTML = `<div class="studio-props-header"><span class="studio-props-header-title">Responsive Stage</span></div><button type="button" class="studio-btn" data-responsive-defaults>기본 breakpoint 만들기</button><div class="studio-responsive-grid">${RESPONSIVE_VIEWPORTS.map((viewport) => `<figure><figcaption>${viewport.label} · ${viewport.width}px</figcaption>${renderDocumentToSvg(compileResponsiveStage(document, viewport.width), 0)}</figure>`).join("")}</div>`;
          };
          const click = (event: Event) => {
            if (
              !(event.target as HTMLElement).closest(
                "[data-responsive-defaults]",
              )
            )
              return;
            context.replaceDocument(
              addDefaultResponsiveVariants(context.getDocument()),
            );
            render();
          };
          container.addEventListener("click", click);
          render();
          return () => container.removeEventListener("click", click);
        },
      },
    },
  };
}
