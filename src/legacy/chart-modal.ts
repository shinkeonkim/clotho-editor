// The chart authoring modal.
//
// `charts` is an authoring-time spec, not an element, so it has no place on the
// canvas and no row on the timeline — there is nothing to select or drag. It is a
// form, and a form that large does not belong in the properties rail beside six
// other sections. Hence a modal.
//
// Every write goes through `updateChart`, which re-parses the whole document. A
// chart that would not parse is therefore never written: the edit is dropped and
// the form redraws from the document, which is why each field reads its value back
// from state rather than holding its own.

import type { AnimationDocument } from "@kokoa/clotho";
import {
  addChart,
  defaultChart,
  deleteChart,
  getDef,
  subscribe,
  uniqueChartId,
  updateChart,
} from "./state";

type Chart = NonNullable<AnimationDocument["charts"]>[number];
type Row = Chart["data"][number];
type Cell = Row[string];

let root: HTMLElement | null = null;
let unsubscribe: (() => void) | null = null;
let selectedId: string | null = null;

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const charts = (): Chart[] => (getDef()?.charts ?? []) as Chart[];
const current = (): Chart | null =>
  charts().find((c) => c.id === selectedId) ?? charts()[0] ?? null;

/** Column order is first-seen across rows, so adding a row cannot reshuffle the table. */
function columns(data: readonly Row[]): string[] {
  const seen: string[] = [];
  for (const row of data) {
    for (const key of Object.keys(row)) if (!seen.includes(key)) seen.push(key);
  }
  return seen;
}

/**
 * Keep a cell's type rather than stringifying everything.
 *
 * `encode.y` has to point at a numeric field for a linear scale to mean anything, so
 * turning 120 into "120" on an unrelated edit would quietly break the chart.
 */
function coerce(previous: Cell, next: string): Cell {
  if (next === "") return null;
  if (
    typeof previous === "number" ||
    (previous === null && next.trim() !== "" && !Number.isNaN(Number(next)))
  ) {
    const n = Number(next);
    if (!Number.isNaN(n)) return n;
  }
  if (typeof previous === "boolean") return next === "true";
  return next;
}

function field(
  label: string,
  key: string,
  value: string | number,
  type = "text",
  step?: string,
): string {
  return `<label class="studio-field"><span>${esc(label)}</span><input type="${type}" ${step ? `step="${step}"` : ""} data-chart-key="${esc(key)}" value="${esc(String(value))}" /></label>`;
}

function select(
  label: string,
  key: string,
  value: string,
  options: readonly { value: string; label?: string }[],
): string {
  const opts = options
    .map(
      (o) =>
        `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label ?? (o.value || "(없음)"))}</option>`,
    )
    .join("");
  return `<label class="studio-field"><span>${esc(label)}</span><select data-chart-key="${esc(key)}">${opts}</select></label>`;
}

function checkbox(label: string, key: string, value: boolean): string {
  return `<label class="studio-field studio-field-checkbox"><input type="checkbox" data-chart-key="${esc(key)}" ${value ? "checked" : ""} /><span>${esc(label)}</span></label>`;
}

function renderTable(chart: Chart): string {
  const cols = columns(chart.data);
  if (cols.length === 0) {
    return `<p class="studio-props-empty">행이 없습니다. <b>＋ 행</b>으로 시작하세요.</p>`;
  }
  const head = cols
    .map(
      (c, i) =>
        `<th><input class="studio-chart-col" data-chart-col="${i}" value="${esc(c)}" /><button type="button" class="studio-chart-x" data-chart-delcol="${i}" title="열 삭제">✕</button></th>`,
    )
    .join("");
  const body = chart.data
    .map(
      (row, r) =>
        `<tr>${cols
          .map(
            (c, i) =>
              `<td><input data-chart-cell="${r}:${i}" value="${esc(row[c] === null || row[c] === undefined ? "" : String(row[c]))}" /></td>`,
          )
          .join(
            "",
          )}<td><button type="button" class="studio-chart-x" data-chart-delrow="${r}" title="행 삭제">✕</button></td></tr>`,
    )
    .join("");
  return `<table class="studio-chart-table"><thead><tr>${head}<th></th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderForm(chart: Chart): string {
  const cols = columns(chart.data);
  const fieldOpts = cols.map((c) => ({ value: c }));
  const yScale = chart.scale?.y?.type === "linear" ? chart.scale.y : null;
  return `
    <div class="studio-chart-form">
      <div class="studio-props-header"><span class="studio-props-header-title">${esc(chart.id)}</span><span class="studio-props-header-type">${esc(chart.kind)}</span></div>
      ${select("kind", "kind", chart.kind, [{ value: "bar" }, { value: "line" }])}
      <div class="studio-chart-row">
        ${field("x", "x", chart.x, "number")}
        ${field("y", "y", chart.y, "number")}
        ${field("width", "width", chart.width, "number")}
        ${field("height", "height", chart.height, "number")}
      </div>

      <div class="studio-props-header"><span class="studio-props-header-title">데이터</span><span class="studio-props-header-type">${chart.data.length} rows</span></div>
      ${renderTable(chart)}
      <div class="studio-chart-actions">
        <button type="button" class="studio-btn" data-chart-addrow>＋ 행</button>
        <button type="button" class="studio-btn" data-chart-addcol>＋ 열</button>
      </div>

      <div class="studio-props-header"><span class="studio-props-header-title">encode</span></div>
      <p class="studio-camera-hint">어느 열이 축이 되는지 정합니다. <code>y</code>는 숫자 열이어야 스케일이 의미를 가집니다.</p>
      ${select("x", "encode.x", chart.encode.x, fieldOpts)}
      ${select("y", "encode.y", chart.encode.y, fieldOpts)}
      ${select("series (선택)", "encode.series", chart.encode.series ?? "", [{ value: "", label: "(없음 — 시리즈 하나)" }, ...fieldOpts])}

      <div class="studio-props-header"><span class="studio-props-header-title">축</span></div>
      ${field("x label", "axes.x.label", chart.axes.x.label)}
      ${checkbox("x grid", "axes.x.grid", chart.axes.x.grid)}
      ${field("y label", "axes.y.label", chart.axes.y.label)}
      ${checkbox("y grid", "axes.y.grid", chart.axes.y.grid)}
      ${checkbox("y축을 nice한 값으로 반올림", "scale.y.nice", yScale ? yScale.nice : true)}
      <p class="studio-camera-hint">막대 차트의 값 축은 <b>0에서 시작합니다</b> — 막대 길이가 곧 인코딩이라 잘린 축은 길이로 거짓말을 합니다.</p>

      <div class="studio-props-header"><span class="studio-props-header-title">reveal</span></div>
      ${select("mode", "reveal.mode", chart.reveal.mode, [{ value: "none" }, { value: "grow" }, { value: "sweep" }, { value: "series" }])}
      <div class="studio-chart-row">
        ${field("start", "reveal.start", chart.reveal.start, "number", "50")}
        ${field("duration", "reveal.duration", chart.reveal.duration, "number", "50")}
        ${field("stagger", "reveal.stagger", chart.reveal.stagger, "number", "10")}
      </div>
      <p class="studio-camera-hint">compiler가 만드는 <b>평범한 track과 등장 구간</b>의 단축 표기입니다. 컴파일 후 그대로 덮어쓸 수 있습니다.</p>

      ${checkbox("범례", "legend", chart.legend)}
      <button type="button" class="studio-btn studio-btn-danger" data-chart-delete style="margin-top:0.8rem">🗑 차트 삭제</button>
    </div>`;
}

function render(): void {
  if (!root) return;
  const list = charts();
  const chart = current();
  if (chart) selectedId = chart.id;
  const tabs = list
    .map(
      (c) =>
        `<button type="button" class="studio-chart-tab ${c.id === selectedId ? "is-active" : ""}" data-chart-pick="${esc(c.id)}">${esc(c.id)}</button>`,
    )
    .join("");
  root.innerHTML = `
    <div class="studio-chart-backdrop" data-chart-close></div>
    <div class="studio-chart-panel" role="dialog" aria-modal="true" aria-label="차트 편집">
      <div class="studio-chart-head">
        <strong>차트 편집</strong>
        <span class="studio-chart-note">저작 시간 스펙입니다 — 컴파일되면 평범한 요소가 되므로 런타임에 12번째 요소 타입이 생기지 않습니다.</span>
        <button type="button" class="studio-btn" data-chart-close>닫기</button>
      </div>
      <div class="studio-chart-body">
        <div class="studio-chart-tabs">${tabs}<button type="button" class="studio-btn" data-chart-add>＋ 차트</button></div>
        ${chart ? renderForm(chart) : '<p class="studio-props-empty">차트가 없습니다. <b>＋ 차트</b>로 만드세요.</p>'}
      </div>
    </div>`;
}

function setPath(chart: Chart, path: string, value: unknown): Partial<Chart> {
  const parts = path.split(".");
  if (parts.length === 1) return { [parts[0]!]: value } as Partial<Chart>;
  const [head, ...rest] = parts as [keyof Chart, ...string[]];
  const base = structuredClone(chart[head]) as Record<string, unknown>;
  let cursor = (base ?? {}) as Record<string, unknown>;
  const holder: Record<string, unknown> = cursor;
  for (let i = 0; i < rest.length - 1; i += 1) {
    const key = rest[i]!;
    cursor[key] = { ...((cursor[key] as Record<string, unknown>) ?? {}) };
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[rest[rest.length - 1]!] = value;
  return { [head]: holder } as Partial<Chart>;
}

function onChange(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLSelectElement;
  const chart = current();
  if (!chart) return;

  const cell = target.dataset.chartCell;
  if (cell) {
    const [r, i] = cell.split(":").map(Number) as [number, number];
    const cols = columns(chart.data);
    const key = cols[i]!;
    const next = chart.data.map((row, index) =>
      index === r
        ? { ...row, [key]: coerce(row[key] ?? null, target.value) }
        : row,
    );
    updateChart(chart.id, { data: next });
    return;
  }

  const col = target.dataset.chartCol;
  if (col !== undefined) {
    const cols = columns(chart.data);
    const from = cols[Number(col)]!;
    const to = target.value.trim();
    if (to === "" || to === from) return render();
    // Renaming a column has to carry `encode` with it, or the chart silently points
    // at a field that no longer exists.
    const next = chart.data.map((row) => {
      const copy: Row = {};
      for (const [k, v] of Object.entries(row))
        copy[k === from ? to : k] = v as Cell;
      return copy;
    });
    const encode = { ...chart.encode };
    if (encode.x === from) encode.x = to;
    if (encode.y === from) encode.y = to;
    if (encode.series === from) encode.series = to;
    updateChart(chart.id, { data: next, encode });
    return;
  }

  const key = target.dataset.chartKey;
  if (!key) return;
  let value: unknown = target.value;
  if (target instanceof HTMLInputElement && target.type === "checkbox")
    value = target.checked;
  else if (target instanceof HTMLInputElement && target.type === "number")
    value = Number(target.value);
  if (key === "encode.series" && value === "") {
    updateChart(chart.id, { encode: { x: chart.encode.x, y: chart.encode.y } });
    return;
  }
  if (key === "scale.y.nice") {
    updateChart(chart.id, {
      scale: { ...chart.scale, y: { type: "linear", nice: Boolean(value) } },
    } as Partial<Chart>);
    return;
  }
  updateChart(chart.id, setPath(chart, key, value));
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  if (target.closest("[data-chart-close]")) return closeChartModal();

  if (target.closest("[data-chart-add]")) {
    const id = uniqueChartId();
    addChart(defaultChart(id));
    selectedId = id;
    return render();
  }
  const pick = target.closest<HTMLElement>("[data-chart-pick]");
  if (pick) {
    selectedId = pick.dataset.chartPick!;
    return render();
  }

  const chart = current();
  if (!chart) return;

  if (target.closest("[data-chart-delete]")) {
    deleteChart(chart.id);
    selectedId = charts()[0]?.id ?? null;
    return render();
  }
  if (target.closest("[data-chart-addrow]")) {
    const cols = columns(chart.data);
    const blank: Row = {};
    for (const c of cols) blank[c] = null;
    updateChart(chart.id, { data: [...chart.data, blank] });
    return;
  }
  if (target.closest("[data-chart-addcol]")) {
    const cols = columns(chart.data);
    let name = `field${cols.length + 1}`;
    while (cols.includes(name)) name = `${name}_`;
    updateChart(chart.id, {
      data: chart.data.map((row) => ({ ...row, [name]: null })),
    });
    return;
  }
  const delRow = target.closest<HTMLElement>("[data-chart-delrow]");
  if (delRow) {
    const r = Number(delRow.dataset.chartDelrow);
    updateChart(chart.id, { data: chart.data.filter((_, i) => i !== r) });
    return;
  }
  const delCol = target.closest<HTMLElement>("[data-chart-delcol]");
  if (delCol) {
    const cols = columns(chart.data);
    const name = cols[Number(delCol.dataset.chartDelcol)]!;
    // Refuse to remove a column an axis points at: the edit would be rejected by the
    // schema anyway, and springing back with no explanation is worse than saying no.
    if (chart.encode.x === name || chart.encode.y === name) return;
    const next = chart.data.map((row) => {
      const copy: Row = { ...row };
      delete copy[name];
      return copy;
    });
    const encode = { ...chart.encode };
    if (encode.series === name) delete encode.series;
    updateChart(chart.id, { data: next, encode });
    return;
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") closeChartModal();
}

export function openChartModal(): void {
  if (root) return;
  root = document.createElement("div");
  root.className = "studio-chart-modal";
  document.body.appendChild(root);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  document.addEventListener("keydown", onKey);
  unsubscribe = subscribe(render);
  render();
}

export function closeChartModal(): void {
  if (!root) return;
  unsubscribe?.();
  unsubscribe = null;
  document.removeEventListener("keydown", onKey);
  root.remove();
  root = null;
}
