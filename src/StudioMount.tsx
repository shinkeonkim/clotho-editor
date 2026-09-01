"use client";

import { useEffect, useRef } from "react";
import type { AnimationRepository } from "./repository";
import { configureAnimationRepository } from "./legacy/api";
import type { ImageUploadResolver } from "./legacy/studio-image-upload";
// The stylesheet ships as a separate entry rather than an import, so a consumer that
// only wants the headless pieces does not pull CSS into its bundle:
//   import "@kokoa/clotho-editor/styles.css";

export interface StudioMountProps {
  initialId?: string;
  repository?: AnimationRepository;
  editorTitle?: string;
  resolveImage?: ImageUploadResolver;
}

const CANVAS_PRESETS: {
  id: string;
  label: string;
  sub: string;
  w: number;
  h: number;
}[] = [
  { id: "800x500", label: "8:5", sub: "800×500", w: 32, h: 20 },
  { id: "1280x720", label: "16:9", sub: "HD", w: 32, h: 18 },
  { id: "1024x768", label: "4:3", sub: "1024×768", w: 28, h: 21 },
  { id: "600x600", label: "1:1", sub: "정사각", w: 22, h: 22 },
  { id: "1200x400", label: "3:1", sub: "와이드", w: 36, h: 12 },
  { id: "375x812", label: "9:19", sub: "모바일", w: 14, h: 30 },
];

const PRESET_HTML = CANVAS_PRESETS.map(
  (p) => `
    <button type="button" class="studio-preset-btn" aria-label="캔버스 크기 ${p.id} (${p.sub})" title="${p.id} · ${p.sub}" data-canvas-preset="${p.id}">
      <svg class="studio-preset-thumb" viewBox="0 0 ${p.w + 2} ${p.h + 2}" width="${p.w + 2}" height="${p.h + 2}" aria-hidden="true">
        <rect x="1" y="1" width="${p.w}" height="${p.h}" rx="2" />
      </svg>
      <span class="studio-preset-label">${p.label}</span>
      <span class="studio-preset-sub">${p.sub}</span>
    </button>`,
).join("");

const SKELETON = `
<div id="studio-app" class="studio-app">
  <header class="studio-header">
    <h1 id="studio-editor-title" class="studio-header-title">Clotho Editor</h1>
    <div class="studio-header-actions">
      <button type="button" id="studio-open" class="studio-btn" aria-label="저장된 애니메이션 열기">📁 열기</button>
      <button type="button" id="studio-new" class="studio-btn" aria-label="새 애니메이션 만들기">＋ 새 애니메이션</button>
      <button type="button" id="studio-undo" class="studio-btn studio-btn-icon" aria-label="실행 취소" title="실행 취소 (⌘Z)" disabled>↶</button>
      <button type="button" id="studio-redo" class="studio-btn studio-btn-icon" aria-label="다시 실행" title="다시 실행 (⌘⇧Z / ⌘Y)" disabled>↷</button>
      <button type="button" id="studio-grid-toggle" class="studio-btn studio-btn-grid" aria-label="격자 + 스냅" title="격자 + 스냅 (G)" aria-pressed="false"><span class="studio-btn-grid-icon">⊞</span><span class="studio-btn-grid-label" id="studio-grid-label">격자 끔</span></button>
      <input type="text" id="studio-title" class="studio-title-input" placeholder="제목" aria-label="애니메이션 제목" disabled />
      <span id="studio-id-display" class="studio-id-display"></span>
      <span id="studio-status" class="studio-status" aria-live="polite">대기 중</span>
      <button type="button" id="studio-save" class="studio-btn studio-btn-primary" aria-label="저장" disabled>💾 저장 (⌘S)</button>
      <button type="button" id="studio-export-json" class="studio-btn" aria-label="현재 애니메이션을 JSON 파일로 내보내기" disabled>⬇ JSON 내보내기</button>
      <button type="button" id="studio-import-json" class="studio-btn" aria-label="JSON 파일에서 애니메이션 가져오기">⬆ JSON 가져오기</button>
      <input type="file" id="studio-import-file" accept="application/json,.json" hidden />
      <button type="button" id="studio-delete" class="studio-btn studio-btn-danger" aria-label="삭제" disabled>🗑 삭제</button>
    </div>
  </header>

  <div class="studio-body">
    <aside class="studio-tools" aria-label="요소 추가">
      <div class="studio-tools-section">
        <div class="studio-tools-title">도구</div>
        <button type="button" class="studio-tool-btn is-active" data-studio-tool="select" aria-pressed="true" title="선택 · 이동 · 크기 (V)"><span>↖ 선택 · 이동 · 크기</span><kbd>V</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="rect" title="사각형 (R)" aria-label="사각형 도구"><span>□ Rect</span><kbd>R</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="circle" title="원 (O)" aria-label="원 도구"><span>○ Circle</span><kbd>O</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="line" title="선 (L)" aria-label="선 도구"><span>／ Line</span><kbd>L</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="arrow" title="화살표 (A)" aria-label="화살표 도구"><span>↗ Arrow</span><kbd>A</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="text" title="텍스트 (T)" aria-label="텍스트 도구"><span>T Text</span><kbd>T</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="image" title="이미지 (I)" aria-label="이미지 도구"><span>🖼 Image</span><kbd>I</kbd></button>
        <button type="button" class="studio-tool-btn" data-add-element="path" title="Path (B)" aria-label="Path 도구"><span>✎ Path</span><kbd>B</kbd></button>
        <div class="studio-tool-with-option"><button type="button" class="studio-tool-btn" data-add-element="polygon" title="다각형 (Y)" aria-label="다각형 도구"><span>⬢ Polygon</span><kbd>Y</kbd></button><label>변 <input type="number" id="studio-polygon-sides" min="3" max="24" value="6" aria-label="다각형의 변 개수" /></label></div>
        <button type="button" class="studio-tool-btn" id="studio-open-icons" title="아이콘 라이브러리" aria-label="아이콘 라이브러리 추가">🎨 Icons</button>
      </div>
      <div class="studio-tools-section">
        <div class="studio-tools-title">캔버스 크기</div>
        <div class="studio-canvas-size-row">
          <input type="number" id="studio-canvas-width" class="studio-canvas-size-input" min="100" max="8000" step="10" placeholder="width" />
          <span class="studio-canvas-size-x">×</span>
          <input type="number" id="studio-canvas-height" class="studio-canvas-size-input" min="100" max="8000" step="10" placeholder="height" />
        </div>
        <div class="studio-canvas-presets">${PRESET_HTML}</div>
      </div>
      <div class="studio-tools-section">
        <div class="studio-tools-title">이미지</div>
        <button type="button" class="studio-tool-btn" id="studio-image-upload">📤 이미지 업로드</button>
        <input type="file" id="studio-image-file" accept="image/*" hidden />
        <div class="studio-tools-hint">이미지를 캔버스에 직접 드래그하거나 ⌘V 로 붙여넣어도 됩니다.</div>
      </div>
      <div class="studio-tools-section">
        <div class="studio-tools-title">단축키</div>
        <button type="button" class="studio-tool-btn" id="studio-help">⌨ 단축키 보기 (?)</button>
      </div>
      <div class="studio-tools-section">
        <div class="studio-tools-title">요소 목록</div>
        <input type="text" id="studio-element-search" class="studio-element-search" placeholder="🔍 검색 (name / label / id / type)" autocomplete="off" />
        <ul id="studio-element-list" class="studio-element-list"></ul>
      </div>
    </aside>

    <main class="studio-canvas-wrap">
      <div class="studio-canvas-frame">
        <svg id="studio-canvas" class="studio-canvas" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
      <button type="button" id="studio-floating-help" class="studio-floating-help" aria-label="단축키 보기" title="단축키 보기 (? / Shift+/)">?</button>
      <div id="studio-help-hint" class="studio-help-hint" hidden>
        <span>💡 단축키는 <kbd>?</kbd> 또는 우측 하단 버튼으로 확인하세요</span>
        <button type="button" id="studio-help-hint-close" aria-label="닫기">✕</button>
      </div>
    </main>

    <aside class="studio-props" aria-label="속성 패널">
      <div id="studio-props-content" class="studio-props-content">
        <p class="studio-props-empty">요소 또는 step 을 선택하세요.</p>
      </div>
    </aside>
  </div>

  <div id="studio-timeline-resizer" class="studio-timeline-resizer" role="separator" aria-orientation="horizontal" aria-label="타임라인 영역 크기 조정" tabindex="0"><span class="studio-timeline-resizer-grip" aria-hidden="true"><i></i><i></i><i></i></span></div>
  <footer class="studio-timeline-wrap">
    <div class="studio-timeline-header">
      <button type="button" id="studio-play" class="studio-btn">▶ Play</button>
      <button type="button" id="studio-restart" class="studio-btn">⟲ Reset</button>
      <label class="studio-speed">속도
        <input type="range" id="studio-speed" min="0.25" max="3" step="0.25" value="1" />
        <span id="studio-speed-value">1.00x</span>
      </label>
      <label class="studio-timeline-option"><input type="checkbox" id="studio-preview-loop" /> 무한 재생</label>
      <button type="button" id="studio-detach-timeline" class="studio-btn" aria-pressed="false">▣ 타임라인 분리</button>
      <span class="studio-timeline-spacer"></span>
      <button type="button" id="studio-add-step" class="studio-btn">＋ Chapter 추가</button>
    </div>
    <div class="studio-timeline-tracks-wrap">
      <div id="studio-timeline-tracks" class="studio-timeline-tracks"></div>
    </div>
    <div class="studio-element-tracks-wrap">
      <div id="studio-element-tracks" class="studio-element-tracks"></div>
    </div>
  </footer>

  <dialog id="studio-library-dialog" class="studio-dialog">
    <div class="studio-dialog-header">
      <h2>저장된 애니메이션</h2>
      <button type="button" class="studio-dialog-close" data-studio-dialog-close>✕</button>
    </div>
    <div class="studio-dialog-body">
      <ul id="studio-library-list" class="studio-library-list"></ul>
    </div>
  </dialog>

  <dialog id="studio-icon-dialog" class="studio-dialog">
    <div class="studio-dialog-header">
      <h2>🎨 아이콘 라이브러리</h2>
      <button type="button" class="studio-dialog-close" data-icon-dialog-close>✕</button>
    </div>
    <div class="studio-dialog-body">
      <input type="search" id="studio-icon-search" placeholder="아이콘 검색…" class="studio-icon-search-input" />
      <div id="studio-icon-list"></div>
    </div>
  </dialog>

  <dialog id="studio-help-dialog" class="studio-dialog studio-dialog-small">
    <div class="studio-dialog-header">
      <h2>⌨ 단축키</h2>
      <button type="button" class="studio-dialog-close" data-studio-dialog-close>✕</button>
    </div>
    <div class="studio-dialog-body">
      <table class="studio-help-table">
        <tbody>
          <tr><th>⌘ S</th><td>저장</td></tr>
          <tr><th>⌘ Z / ⌘ ⇧ Z</th><td>Undo / Redo</td></tr>
          <tr><th>⌘ C / V / X</th><td>요소 복사 / 붙여넣기 / 잘라내기</td></tr>
          <tr><th>V / R / O</th><td>선택 / 사각형 / 원 도구</td></tr>
          <tr><th>L / A</th><td>선 / 화살표 도구</td></tr>
          <tr><th>T / I / B / Y</th><td>텍스트 / 이미지 / Path / 다각형 도구</td></tr>
          <tr><th>⌘·Ctrl·Shift + 클릭</th><td>여러 요소 선택 또는 선택 해제</td></tr>
          <tr><th>Delete / Backspace</th><td>선택된 요소 또는 step 삭제</td></tr>
          <tr><th>?</th><td>이 화면 열기</td></tr>
          <tr><th>Esc</th><td>선택 해제 / 다이얼로그 닫기</td></tr>
          <tr><th>드래그 (캔버스)</th><td>요소 이동</td></tr>
          <tr><th>드래그 (요소 위 dot)</th><td>화살표 연결</td></tr>
          <tr><th>드래그 (선/화살표 끝점)</th><td>끝점 재배치 + 다른 요소에 sticky</td></tr>
          <tr><th>드래그 (회전 핸들)</th><td>요소 회전</td></tr>
          <tr><th>드래그 (타임라인 바 우측)</th><td>step duration 조정</td></tr>
          <tr><th>이미지 드래그 in</th><td>이미지 업로드 + 배치</td></tr>
        </tbody>
      </table>
    </div>
  </dialog>

  <dialog id="studio-new-dialog" class="studio-dialog studio-dialog-small">
    <div class="studio-dialog-header">
      <h2 id="studio-new-dialog-title">새 애니메이션 만들기</h2>
      <button type="button" class="studio-dialog-close" data-studio-dialog-close aria-label="닫기">✕</button>
    </div>
    <div class="studio-dialog-body">
      <label class="studio-field"><span>ID (영문 소문자 / 숫자 / - / _)</span>
        <input type="text" id="studio-new-id" placeholder="예: user-login-flow" />
      </label>
      <label class="studio-field"><span>제목</span>
        <input type="text" id="studio-new-title" placeholder="사용자 로그인 흐름" />
      </label>
      <div id="studio-new-error" class="studio-new-error"></div>
    </div>
    <footer class="studio-dialog-footer">
      <button type="button" class="studio-btn" data-studio-dialog-close>취소</button>
      <button type="button" id="studio-new-create" class="studio-btn studio-btn-primary">만들기</button>
    </footer>
  </dialog>

  <dialog id="studio-palette-dialog" class="studio-palette-dialog">
    <input type="text" id="studio-palette-input" class="studio-palette-input" placeholder="🔍 명령 또는 요소 검색…" autocomplete="off" spellcheck="false" />
    <ul id="studio-palette-list" class="studio-palette-list"></ul>
    <div class="studio-palette-footer">↑↓ 이동 · Enter 실행 · Esc 닫기</div>
  </dialog>

  <dialog id="studio-history-dialog" class="studio-history-dialog">
    <div class="studio-history-header">
      <h2>📜 작업 이력</h2>
      <button type="button" class="studio-dialog-close" data-studio-dialog-close aria-label="닫기">✕</button>
    </div>
    <ul id="studio-history-list" class="studio-history-list"></ul>
    <div class="studio-history-footer">항목을 클릭하면 해당 시점으로 이동합니다 · ⌘Z / ⌘⇧Z</div>
  </dialog>
</div>
`;

export function StudioMount({
  initialId,
  repository,
  editorTitle = "Clotho Editor",
  resolveImage,
}: StudioMountProps): React.JSX.Element {
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    if (repository) configureAnimationRepository(repository);
    let disposed = false;
    void import("./legacy/main").then(({ initStudio }) => {
      if (disposed) return;
      initStudio({ initialId, editorTitle, resolveImage });
    });
    return () => {
      disposed = true;
      document.body.classList.remove("editor-active");
      document.documentElement.classList.remove("editor-active");
    };
  }, [editorTitle, initialId, repository, resolveImage]);

  return (
    <section className="studio-shell w-full" data-pagefind-ignore="all">
      <div dangerouslySetInnerHTML={{ __html: SKELETON }} />
    </section>
  );
}
