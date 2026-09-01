export function prepareStudioPopupDocument(
  popupDocument: Document,
  sourceDocument: Document,
  sourceApp: HTMLElement,
  options: { title: string; bodyClass: string },
): void {
  popupDocument.open();
  popupDocument.write(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(options.title)}</title></head><body class="editor-active ${escapeHtml(options.bodyClass)}"></body></html>`,
  );
  popupDocument.close();

  const base = popupDocument.createElement("base");
  base.href = sourceDocument.baseURI;
  popupDocument.head.prepend(base);

  for (const source of sourceDocument.querySelectorAll(
    'link[rel="stylesheet"], style',
  )) {
    popupDocument.head.appendChild(source.cloneNode(true));
  }

  const computed = getComputedStyle(sourceApp);
  const target = popupDocument.documentElement.style;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property.startsWith("--")) {
      target.setProperty(property, computed.getPropertyValue(property));
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
