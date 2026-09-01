import { updateElementBase } from "../state";

interface InlineTextTarget {
  id: string;
  x: number;
  y: number;
  content: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;
  textAnchor?: "start" | "middle" | "end";
}

export function startInlineTextEdit(
  canvas: SVGSVGElement,
  el: InlineTextTarget,
): void {
  canvas
    .querySelectorAll("[data-inline-text-editor]")
    .forEach((n) => n.remove());
  const fontSize = el.fontSize ?? 16;
  const fo = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  fo.setAttribute("data-inline-text-editor", "");
  const width = Math.max(80, (el.content?.length ?? 5) * fontSize * 0.7 + 20);
  const anchor = el.textAnchor ?? "start";
  const x =
    anchor === "middle"
      ? el.x - width / 2
      : anchor === "end"
        ? el.x - width
        : el.x;
  fo.setAttribute("x", String(x));
  fo.setAttribute("y", String(el.y - fontSize * 1.15));
  fo.setAttribute("width", String(width));
  fo.setAttribute("height", String(fontSize * 1.8));
  const renderedText = Array.from(
    canvas.querySelectorAll<SVGElement>("[data-elem-id]"),
  ).find((node) => node.dataset.elemId === el.id);
  const previousVisibility = renderedText?.style.visibility ?? "";
  if (renderedText) renderedText.style.visibility = "hidden";
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  editor.spellcheck = false;
  editor.textContent = el.content ?? "";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-label", "텍스트 내용 편집");
  Object.assign(editor.style, {
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    border: "0",
    borderBottom: "2px solid #6366f1",
    background: "color-mix(in srgb, Canvas 82%, transparent)",
    padding: "0 2px",
    font: `${el.fontWeight ?? 400} ${fontSize}px ui-sans-serif,system-ui,sans-serif`,
    color: el.color ?? "#0f172a",
    outline: "none",
    whiteSpace: "pre",
    overflow: "hidden",
  });
  fo.appendChild(editor);
  canvas.appendChild(fo);
  requestAnimationFrame(() => {
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  let settled = false;
  const restoreRenderedText = (): void => {
    if (renderedText) renderedText.style.visibility = previousVisibility;
  };
  const commit = (): void => {
    if (settled) return;
    settled = true;
    const newContent = editor.textContent ?? "";
    fo.remove();
    restoreRenderedText();
    if (newContent !== el.content) {
      updateElementBase(el.id, { content: newContent });
    }
  };
  const cancel = (): void => {
    if (settled) return;
    settled = true;
    fo.remove();
    restoreRenderedText();
  };
  let isComposingFallback = false;
  editor.addEventListener("compositionstart", () => {
    isComposingFallback = true;
  });
  editor.addEventListener("compositionend", () => {
    isComposingFallback = false;
  });
  editor.addEventListener("blur", commit);
  editor.addEventListener("keydown", (e) => {
    if (e.isComposing || isComposingFallback) return;
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  });
}
