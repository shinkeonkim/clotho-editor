import {
  getDef,
  getSelection,
  setSelection,
  deleteElement,
  subscribe,
  reorderElement,
  isElementSelected,
  registerExternalAsset,
} from "./state";
import type { AnimationElement } from "@kokoa/clotho";
import { placeholderImageUrl } from "./host";
import {
  setActiveTool,
  subscribeActiveTool,
  type StudioTool,
} from "./tool-state";
import { nextPointerSelection } from "./ui-interactions";

let listEl: HTMLElement | null = null;
let toolsRootEl: HTMLElement | null = null;
let searchEl: HTMLInputElement | null = null;
let dragSourceId: string | null = null;

export function initElementList(
  root: HTMLElement,
  toolsRoot: HTMLElement | null,
): void {
  listEl = root;
  toolsRootEl = toolsRoot;
  searchEl = document.getElementById(
    "studio-element-search",
  ) as HTMLInputElement | null;
  subscribe(render);
  root.addEventListener("click", onClick);
  root.addEventListener("dragstart", onDragStart);
  root.addEventListener("dragover", onDragOver);
  root.addEventListener("dragleave", onDragLeave);
  root.addEventListener("drop", onDrop);
  root.addEventListener("dragend", onDragEnd);
  toolsRootEl?.addEventListener("click", onToolsClick);
  subscribeActiveTool((tool) => {
    toolsRootEl?.setAttribute("data-active-tool", tool);
    document.body.dataset.studioTool = tool;
    toolsRootEl
      ?.querySelectorAll<HTMLElement>("[data-studio-tool], [data-add-element]")
      .forEach((button) => {
        const value = button.dataset.studioTool ?? button.dataset.addElement;
        const active = value === tool;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
  });
  searchEl?.addEventListener("input", render);
  searchEl?.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchEl) {
      searchEl.value = "";
      render();
    }
  });
  render();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function friendlyElementLabel(el: AnimationElement): string {
  const e = el as unknown as {
    name?: string;
    label?: string;
    content?: string;
  };
  const visible = e.name?.trim() || e.label?.trim() || e.content?.trim();
  return visible ? visible : el.id;
}

function matchesSearch(el: AnimationElement, query: string): boolean {
  if (!query) return true;
  const e = el as unknown as {
    name?: string;
    label?: string;
    content?: string;
  };
  const haystack = [el.id, el.type, e.name, e.label, e.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function render(): void {
  if (!listEl) return;
  const def = getDef();
  if (!def || def.elements.length === 0) {
    listEl.innerHTML =
      '<li style="color: var(--color-fg-muted); padding: 0.4rem;">요소가 없습니다.</li>';
    return;
  }
  const sel = getSelection();
  const query = searchEl?.value.trim().toLowerCase() ?? "";
  const allReversed = [...def.elements].reverse();
  const items = query
    ? allReversed.filter((el) => matchesSearch(el, query))
    : allReversed;
  const multiHint =
    sel.kind === "elements"
      ? `<div class="studio-element-list-hint">다중 선택: ${sel.elementIds.length}개 (Shift+클릭으로 추가/해제)</div>`
      : "";
  const filterHint = query
    ? `<div class="studio-element-list-hint">검색 "${escapeHtml(query)}" · ${items.length}/${def.elements.length} 일치 · Esc = 지우기</div>`
    : `<div class="studio-element-list-hint">위 = 앞쪽 (z-index ↑) · Shift+클릭 = 다중 선택</div>`;
  const emptyMsg =
    query && items.length === 0
      ? `<li style="color: var(--color-fg-muted); padding: 0.4rem; font-size:0.78rem;">"${escapeHtml(query)}" 일치 없음</li>`
      : "";
  const byParent = new Map<string, AnimationElement[]>();
  for (const element of items) {
    if (!element.parentId) continue;
    const children = byParent.get(element.parentId) ?? [];
    children.push(element);
    byParent.set(element.parentId, children);
  }
  const renderItem = (el: AnimationElement, depth = 0): string => {
    const isSel = isElementSelected(sel, el.id);
    const label = friendlyElementLabel(el);
    const subId =
      label !== el.id
        ? `<span class="studio-element-list-item-sub">${escapeHtml(el.id)}</span>`
        : "";
    const group = el.type === "group";
    const children = query ? [] : (byParent.get(el.id) ?? []);
    return `<li class="studio-element-list-item ${isSel ? "is-selected" : ""} ${group ? "is-group" : ""}" data-elem-id="${escapeHtml(el.id)}" draggable="true" style="--studio-tree-depth:${depth}">
      <span class="studio-element-grip" aria-hidden="true">${group ? "▾" : "⋮⋮"}</span>
      <span class="studio-element-list-item-label">${group ? "그룹 · " : ""}${escapeHtml(label)} <span class="studio-element-list-item-type">${escapeHtml(el.type)}</span>${subId}</span>
      <button type="button" class="studio-element-list-delete" data-delete title="삭제">✕</button>
    </li>${children.map((child) => renderItem(child, depth + 1)).join("")}`;
  };
  const visibleItems = query
    ? items
    : items.filter((element) => !element.parentId);
  listEl.innerHTML =
    filterHint +
    multiHint +
    emptyMsg +
    visibleItems.map((element) => renderItem(element)).join("");
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  const li = target.closest<HTMLElement>(".studio-element-list-item");
  if (!li) return;
  const id = li.dataset.elemId ?? "";
  if (target.closest("[data-delete]")) {
    deleteElement(id);
    return;
  }
  setActiveTool("select");
  const me = e as MouseEvent;
  setSelection(nextPointerSelection(getSelection(), id, me));
}

function onDragStart(e: DragEvent): void {
  const li = (e.target as HTMLElement).closest<HTMLElement>(
    ".studio-element-list-item",
  );
  if (!li) return;
  dragSourceId = li.dataset.elemId ?? null;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragSourceId ?? "");
  }
  li.classList.add("is-dragging");
}

function onDragOver(e: DragEvent): void {
  if (!dragSourceId) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  const li = (e.target as HTMLElement).closest<HTMLElement>(
    ".studio-element-list-item",
  );
  listEl
    ?.querySelectorAll(".is-drop-above, .is-drop-below")
    .forEach((n) => n.classList.remove("is-drop-above", "is-drop-below"));
  if (!li) return;
  const rect = li.getBoundingClientRect();
  const upper = e.clientY < rect.top + rect.height / 2;
  li.classList.add(upper ? "is-drop-above" : "is-drop-below");
}

function onDragLeave(e: DragEvent): void {
  const li = (e.target as HTMLElement).closest<HTMLElement>(
    ".studio-element-list-item",
  );
  li?.classList.remove("is-drop-above", "is-drop-below");
}

function onDrop(e: DragEvent): void {
  if (!dragSourceId) return;
  e.preventDefault();
  const li = (e.target as HTMLElement).closest<HTMLElement>(
    ".studio-element-list-item",
  );
  if (!li) return;
  const targetId = li.dataset.elemId ?? "";
  if (!targetId || targetId === dragSourceId) return;
  const rect = li.getBoundingClientRect();
  const upper = e.clientY < rect.top + rect.height / 2;
  const positionInVisualList: "before" | "after" = upper ? "before" : "after";
  const positionInDefArray: "before" | "after" =
    positionInVisualList === "before" ? "after" : "before";
  reorderElement(dragSourceId, targetId, positionInDefArray);
  dragSourceId = null;
}

function onDragEnd(): void {
  dragSourceId = null;
  listEl
    ?.querySelectorAll(".is-drop-above, .is-drop-below, .is-dragging")
    .forEach((n) =>
      n.classList.remove("is-drop-above", "is-drop-below", "is-dragging"),
    );
}

function onToolsClick(e: Event): void {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLElement>(
    "[data-studio-tool], [data-add-element]",
  );
  if (!btn) return;
  const type = btn.dataset.studioTool ?? btn.dataset.addElement;
  if (!type) return;
  setActiveTool(type as StudioTool);
}

export function makeDefaultElement(
  type: string,
  id: string,
  cx: number,
  cy: number,
  polygonSides = 6,
): AnimationElement | null {
  switch (type) {
    case "rect":
      return {
        type: "rect",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x: cx - 60,
        y: cy - 30,
        width: 120,
        height: 60,
        fill: "#a5b4fc",
        stroke: "#6366f1",
        strokeWidth: 1.5,
        cornerRadius: 8,
        label: id,
        labelColor: "#0b0b0f",
        labelSize: 14,
      };
    case "circle":
      return {
        type: "circle",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        cx,
        cy,
        r: 36,
        fill: "#a5b4fc",
        stroke: "#6366f1",
        strokeWidth: 1.5,
        label: id,
        labelColor: "#0b0b0f",
        labelSize: 14,
      };
    case "line":
      return {
        type: "line",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x1: cx - 80,
        y1: cy,
        x2: cx + 80,
        y2: cy,
        stroke: "#6366f1",
        strokeWidth: 2,
        headStart: "none",
        headEnd: "none",
      };
    case "arrow":
      return {
        type: "arrow",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x1: cx - 100,
        y1: cy,
        x2: cx + 100,
        y2: cy,
        stroke: "#6366f1",
        strokeWidth: 2,
        curvature: 0,
        labelColor: "#0b0b0f",
        labelOffsetX: 0,
        labelOffsetY: 4,
        headStart: "none",
        headEnd: "arrow",
      };
    case "text":
      return {
        type: "text",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x: cx,
        y: cy,
        content: id,
        translations: {},
        references: {},
        fontSize: 18,
        fontWeight: 400,
        color: "#18181b",
        textAnchor: "middle",
      };
    case "image":
      return {
        type: "image",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x: cx - 50,
        y: cy - 50,
        width: 100,
        height: 100,
        assetId: registerExternalAsset(placeholderImageUrl()),
        preserveAspectRatio: "xMidYMid meet",
        opacity: 1,
      };
    case "path":
      return {
        type: "path",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        x: cx - 40,
        y: cy - 40,
        d: "M 0 0 L 80 0 L 40 80 Z",
        fill: "#a5b4fc",
        stroke: "#6366f1",
        strokeWidth: 2,
        opacity: 1,
      };
    case "polygon": {
      const r = 40;
      const sides = Math.max(3, Math.min(24, Math.round(polygonSides) || 6));
      const pts = Array.from({ length: sides }, (_, i) => {
        const a = (i * Math.PI * 2) / sides - Math.PI / 2;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return {
        type: "polygon",
        id,
        rotation: 0,
        appearances: [],
        tracks: [],
        bindings: [],
        points: pts,
        fill: "#a5b4fc",
        stroke: "#6366f1",
        strokeWidth: 1.5,
        opacity: 1,
      };
    }
    default:
      return null;
  }
}
