import {
  addAppearance,
  addChapter,
  addEffect,
  deleteChapter,
  deleteEffect,
  getCurrentTime,
  getDef,
  getSelection,
  removeAppearance,
  removeTrack,
  removeTrackKeyframe,
  setCurrentTime,
  setSelection,
  setTrackKeyframe,
  subscribe,
  updateAppearance,
  updateCanvas,
  updateChapter,
  updateDuration,
  updateEffect,
  updateElementBase,
  updateMeta,
  updateLocales,
  updateData,
  updateSettings,
  createLayout,
  detachFromLayout,
  findLayoutCollisions,
  layoutIdsFor,
  uniqueChapterId,
  uniqueEffectId,
  addCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  uniqueCheckpointId,
} from "./state";
import type {
  AnimationDocument,
  AnimationElement,
  AnimationEffect,
  Appearance,
  EntryMode,
  ExitMode,
  Checkpoint,
  DataBinding,
  DataValue,
} from "@kokoa/clotho";
import { bindablePropertiesFor } from "@kokoa/clotho";
import { captureFocusWithin, restoreFocusWithin } from "./studio-focus";
import {
  alignSelected,
  distributeSelected,
  type AlignKind,
  type DistributeKind,
} from "./studio-align";
import { childIdsOf, ungroupElement } from "./studio-groups";

let panelEl: HTMLElement | null = null;
const closedSections = new Set<string>();
let isComposingFallback = false;

const DEFAULT_LOCALES = ["ko", "en"];

function parseLocales(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((locale) => locale.trim())
    .filter((locale) => {
      const key = locale.toLowerCase();
      if (!locale || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function annotationTokens(...values: string[]): string[] {
  const tokens = values.flatMap((value) =>
    [...value.matchAll(/\{([a-z][a-z0-9_-]*)\}/g)].map((match) => match[1]!),
  );
  return [...new Set(tokens)];
}

function annotationReferenceFields(
  keyPrefix: "el" | "chapter",
  values: string[],
  references: Readonly<Record<string, string | readonly string[]>> = {},
): string[] {
  const tokens = annotationTokens(...values);
  if (tokens.length === 0) {
    return [
      '<p class="studio-props-empty studio-annotation-hint">문구에 {token}을 입력하면 장면 요소와 연결할 수 있습니다.</p>',
    ];
  }
  return [
    '<p class="studio-props-empty studio-annotation-hint">대상 element id를 쉼표로 구분하세요. 여러 요소를 함께 강조할 수 있습니다.</p>',
    ...tokens.map((token) => {
      const target = references[token];
      const value =
        typeof target === "string" ? target : (target?.join(", ") ?? "");
      return textField(
        `{${token}} 대상`,
        `${keyPrefix}.reference.${token}`,
        value,
      );
    }),
  ];
}

function parseReferenceTargets(value: string): string | string[] | undefined {
  const targets = [
    ...new Set(
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  if (targets.length === 0) return undefined;
  return targets.length === 1 ? targets[0] : targets;
}

export function initProperties(root: HTMLElement): void {
  panelEl = root;
  subscribe(render);
  root.addEventListener("input", onInput);
  root.addEventListener("change", onChange);
  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);
  root.addEventListener("compositionstart", onCompositionStart);
  root.addEventListener("compositionend", onCompositionEnd);
  root.addEventListener("toggle", onSectionToggle, true);
  root.addEventListener("wheel", onNumberWheel, { passive: false });
  render();
}

function onCompositionStart(): void {
  isComposingFallback = true;
}

function onCompositionEnd(): void {
  isComposingFallback = false;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key !== "Enter") return;
  if (e.isComposing || isComposingFallback) return;
  const target = e.target as HTMLElement;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type === "text" || target.type === "number") {
    target.blur();
  }
}

function onSectionToggle(e: Event): void {
  const t = e.target as HTMLElement;
  if (!(t instanceof HTMLDetailsElement)) return;
  const name = t.dataset.section;
  if (!name) return;
  if (t.open) closedSections.delete(name);
  else closedSections.add(name);
}

function onNumberWheel(e: WheelEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "number") return;
  if (document.activeElement !== target) return;
  e.preventDefault();
  const step = Number(target.step) || 1;
  const multiplier = e.shiftKey ? 10 : 1;
  const dir = e.deltaY < 0 ? 1 : -1;
  const newVal = (Number(target.value) || 0) + dir * step * multiplier;
  target.value = String(newVal);
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function section(
  name: string,
  headerInner: string,
  contentInner: string,
): string {
  const isOpen = !closedSections.has(name);
  return `<details class="studio-props-section" ${isOpen ? "open" : ""} data-section="${escapeHtml(name)}">
    <summary class="studio-props-header studio-props-summary">${headerInner}</summary>
    <div class="studio-props-section-body">${contentInner}</div>
  </details>`;
}

function render(): void {
  if (!panelEl) return;
  const focusSnap = captureFocusWithin(panelEl);
  renderInner();
  restoreFocusWithin(panelEl, focusSnap);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textField(
  label: string,
  key: string,
  value: string | undefined,
): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <input type="text" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(value ?? "")}" />
  </label>`;
}

function textareaField(label: string, key: string, value: string): string {
  return `<label class="studio-field"><span>${escapeHtml(label)}</span><textarea rows="7" spellcheck="false" data-prop-key="${escapeHtml(key)}">${escapeHtml(value)}</textarea></label>`;
}

function numberField(
  label: string,
  key: string,
  value: number | undefined,
  step = 1,
): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <input type="number" step="${step}" data-prop-key="${escapeHtml(key)}" value="${value ?? 0}" />
  </label>`;
}

function colorField(
  label: string,
  key: string,
  value: string | undefined,
): string {
  const v = value ?? "#000000";
  return `<label class="studio-field studio-field-color">
    <span>${escapeHtml(label)}</span>
    <input type="color" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(v.slice(0, 7))}" />
    <input type="text" data-prop-key="${escapeHtml(key)}" value="${escapeHtml(v)}" />
  </label>`;
}

function checkboxField(label: string, key: string, value: boolean): string {
  return `<label class="studio-field studio-field-checkbox">
    <input type="checkbox" data-prop-key="${escapeHtml(key)}" ${value ? "checked" : ""} />
    <span>${escapeHtml(label)}</span>
  </label>`;
}

function selectField(
  label: string,
  key: string,
  value: string,
  options: { value: string; label?: string }[],
): string {
  return `<label class="studio-field">
    <span>${escapeHtml(label)}</span>
    <select data-prop-key="${escapeHtml(key)}">
      ${options.map((o) => `<option value="${escapeHtml(o.value)}" ${o.value === value ? "selected" : ""}>${escapeHtml(o.label ?? o.value)}</option>`).join("")}
    </select>
  </label>`;
}

function renderInner(): void {
  if (!panelEl) return;
  const def = getDef();
  const sel = getSelection();
  if (!def) {
    panelEl.innerHTML =
      '<p class="studio-props-empty">애니메이션을 열거나 새로 만드세요.</p>';
    return;
  }

  const timeHint = `<span class="studio-step-hint">📍 t = ${getCurrentTime()} ms / ${def.duration} ms</span>`;

  if (sel.kind === "none") {
    const metaHeader = `<span class="studio-props-header-title">애니메이션 메타</span><span class="studio-props-header-type">${escapeHtml(def.id)}</span>`;
    const metaBody = [
      textField("title", "meta.title", def.title),
      textField("description", "meta.description", def.description),
      textField(
        "문서 언어 (쉼표로 구분)",
        "meta.locales",
        (
          (def as AnimationDocument & { locales?: string[] }).locales ??
          DEFAULT_LOCALES
        ).join(", "),
      ),
      numberField("duration (ms)", "meta.duration", def.duration, 100),
      numberField("canvas.width", "canvas.width", def.canvas.width),
      numberField("canvas.height", "canvas.height", def.canvas.height),
      colorField(
        "canvas.background",
        "canvas.background",
        def.canvas.background,
      ),
      textareaField(
        "샘플 데이터 (JSON)",
        "meta.data",
        JSON.stringify(def.data, null, 2),
      ),
      `<p class="studio-props-empty">JSON Pointer로 요소 속성에 연결합니다. 이 데이터는 미리보기와 내보내기에 함께 저장됩니다.</p>`,
    ].join("");
    const settingsHeader = `<span class="studio-props-header-title">설정</span>`;
    const settingsBody = [
      checkboxField("loop", "settings.loop", def.settings.loop),
      checkboxField("autoplay", "settings.autoplay", def.settings.autoplay),
      checkboxField(
        "자막 표시 (caption)",
        "settings.showCaption",
        def.settings.showCaption ?? false,
      ),
      checkboxField(
        "목차 표시 (chapter list)",
        "settings.showChapterList",
        def.settings.showChapterList ?? false,
      ),
      selectField(
        "목차 위치",
        "settings.chapterListPosition",
        def.settings.chapterListPosition ?? "right",
        [
          { value: "left", label: "좌측" },
          { value: "right", label: "우측" },
          { value: "top", label: "상단" },
          { value: "bottom", label: "하단" },
        ],
      ),
    ].join("");
    const checkpoints = def.checkpoints
      .map((checkpoint, index) => {
        const specific =
          checkpoint.interaction === "choice"
            ? textField(
                "선택지 (value:label, 쉼표 구분)",
                `checkpoint.${index}.options`,
                checkpoint.options
                  .map(({ value, label }) => `${value}:${label}`)
                  .join(", "),
              )
            : checkpoint.interaction === "select-element"
              ? textField(
                  "선택 가능한 element id",
                  `checkpoint.${index}.elementIds`,
                  checkpoint.elementIds.join(", "),
                )
              : checkpoint.interaction === "number-input"
                ? [
                    numberField(
                      "최솟값",
                      `checkpoint.${index}.min`,
                      checkpoint.min,
                    ),
                    numberField(
                      "최댓값",
                      `checkpoint.${index}.max`,
                      checkpoint.max,
                    ),
                    numberField(
                      "간격",
                      `checkpoint.${index}.step`,
                      checkpoint.step,
                    ),
                  ].join("")
                : "";
        const predicate =
          "predicate" in checkpoint && checkpoint.predicate?.type === "equals"
            ? textField(
                "정답 (equals)",
                `checkpoint.${index}.answer`,
                String(checkpoint.predicate.value),
              )
            : "";
        return `<div class="studio-checkpoint-card" data-checkpoint-id="${escapeHtml(checkpoint.id)}">
          <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(checkpoint.id)}</span><button type="button" class="studio-btn studio-btn-danger" data-delete-checkpoint="${escapeHtml(checkpoint.id)}">삭제</button></div>
          ${numberField("time (ms)", `checkpoint.${index}.time`, checkpoint.time, 50)}
          ${textField("질문", `checkpoint.${index}.prompt`, checkpoint.prompt)}
          ${selectField(
            "상호작용",
            `checkpoint.${index}.interaction`,
            checkpoint.interaction,
            [
              { value: "continue", label: "계속" },
              { value: "choice", label: "선택지" },
              { value: "select-element", label: "요소 선택" },
              { value: "number-input", label: "숫자 입력" },
            ],
          )}
          ${checkboxField("응답 필수", `checkpoint.${index}.required`, checkpoint.required)}
          ${specific}${predicate}
        </div>`;
      })
      .join("");
    panelEl.innerHTML = `
      ${timeHint}
      ${section("meta", metaHeader, metaBody)}
      ${section("settings", settingsHeader, settingsBody)}
      ${section("checkpoints", `<span class="studio-props-header-title">Checkpoint (${def.checkpoints.length})</span>`, `${checkpoints}<button type="button" class="studio-btn" data-add-checkpoint>＋ 현재 시간에 checkpoint 추가</button>`)}
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">목차 (${def.chapters.length})</span></div>
      <button type="button" class="studio-btn" data-add-chapter>＋ 현재 시간에 chapter 추가</button>
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">효과 (${def.effects.length})</span></div>
      <div class="studio-add-effect-bar">
        <select id="studio-new-effect-type">
          <option value="highlight">highlight</option>
          <option value="pulse">pulse</option>
          <option value="flow">flow</option>
        </select>
        <button type="button" class="studio-btn" data-add-effect>＋ 효과</button>
      </div>
    `;
    return;
  }

  if (sel.kind === "elements") {
    const alignBtn = (kind: string, label: string, title: string): string =>
      `<button type="button" class="studio-btn studio-align-btn" data-align="${kind}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${label}</button>`;
    const distributeDisabled = sel.elementIds.length < 3 ? "disabled" : "";
    const layoutIds = layoutIdsFor(sel.elementIds);
    const collisions = findLayoutCollisions(def).filter(
      ({ firstId, secondId }) =>
        sel.elementIds.includes(firstId) || sel.elementIds.includes(secondId),
    );
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">다중 선택</span><span class="studio-props-header-type">${sel.elementIds.length} elements</span></div>
      <p class="studio-props-empty" style="margin-bottom:0.4rem">${sel.elementIds.length}개 element 선택됨.<br/>
      <span style="font-size:0.72rem;color:var(--color-fg-muted)">캔버스 드래그 / 화살표키 = 함께 이동<br/>Delete = 모두 삭제 · ⌘D = 복제<br/>⌘C / ⌘X = 모두 복사 / 잘라내기</span></p>
      <div class="studio-align-section">
        <div class="studio-align-title">정렬</div>
        <div class="studio-align-row">
          ${alignBtn("left", "⫷", "왼쪽 정렬")}
          ${alignBtn("center-h", "⊟", "가로 중앙")}
          ${alignBtn("right", "⫸", "오른쪽 정렬")}
        </div>
        <div class="studio-align-row">
          ${alignBtn("top", "⫶", "위쪽 정렬")}
          ${alignBtn("middle-v", "⊟", "세로 중앙")}
          ${alignBtn("bottom", "⫶", "아래쪽 정렬")}
        </div>
        <div class="studio-align-title" style="margin-top:0.5rem">분포 (≥3개)</div>
        <div class="studio-align-row">
          <button type="button" class="studio-btn studio-align-btn" data-distribute="horizontal" title="가로 균등 분포" ${distributeDisabled}>↔</button>
          <button type="button" class="studio-btn studio-align-btn" data-distribute="vertical" title="세로 균등 분포" ${distributeDisabled}>↕</button>
        </div>
      </div>
      <div class="studio-align-section studio-layout-section">
        <div class="studio-align-title">Constraint Layout</div>
        <div class="studio-align-row">
          <button type="button" class="studio-btn" data-create-layout="row">가로</button>
          <button type="button" class="studio-btn" data-create-layout="column">세로</button>
          <button type="button" class="studio-btn" data-create-layout="grid">격자</button>
        </div>
        ${layoutIds.length > 0 ? `<p class="studio-layout-status">적용 중: ${layoutIds.map(escapeHtml).join(", ")}</p><button type="button" class="studio-btn" data-detach-layout>현재 좌표로 고정</button>` : '<p class="studio-layout-status">선택한 요소에 적용된 layout이 없습니다.</p>'}
        ${collisions.length > 0 ? `<p class="studio-layout-collision" role="alert">겹침: ${collisions.map(({ firstId, secondId }) => `${escapeHtml(firstId)} ↔ ${escapeHtml(secondId)}`).join(", ")}</p>` : ""}
      </div>
      <ul style="font-family:var(--font-mono);font-size:0.72rem;color:var(--color-fg-muted);padding-left:1rem;margin:0.6rem 0 0">
        ${sel.elementIds.map((id) => `<li>${escapeHtml(id)}</li>`).join("")}
      </ul>
    `;
    return;
  }

  if (sel.kind === "element") {
    const el = def.elements.find((e) => e.id === sel.elementId);
    if (!el) {
      setSelection({ kind: "none" });
      return;
    }
    renderElementForm(def, el);
    return;
  }

  if (sel.kind === "chapter") {
    const ch = def.chapters.find((c) => c.id === sel.chapterId);
    if (!ch) {
      setSelection({ kind: "none" });
      return;
    }
    const chapterReferences = (
      ch as typeof ch & {
        references?: Record<string, string | string[]>;
      }
    ).references;
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(ch.id)}</span><span class="studio-props-header-type">chapter</span></div>
      ${numberField("time (ms)", "chapter.time", ch.time, 50)}
      ${textField("label", "chapter.label", ch.label)}
      ${textField("subtitle", "chapter.subtitle", ch.subtitle)}
      ${annotationReferenceFields("chapter", [ch.label, ch.subtitle], chapterReferences).join("")}
      <button type="button" class="studio-btn studio-btn-danger" data-delete-chapter style="margin-top:0.6rem">🗑 chapter 삭제</button>
    `;
    return;
  }

  if (sel.kind === "effect") {
    const eff = def.effects.find((e) => e.id === sel.effectId);
    if (!eff) {
      setSelection({ kind: "none" });
      return;
    }
    const elemOpts = def.elements
      .map(
        (e) =>
          `<option value="${escapeHtml(e.id)}" ${e.id === eff.elementId ? "selected" : ""}>${escapeHtml(e.id)}</option>`,
      )
      .join("");
    const typeOpts = (["highlight", "pulse", "flow"] as const)
      .map(
        (t) =>
          `<option value="${t}" ${t === eff.type ? "selected" : ""}>${t}</option>`,
      )
      .join("");
    const specific =
      eff.type === "highlight"
        ? colorField("color", "effect.color", eff.color)
        : eff.type === "pulse"
          ? numberField("scale", "effect.scale", eff.scale, 0.05)
          : colorField("color", "effect.color", eff.color) +
            numberField("particles", "effect.particles", eff.particles, 1) +
            numberField("radius", "effect.radius", eff.radius, 0.5);
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(eff.id)}</span><span class="studio-props-header-type">effect</span></div>
      <label class="studio-field"><span>type</span><select data-prop-key="effect.type">${typeOpts}</select></label>
      <label class="studio-field"><span>elementId</span><select data-prop-key="effect.elementId">${elemOpts}</select></label>
      ${numberField("time (ms)", "effect.time", eff.time, 50)}
      ${numberField("duration (ms)", "effect.duration", eff.duration, 50)}
      ${specific}
      <button type="button" class="studio-btn studio-btn-danger" data-delete-effect style="margin-top:0.6rem">🗑 효과 삭제</button>
    `;
    return;
  }
}

function renderElementForm(def: AnimationDocument, el: AnimationElement): void {
  if (!panelEl) return;
  const timeHint = `<span class="studio-step-hint">📍 t = ${getCurrentTime()} ms</span>`;

  if (el.type === "group") {
    panelEl.innerHTML = `
      ${timeHint}
      <div class="studio-props-header"><span class="studio-props-header-title">${escapeHtml(el.name || el.id)}</span><span class="studio-props-header-type">group · ${childIdsOf(el.id).length} children</span></div>
      ${textField("name (별칭)", "el.name", el.name ?? "")}
      <div class="studio-props-empty" style="font-size:0.72rem;margin:0.4rem 0">
        그룹은 자식 요소를 함께 이동합니다.<br/>
        Alt+클릭으로 자식을 직접 선택할 수 있습니다.<br/>
        ⌘⇧G 로 그룹 해제.
      </div>
      <button type="button" class="studio-btn studio-btn-danger" data-ungroup style="margin-top:0.4rem">⬚ 그룹 해제 (⌘⇧G)</button>
      <div class="studio-props-header" style="margin-top:0.6rem"><span class="studio-props-header-title">자식 (${childIdsOf(el.id).length})</span></div>
      <ul style="font-family:var(--font-mono);font-size:0.72rem;color:var(--color-fg-muted);padding-left:1rem;margin:0">
        ${childIdsOf(el.id)
          .map(
            (cid: string) =>
              `<li><a href="#" data-select-child="${escapeHtml(cid)}" style="color:inherit">${escapeHtml(cid)}</a></li>`,
          )
          .join("")}
      </ul>
    `;
    return;
  }

  const baseFields = renderBaseFields(def, el);
  const appearances = renderAppearances(def, el);
  const tracks = renderTracks(el);
  const bindings = renderBindings(el);

  const baseHeader = `<span class="studio-props-header-title">${escapeHtml(el.id)}</span><span class="studio-props-header-type">${escapeHtml(el.type)}</span>`;
  const apHeader = `<span class="studio-props-header-title">출현 (Appearances)</span><button type="button" class="studio-btn studio-btn-small" data-add-appearance>＋</button>`;
  const tracksHeader = `<span class="studio-props-header-title">키프레임 트랙 (${el.tracks.length})</span>`;

  panelEl.innerHTML = `
    ${timeHint}
    ${section("el-base", baseHeader, baseFields)}
    ${section("el-appearances", apHeader, appearances)}
    ${section("el-tracks", tracksHeader, tracks)}
    ${section("el-bindings", `<span class="studio-props-header-title">데이터 연결 (${el.bindings.length})</span>`, bindings)}
    <div class="studio-props-empty" style="font-size:0.72rem;margin-top:0.5rem">
      base 속성을 변경하면 → t=${getCurrentTime()} ms 에 keyframe 추가<br/>
      트랙이 없는 속성은 base 값이 항상 사용됨
    </div>
  `;
}

function renderBindings(el: AnimationElement): string {
  const properties = bindablePropertiesFor(el);
  const rows = el.bindings
    .map(
      (binding, index) => `<div class="studio-appearance-row">
    <div class="studio-appearance-row-head"><span class="studio-appearance-row-title">#${index + 1}</span><button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-delete-binding="${index}">✕</button></div>
    ${selectField(
      "속성",
      `binding.${index}.property`,
      binding.property,
      properties.map((value) => ({ value })),
    )}
    ${textField("JSON Pointer", `binding.${index}.pointer`, binding.pointer)}
    ${selectField(
      "표현 방식",
      `binding.${index}.formatter`,
      binding.formatter,
      [
        "identity",
        "string",
        "number",
        "fixed",
        "percent",
        "uppercase",
        "lowercase",
        "color",
      ].map((value) => ({ value })),
    )}
    ${textField("대체 값", `binding.${index}.fallback`, binding.fallback === undefined ? "" : String(binding.fallback))}
  </div>`,
    )
    .join("");
  return `${rows || '<p class="studio-props-empty">연결된 데이터가 없습니다.</p>'}<button type="button" class="studio-btn" data-add-binding ${properties.length === 0 ? "disabled" : ""}>＋ 데이터 연결</button>`;
}

function renderBaseFields(
  def: AnimationDocument,
  el: AnimationElement,
): string {
  const numberFields: {
    label: string;
    key: string;
    value: number;
    step?: number;
  }[] = [];
  const colorFields: { label: string; key: string; value: string }[] = [];
  const textFields: { label: string; key: string; value: string }[] = [];
  const e = el as unknown as Record<string, unknown>;

  textFields.push({
    label: "name (별칭)",
    key: "name",
    value: (e.name as string | undefined) ?? "",
  });

  if (el.type === "rect" || el.type === "image" || el.type === "text") {
    numberFields.push({ label: "x", key: "x", value: e.x as number });
    numberFields.push({ label: "y", key: "y", value: e.y as number });
  }
  if (el.type === "rect" || el.type === "image") {
    numberFields.push({
      label: "width",
      key: "width",
      value: e.width as number,
    });
    numberFields.push({
      label: "height",
      key: "height",
      value: e.height as number,
    });
  }
  if (el.type === "circle") {
    numberFields.push({ label: "cx", key: "cx", value: e.cx as number });
    numberFields.push({ label: "cy", key: "cy", value: e.cy as number });
    numberFields.push({ label: "r", key: "r", value: e.r as number });
  }
  if (el.type === "polygon") {
    const pointCount = String(e.points ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    numberFields.push({
      label: "변 개수",
      key: "polygonSides",
      value: pointCount,
    });
  }
  if (el.type === "line" || el.type === "arrow") {
    if (typeof e.x1 === "number") {
      numberFields.push({ label: "x1", key: "x1", value: e.x1 as number });
      numberFields.push({ label: "y1", key: "y1", value: e.y1 as number });
      numberFields.push({ label: "x2", key: "x2", value: e.x2 as number });
      numberFields.push({ label: "y2", key: "y2", value: e.y2 as number });
    }
  }
  if (el.type === "text") {
    textFields.push({
      label: "content",
      key: "content",
      value: e.content as string,
    });
    numberFields.push({
      label: "fontSize",
      key: "fontSize",
      value: e.fontSize as number,
    });
  }
  if (
    el.type === "rect" ||
    el.type === "circle" ||
    el.type === "polygon" ||
    el.type === "path"
  ) {
    colorFields.push({ label: "fill", key: "fill", value: e.fill as string });
    colorFields.push({
      label: "stroke",
      key: "stroke",
      value: e.stroke as string,
    });
    numberFields.push({
      label: "strokeWidth",
      key: "strokeWidth",
      value: e.strokeWidth as number,
      step: 0.5,
    });
  }
  if (el.type === "line" || el.type === "arrow") {
    colorFields.push({
      label: "stroke",
      key: "stroke",
      value: e.stroke as string,
    });
    numberFields.push({
      label: "strokeWidth",
      key: "strokeWidth",
      value: e.strokeWidth as number,
      step: 0.5,
    });
  }
  if (el.type === "rect" || el.type === "circle") {
    if ((e.label as string | undefined) !== undefined) {
      textFields.push({
        label: "label",
        key: "label",
        value: (e.label as string) ?? "",
      });
      colorFields.push({
        label: "labelColor",
        key: "labelColor",
        value: (e.labelColor as string) ?? "#000",
      });
    }
  }
  if (el.type === "text") {
    colorFields.push({
      label: "color",
      key: "color",
      value: e.color as string,
    });
  }
  numberFields.push({
    label: "rotation",
    key: "rotation",
    value: e.rotation as number,
    step: 5,
  });

  const localizedTextFields = (() => {
    if (el.type !== "text") return [];
    const localized = el as AnimationElement & {
      locales?: string[];
      translations?: Record<string, string>;
      references?: Record<string, string | string[]>;
    };
    const documentLocales =
      (def as AnimationDocument & { locales?: string[] }).locales ??
      DEFAULT_LOCALES;
    const locales = localized.locales ?? documentLocales;
    return [
      textField(
        "이 요소의 언어 (비우면 문서 설정 사용)",
        "el.locales",
        localized.locales?.join(", ") ?? "",
      ),
      `<p class="studio-props-empty studio-i18n-hint">기본 문구는 content입니다. 번역이 없거나 현재 언어와 일치하지 않으면 기본 문구를 표시합니다.</p>`,
      ...locales.map((locale) =>
        textField(
          `${locale} 번역`,
          `el.translation.${locale}`,
          localized.translations?.[locale] ?? "",
        ),
      ),
      ...annotationReferenceFields(
        "el",
        [el.content, ...Object.values(localized.translations ?? {})],
        localized.references,
      ),
    ];
  })();

  const html = [
    ...textFields.map((f) => textField(f.label, `el.${f.key}`, f.value)),
    ...localizedTextFields,
    ...numberFields.map((f) =>
      numberField(f.label, `el.${f.key}`, f.value, f.step),
    ),
    ...colorFields.map((f) => colorField(f.label, `el.${f.key}`, f.value)),
  ];
  return html.join("");
}

function renderAppearances(
  def: AnimationDocument,
  el: AnimationElement,
): string {
  if (el.appearances.length === 0) {
    return '<p class="studio-props-empty">appearance 없음. 추가하세요.</p>';
  }
  const modes: { value: string; label?: string }[] = [
    { value: "instant" },
    { value: "fade" },
    { value: "slide-left" },
    { value: "slide-right" },
    { value: "slide-up" },
    { value: "slide-down" },
    { value: "zoom" },
    { value: "pop" },
  ];
  return el.appearances
    .map(
      (ap, idx) => `
      <div class="studio-appearance-row">
        <div class="studio-appearance-row-head">
          <span class="studio-appearance-row-title">#${idx + 1}</span>
          <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-appearance="${idx}">✕</button>
        </div>
        ${numberField("start (ms)", `ap.${idx}.start`, ap.start, 50)}
        ${numberField("end (ms)", `ap.${idx}.end`, ap.end, 50)}
        ${selectField("entry", `ap.${idx}.entryMode`, ap.entryMode ?? "instant", modes)}
        ${numberField("entry dur", `ap.${idx}.entryDuration`, ap.entryDuration, 50)}
        ${selectField("exit", `ap.${idx}.exitMode`, ap.exitMode ?? "instant", modes)}
        ${numberField("exit dur", `ap.${idx}.exitDuration`, ap.exitDuration, 50)}
      </div>
    `,
    )
    .join("");
}

function renderTracks(el: AnimationElement): string {
  if (el.tracks.length === 0) {
    return '<p class="studio-props-empty" style="font-size:0.72rem">트랙 없음. 시간 t&gt;0 에서 base 속성을 바꾸면 자동 생성됩니다.</p>';
  }
  return el.tracks
    .map((t) => {
      const list = t.keyframes
        .map(
          (kf, idx) => `<li>
          <button type="button" class="studio-tl-kf-btn" data-jump-time="${kf.time}" title="${kf.time}ms 로 이동">t=${kf.time}ms</button>
          <code>${escapeHtml(String(kf.value))}</code>
          <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-kf-prop="${escapeHtml(t.property)}" data-remove-kf-time="${kf.time}" data-kf-idx="${idx}" title="삭제">✕</button>
        </li>`,
        )
        .join("");
      return `
        <div class="studio-track-row">
          <div class="studio-track-row-head">
            <span class="studio-track-row-prop">${escapeHtml(t.property)}</span>
            <span class="studio-track-row-count">${t.keyframes.length} kf</span>
            <button type="button" class="studio-btn studio-btn-small" data-add-kf="${escapeHtml(t.property)}" title="현재 시간에 keyframe 추가">＋ kf</button>
            <button type="button" class="studio-btn studio-btn-small studio-btn-danger" data-remove-track="${escapeHtml(t.property)}" title="트랙 삭제">✕</button>
          </div>
          <ul class="studio-track-list">${list}</ul>
        </div>
      `;
    })
    .join("");
}

function onInput(e: Event): void {
  const target = e.target as
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const key = target.dataset.propKey;
  if (!key) return;
  // Guard: skip text input events during IME composition
  if (target.type === "text" && (e as InputEvent).isComposing) return;
  if (target.type === "text" && isComposingFallback) return;
  if (target instanceof HTMLInputElement && target.type === "color") {
    const textInput = target.parentElement?.querySelector<HTMLInputElement>(
      `input[type="text"][data-prop-key="${CSS.escape(key)}"]`,
    );
    if (textInput) textInput.value = target.value;
    return;
  }
  let value: string | number | boolean = target.value;
  if (target instanceof HTMLInputElement && target.type === "number")
    value = Number(target.value);
  else if (target instanceof HTMLInputElement && target.type === "checkbox")
    value = target.checked;
  apply(key, value);
}

function onChange(e: Event): void {
  const target = e.target;
  if (target instanceof HTMLInputElement && target.type === "color") {
    const key = target.dataset.propKey;
    if (key) apply(key, target.value);
    return;
  }
  onInput(e);
}

function apply(key: string, value: string | number | boolean): void {
  const def = getDef();
  if (!def) return;
  const sel = getSelection();

  if (key === "meta.title") updateMeta({ title: String(value) });
  else if (key === "meta.description")
    updateMeta({ description: String(value) });
  else if (key === "meta.locales") {
    const locales = parseLocales(String(value));
    if (locales.length > 0) updateLocales(locales);
  } else if (key === "meta.data") {
    try {
      const parsed = JSON.parse(String(value)) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      )
        updateData(parsed as Record<string, DataValue>);
    } catch {
      /* keep the last valid sample while JSON is being edited */
    }
  } else if (key === "meta.duration") updateDuration(Number(value));
  else if (key === "canvas.width") updateCanvas({ width: Number(value) });
  else if (key === "canvas.height") updateCanvas({ height: Number(value) });
  else if (key === "canvas.background")
    updateCanvas({ background: String(value) });
  else if (key === "settings.loop") updateSettings({ loop: Boolean(value) });
  else if (key === "settings.autoplay")
    updateSettings({ autoplay: Boolean(value) });
  else if (key === "settings.showCaption")
    updateSettings({ showCaption: Boolean(value) });
  else if (key === "settings.showChapterList")
    updateSettings({ showChapterList: Boolean(value) });
  else if (key === "settings.chapterListPosition")
    updateSettings({
      chapterListPosition: String(value) as "left" | "right" | "top" | "bottom",
    });
  else if (key.startsWith("checkpoint.")) {
    const [, indexText, property] = key.split(".");
    const checkpoint = def.checkpoints[Number(indexText)];
    if (!checkpoint || !property) return;
    if (property === "interaction") {
      const base = {
        id: checkpoint.id,
        time: checkpoint.time,
        prompt: checkpoint.prompt,
        required: checkpoint.required,
      };
      const interaction = String(value);
      const replacement: Checkpoint =
        interaction === "choice"
          ? {
              ...base,
              interaction,
              options: [{ value: "option", label: "선택지" }],
            }
          : interaction === "select-element"
            ? {
                ...base,
                interaction,
                elementIds: [def.elements[0]?.id ?? "element"],
              }
            : interaction === "number-input"
              ? { ...base, interaction }
              : { ...base, interaction: "continue" };
      updateCheckpoint(checkpoint.id, replacement);
    } else if (property === "time")
      updateCheckpoint(checkpoint.id, { time: Number(value) });
    else if (property === "prompt")
      updateCheckpoint(checkpoint.id, { prompt: String(value) });
    else if (property === "required")
      updateCheckpoint(checkpoint.id, { required: Boolean(value) });
    else if (property === "options" && checkpoint.interaction === "choice") {
      const options = String(value)
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [optionValue, ...label] = entry.split(":");
          return {
            value: optionValue || "option",
            label: label.join(":") || optionValue || "선택지",
          };
        });
      if (options.length > 0) updateCheckpoint(checkpoint.id, { options });
    } else if (
      property === "elementIds" &&
      checkpoint.interaction === "select-element"
    ) {
      const elementIds = String(value)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (elementIds.length > 0)
        updateCheckpoint(checkpoint.id, { elementIds });
    } else if (
      ["min", "max", "step"].includes(property) &&
      checkpoint.interaction === "number-input"
    ) {
      updateCheckpoint(checkpoint.id, { [property]: Number(value) });
    } else if (property === "answer" && checkpoint.interaction !== "continue") {
      const answer =
        checkpoint.interaction === "number-input"
          ? Number(value)
          : String(value);
      updateCheckpoint(checkpoint.id, {
        predicate: { type: "equals", value: answer },
      });
    }
  } else if (key.startsWith("el.") && sel.kind === "element") {
    const prop = key.slice(3);
    const time = getCurrentTime();
    const el = def.elements.find((e) => e.id === sel.elementId);
    if (!el) return;
    if (prop === "locales" && el.type === "text") {
      const locales = parseLocales(String(value));
      updateElementBase(sel.elementId, {
        locales: locales.length > 0 ? locales : undefined,
      });
      return;
    }
    if (prop.startsWith("translation.") && el.type === "text") {
      const locale = prop.slice("translation.".length);
      const localized = el as AnimationElement & {
        translations?: Record<string, string>;
      };
      const translations = { ...(localized.translations ?? {}) };
      if (String(value)) translations[locale] = String(value);
      else delete translations[locale];
      updateElementBase(sel.elementId, { translations });
      return;
    }
    if (prop.startsWith("reference.") && el.type === "text") {
      const token = prop.slice("reference.".length);
      const annotated = el as AnimationElement & {
        references?: Record<string, string | string[]>;
      };
      const references = { ...(annotated.references ?? {}) };
      const targets = parseReferenceTargets(String(value));
      if (targets) references[token] = targets;
      else delete references[token];
      updateElementBase(sel.elementId, { references });
      return;
    }
    if (prop === "polygonSides" && el.type === "polygon") {
      const points = el.points
        .trim()
        .split(/\s+/)
        .map((point) => point.split(",").map(Number))
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
      if (points.length < 3) return;
      const minX = Math.min(...points.map(([x]) => x));
      const maxX = Math.max(...points.map(([x]) => x));
      const minY = Math.min(...points.map(([, y]) => y));
      const maxY = Math.max(...points.map(([, y]) => y));
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const radius = Math.max(4, Math.max(maxX - minX, maxY - minY) / 2);
      const sides = Math.max(3, Math.min(24, Math.round(Number(value)) || 3));
      const next = Array.from({ length: sides }, (_, index) => {
        const angle = (index * Math.PI * 2) / sides - Math.PI / 2;
        return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
      }).join(" ");
      updateElementBase(sel.elementId, { points: next });
      return;
    }
    const hasTrack = el.tracks.some((t) => t.property === prop);
    if (hasTrack) {
      setTrackKeyframe(sel.elementId, prop, time, value);
    } else {
      updateElementBase(sel.elementId, { [prop]: value });
    }
  } else if (key.startsWith("binding.") && sel.kind === "element") {
    const [, indexText, property] = key.split(".");
    const el = def.elements.find((item) => item.id === sel.elementId);
    const binding = el?.bindings[Number(indexText)];
    if (!el || !binding || !property) return;
    const bindings = el.bindings.map((item, index) =>
      index === Number(indexText)
        ? {
            ...item,
            [property]:
              property === "fallback"
                ? parseBindingFallback(String(value))
                : String(value),
          }
        : item,
    ) as DataBinding[];
    updateElementBase(el.id, { bindings });
  } else if (key.startsWith("ap.") && sel.kind === "element") {
    const [, idxStr, prop] = key.split(".");
    const idx = Number(idxStr);
    const patch: Partial<Appearance> = {};
    if (prop === "start") patch.start = Number(value);
    else if (prop === "end") patch.end = Number(value);
    else if (prop === "entryMode") patch.entryMode = value as EntryMode;
    else if (prop === "entryDuration") patch.entryDuration = Number(value);
    else if (prop === "exitMode") patch.exitMode = value as ExitMode;
    else if (prop === "exitDuration") patch.exitDuration = Number(value);
    updateAppearance(sel.elementId, idx, patch);
  } else if (key === "chapter.time" && sel.kind === "chapter") {
    updateChapter(sel.chapterId, { time: Number(value) });
  } else if (key === "chapter.label" && sel.kind === "chapter") {
    updateChapter(sel.chapterId, { label: String(value) });
  } else if (key === "chapter.subtitle" && sel.kind === "chapter") {
    updateChapter(sel.chapterId, { subtitle: String(value) });
  } else if (key.startsWith("chapter.reference.") && sel.kind === "chapter") {
    const chapter = def.chapters.find(({ id }) => id === sel.chapterId);
    if (!chapter) return;
    const token = key.slice("chapter.reference.".length);
    const annotated = chapter as typeof chapter & {
      references?: Record<string, string | string[]>;
    };
    const references = { ...(annotated.references ?? {}) };
    const targets = parseReferenceTargets(String(value));
    if (targets) references[token] = targets;
    else delete references[token];
    updateChapter(sel.chapterId, { references } as Partial<typeof chapter>);
  } else if (key.startsWith("effect.") && sel.kind === "effect") {
    const prop = key.slice(7);
    const patch: Record<string, unknown> = {};
    if (
      prop === "time" ||
      prop === "duration" ||
      prop === "scale" ||
      prop === "particles" ||
      prop === "radius"
    ) {
      patch[prop] = Number(value);
    } else {
      patch[prop] = value;
    }
    updateEffect(sel.effectId, patch as Partial<AnimationEffect>);
  }
}

function parseBindingFallback(
  value: string,
): string | number | boolean | undefined {
  if (value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  const number = Number(value);
  return Number.isFinite(number) && value.trim() !== "" ? number : value;
}

function onClick(e: Event): void {
  const target = e.target as HTMLElement;
  const def = getDef();
  if (!def) return;
  const sel = getSelection();

  if (target.closest("[data-add-binding]") && sel.kind === "element") {
    const el = def.elements.find((item) => item.id === sel.elementId);
    if (!el) return;
    const property = bindablePropertiesFor(el).find(
      (candidate) =>
        !el.bindings.some((binding) => binding.property === candidate),
    );
    if (property)
      updateElementBase(el.id, {
        bindings: [
          ...el.bindings,
          { property, pointer: "", formatter: "identity" },
        ],
      });
    return;
  }
  const deleteBinding = target.closest<HTMLElement>("[data-delete-binding]");
  if (deleteBinding && sel.kind === "element") {
    const el = def.elements.find((item) => item.id === sel.elementId);
    if (el)
      updateElementBase(el.id, {
        bindings: el.bindings.filter(
          (_, index) => index !== Number(deleteBinding.dataset.deleteBinding),
        ),
      });
    return;
  }

  const alignBtn = target.closest<HTMLElement>("[data-align]");
  if (alignBtn) {
    alignSelected(alignBtn.dataset.align as AlignKind);
    return;
  }
  const distBtn = target.closest<HTMLElement>("[data-distribute]");
  if (distBtn) {
    distributeSelected(distBtn.dataset.distribute as DistributeKind);
    return;
  }
  const createLayoutButton = target.closest<HTMLElement>(
    "[data-create-layout]",
  );
  if (createLayoutButton && sel.kind === "elements") {
    createLayout(
      sel.elementIds,
      createLayoutButton.dataset.createLayout as "row" | "column" | "grid",
    );
    return;
  }
  if (target.closest("[data-detach-layout]") && sel.kind === "elements") {
    detachFromLayout(sel.elementIds);
    return;
  }

  if (target.closest("[data-add-checkpoint]")) {
    addCheckpoint({
      id: uniqueCheckpointId(),
      time: getCurrentTime(),
      prompt: "계속 진행할까요?",
      required: true,
      interaction: "continue",
    });
    return;
  }
  const deleteCheckpointButton = target.closest<HTMLElement>(
    "[data-delete-checkpoint]",
  );
  if (deleteCheckpointButton?.dataset.deleteCheckpoint) {
    deleteCheckpoint(deleteCheckpointButton.dataset.deleteCheckpoint);
    return;
  }

  if (target.closest("[data-ungroup]") && sel.kind === "element") {
    ungroupElement(sel.elementId);
    return;
  }
  const childLink = target.closest<HTMLElement>("[data-select-child]");
  if (childLink) {
    e.preventDefault();
    setSelection({
      kind: "element",
      elementId: childLink.dataset.selectChild ?? "",
    });
    return;
  }

  if (target.closest("[data-add-chapter]")) {
    const id = uniqueChapterId();
    addChapter({
      id,
      time: getCurrentTime(),
      label: `Chapter ${id.split("-")[1]}`,
      subtitle: "",
      references: {},
    });
    return;
  }
  if (target.closest("[data-delete-chapter]") && sel.kind === "chapter") {
    deleteChapter(sel.chapterId);
    return;
  }
  if (target.closest("[data-add-effect]")) {
    const typeSel = document.getElementById(
      "studio-new-effect-type",
    ) as HTMLSelectElement | null;
    const type = (typeSel?.value ?? "highlight") as
      "highlight" | "pulse" | "flow";
    const firstEl = def.elements[0];
    if (!firstEl) return;
    const id = uniqueEffectId();
    const base = {
      id,
      elementId: firstEl.id,
      time: getCurrentTime(),
      duration: 500,
    };
    let eff: AnimationEffect;
    if (type === "highlight")
      eff = { ...base, type: "highlight", color: "#facc15" };
    else if (type === "pulse") eff = { ...base, type: "pulse", scale: 1.12 };
    else
      eff = {
        ...base,
        type: "flow",
        color: "#facc15",
        particles: 3,
        radius: 4,
        duration: 800,
      };
    addEffect(eff);
    return;
  }
  if (target.closest("[data-delete-effect]") && sel.kind === "effect") {
    deleteEffect(sel.effectId);
    return;
  }
  const removeAp = target.closest<HTMLElement>("[data-remove-appearance]");
  if (removeAp && sel.kind === "element") {
    const idx = Number(removeAp.dataset.removeAppearance);
    removeAppearance(sel.elementId, idx);
    return;
  }
  const removeTk = target.closest<HTMLElement>("[data-remove-track]");
  if (removeTk && sel.kind === "element") {
    removeTrack(sel.elementId, removeTk.dataset.removeTrack ?? "");
    return;
  }
  const removeKf = target.closest<HTMLElement>("[data-remove-kf-prop]");
  if (removeKf && sel.kind === "element") {
    const prop = removeKf.dataset.removeKfProp ?? "";
    const time = Number(removeKf.dataset.removeKfTime ?? "0");
    removeTrackKeyframe(sel.elementId, prop, time);
    return;
  }
  const addKf = target.closest<HTMLElement>("[data-add-kf]");
  if (addKf && sel.kind === "element") {
    const prop = addKf.dataset.addKf ?? "";
    const el = def.elements.find((e) => e.id === sel.elementId);
    const baseVal = el
      ? (el as unknown as Record<string, unknown>)[prop]
      : undefined;
    if (
      typeof baseVal === "string" ||
      typeof baseVal === "number" ||
      typeof baseVal === "boolean"
    ) {
      setTrackKeyframe(sel.elementId, prop, getCurrentTime(), baseVal);
    }
    return;
  }
  const jumpTime = target.closest<HTMLElement>("[data-jump-time]");
  if (jumpTime) {
    setCurrentTime(Number(jumpTime.dataset.jumpTime ?? "0"));
    return;
  }
  const addAp = target.closest("[data-add-appearance]");
  if (addAp && sel.kind === "element") {
    addAppearance(sel.elementId, {
      start: getCurrentTime(),
      end: def.duration,
      entryDuration: 300,
      exitDuration: 300,
    });
    return;
  }
}
