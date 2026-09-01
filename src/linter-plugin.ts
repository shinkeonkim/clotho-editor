import { autofixDocument, lintDocument } from "@kokoa/clotho";
import { renderDocumentToSvg } from "@kokoa/clotho/svg";
import type { EditorPluginDefinition } from "./plugin-host";

export function createLinterPlugin(): EditorPluginDefinition {
  return {
    manifest: {
      id: "dev.clotho.linter",
      name: "Clotho Linter",
      capabilities: ["editor"],
      editor: { inspectors: ["linter"] },
    },
    inspectors: {
      linter: {
        id: "linter",
        label: "Clotho Linter",
        mount(container, context) {
          let selectedIndex = 0;
          const render = () => {
            const document = context.getDocument();
            const issues = lintDocument(document);
            const selected = issues[selectedIndex] ?? issues[0];
            const fixed = autofixDocument(document).document;
            container.innerHTML = `<div class="studio-props-header"><span class="studio-props-header-title">Clotho Linter (${issues.length})</span><button type="button" class="studio-btn" data-lint-fix ${issues.some(({ fixable }) => fixable) ? "" : "disabled"}>안전한 수정 적용</button></div><ol class="studio-lint-list">${issues.map((issue, index) => `<li><button type="button" data-lint-index="${index}" data-element-id="${issue.elementId ?? ""}"><strong>${escapeHtml(issue.ruleId)}</strong><span>${escapeHtml(issue.message)}</span>${issue.fixable ? "<em>자동 수정</em>" : ""}</button></li>`).join("") || "<li>문제가 없습니다.</li>"}</ol>${selected ? `<div class="studio-lint-compare"><figure><figcaption>현재</figcaption>${renderDocumentToSvg(document, selected.time ?? 0)}</figure><figure><figcaption>수정 후</figcaption>${renderDocumentToSvg(fixed, selected.time ?? 0)}</figure></div>` : ""}`;
          };
          const click = (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-lint-fix]")) {
              context.replaceDocument(
                autofixDocument(context.getDocument()).document,
              );
              selectedIndex = 0;
              render();
              return;
            }
            const issue = target.closest<HTMLElement>("[data-lint-index]");
            if (!issue) return;
            selectedIndex = Number(issue.dataset.lintIndex);
            if (issue.dataset.elementId)
              context.setSelection({
                kind: "element",
                elementId: issue.dataset.elementId,
              });
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
