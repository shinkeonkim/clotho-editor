import {
  canRedo,
  canUndo,
  getDef,
  getSelection,
  isDirty,
  isDraft,
  markClean,
  setDef,
  setSelection,
  subscribe,
  updateCanvas,
  updateMeta,
  updateSettings,
  undo,
  redo,
} from "./state";
import { initCanvas } from "./canvas";
import { initElementList } from "./element-list";
import { initProperties } from "./properties";
import { initTimeline } from "./timeline";
import { IconLibraryDialog } from "./icon-library";
import { initGrid, isGridEnabled, setGridEnabled, subscribeGrid } from "./grid";
import {
  setupImageDropAndPaste,
  uploadAndInsertImage,
  type ImageUploadHost,
} from "./studio-image-upload";
import { setStatus, type StudioUi } from "./studio-ui";
import {
  createNew,
  deleteCurrent,
  loadAnimation,
  openLibrary,
  openNewDialog,
  saveCurrent,
  startDraft,
} from "./studio-save-load";
import { initPalette, registerCommands } from "./studio-palette";
import { initHistoryPanel, openHistoryPanel } from "./studio-history";
import { queryUi } from "./main/ui-query";
import { startInlineTextEdit } from "./main/inline-edit";
import {
  reflectGridUi,
  setupCanvasPan,
  setupTimelineResizer,
} from "./main/panes";
import { isPlaying, stopPreview, togglePlay } from "./main/playback";
import { bindKeyboardShortcuts } from "./main/keyboard-shortcuts";
import { downloadAnimationJson } from "../export-json";
import { animationDocumentSchema } from "@kokoa/clotho";
import { importAnimation } from "./api";
import type { ImageUploadResolver } from "./studio-image-upload";
import { setupTimelinePopout } from "./timeline-popout";
import { setupPlayerPopout } from "./player-popout";

export { getVisibleElementIds } from "./main/selection-nav";

declare global {
  interface Window {
    __studio__?: {
      setDef: typeof setDef;
      setSelection: typeof setSelection;
      getDef: typeof getDef;
      getSelection: typeof getSelection;
    };
  }
}

export function initStudio(
  opts: {
    initialId?: string;
    editorTitle?: string;
    resolveImage?: ImageUploadResolver;
  } = {},
): void {
  const ui = queryUi();
  if (!ui) {
    console.error("[studio] missing required elements");
    return;
  }
  if (false) {
    window.__studio__ = { setDef, setSelection, getDef, getSelection };
  }
  document.body.classList.add("editor-active");
  document.documentElement.classList.add("editor-active");
  const editorTitle = document.getElementById("studio-editor-title");
  if (editorTitle)
    editorTitle.textContent = opts.editorTitle ?? "Clotho Editor";

  initGrid();
  reflectGridUi(ui);
  subscribeGrid(() => reflectGridUi(ui));

  initCanvas(ui.canvas);
  initElementList(ui.elementList, ui.toolsRoot);
  initProperties(ui.propsRoot);
  initTimeline(ui.timelineTracks, ui.addStepBtn, ui.elementTracks);

  const iconDialog = IconLibraryDialog.mount();
  document
    .getElementById("studio-open-icons")
    ?.addEventListener("click", () => iconDialog?.open());

  ui.toolsRoot.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-canvas-preset]",
    );
    if (!btn) return;
    const preset = btn.dataset.canvasPreset ?? "";
    const m = preset.match(/^(\d+)x(\d+)$/);
    if (!m) return;
    updateCanvas({ width: Number(m[1]), height: Number(m[2]) });
  });

  ui.canvasWidthInput.addEventListener("input", () => {
    const w = Number(ui.canvasWidthInput.value);
    if (w >= 100 && w <= 8000) updateCanvas({ width: w });
  });
  ui.canvasHeightInput.addEventListener("input", () => {
    const h = Number(ui.canvasHeightInput.value);
    if (h >= 100 && h <= 8000) updateCanvas({ height: h });
  });

  const imageHost: ImageUploadHost = {
    app: ui.app,
    setStatus: (text, kind) => setStatus(ui, text, kind),
    resolveImage: opts.resolveImage,
  };
  ui.imageUploadBtn.addEventListener("click", () => ui.imageFileInput.click());
  ui.imageFileInput.addEventListener("change", () => {
    const file = ui.imageFileInput.files?.[0];
    if (file) void uploadAndInsertImage(file, imageHost);
    ui.imageFileInput.value = "";
  });

  const openHelp = (): void => {
    if (typeof ui.helpDialog.showModal === "function")
      ui.helpDialog.showModal();
    else ui.helpDialog.setAttribute("open", "");
  };
  ui.helpBtn.addEventListener("click", openHelp);
  document
    .getElementById("studio-floating-help")
    ?.addEventListener("click", openHelp);

  const HELP_HINT_KEY = "studio.helpHintDismissed";
  const helpHint = document.getElementById("studio-help-hint");
  if (helpHint && !localStorage.getItem(HELP_HINT_KEY)) {
    helpHint.hidden = false;
    setTimeout(() => helpHint.classList.add("is-visible"), 200);
    const dismiss = (): void => {
      helpHint.classList.remove("is-visible");
      setTimeout(() => {
        helpHint.hidden = true;
      }, 300);
      localStorage.setItem(HELP_HINT_KEY, "1");
    };
    document
      .getElementById("studio-help-hint-close")
      ?.addEventListener("click", dismiss);
    setTimeout(dismiss, 7000);
  }

  setupImageDropAndPaste(imageHost);
  setupTimelineResizer(ui);

  ui.canvas.addEventListener("dblclick", (e) => {
    const target = (e.target as Element).closest<SVGGElement>("[data-elem-id]");
    if (!target) return;
    const id = target.getAttribute("data-elem-id");
    if (!id) return;
    const def = getDef();
    const el = def?.elements.find((x) => x.id === id);
    if (!el || el.type !== "text") return;
    e.preventDefault();
    startInlineTextEdit(ui.canvas, el);
  });

  subscribe(() => reflectState(ui));
  reflectState(ui);

  setupCanvasPan(ui);

  ui.titleInput.addEventListener("input", () => {
    updateMeta({ title: ui.titleInput.value });
  });

  ui.openBtn.addEventListener("click", () => void openLibrary(ui));
  ui.newBtn.addEventListener("click", () => openNewDialog(ui));

  initPalette();
  initHistoryPanel();
  registerCommands([
    {
      id: "open",
      label: "📂 라이브러리 열기",
      hint: "저장된 애니메이션 목록",
      run: () => void openLibrary(ui),
    },
    {
      id: "new",
      label: "🆕 새 애니메이션",
      hint: "빈 캔버스로 시작",
      run: () => openNewDialog(ui),
    },
    {
      id: "save",
      label: "💾 저장",
      hint: "⌘S",
      run: () => void saveCurrent(ui),
    },
    {
      id: "delete",
      label: "🗑 삭제",
      hint: "현재 애니메이션 삭제",
      run: () => void deleteCurrent(ui),
    },
    { id: "undo", label: "↶ 실행 취소", hint: "⌘Z", run: () => undo() },
    { id: "redo", label: "↷ 다시 실행", hint: "⌘⇧Z / ⌘Y", run: () => redo() },
    {
      id: "history",
      label: "📜 작업 이력",
      hint: "⌘⇧H",
      run: () => openHistoryPanel(),
    },
    {
      id: "play",
      label: "▶ 재생 토글",
      hint: "미리보기 시작/중지",
      run: () => togglePlay(ui),
    },
    {
      id: "grid",
      label: "⊞ 격자 토글",
      hint: "G",
      run: () => setGridEnabled(!isGridEnabled()),
    },
    { id: "help", label: "⌨ 단축키 보기", hint: "? / Shift+/", run: openHelp },
  ]);
  ui.saveBtn.addEventListener("click", () => void saveCurrent(ui));
  ui.exportBtn.addEventListener("click", () => {
    const def = getDef();
    if (!def) return;
    downloadAnimationJson(def);
    setStatus(ui, `${def.id}.json 파일을 내려받았습니다.`, "ok");
  });
  ui.importBtn.addEventListener("click", () => ui.importFileInput.click());
  ui.importFileInput.addEventListener("change", () => {
    const file = ui.importFileInput.files?.[0];
    ui.importFileInput.value = "";
    if (!file) return;
    void file
      .text()
      .then((text) => animationDocumentSchema.parse(JSON.parse(text)))
      .then((def) => importAnimation(def))
      .then((def) => {
        setDef(def);
        markClean();
        setStatus(ui, `${def.id}.json 파일을 가져왔습니다.`, "ok");
      })
      .catch((error: unknown) => {
        setStatus(
          ui,
          `JSON 가져오기 실패: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      });
  });
  ui.deleteBtn.addEventListener("click", () => void deleteCurrent(ui));
  ui.undoBtn.addEventListener("click", () => undo());
  ui.redoBtn.addEventListener("click", () => redo());
  ui.gridToggleBtn.addEventListener("click", () =>
    setGridEnabled(!isGridEnabled()),
  );
  ui.playBtn.addEventListener("click", () => togglePlay(ui));
  ui.restartBtn.addEventListener("click", () => {
    if (isPlaying()) {
      stopPreview(ui);
      togglePlay(ui);
    }
  });
  ui.speedInput.addEventListener("input", () => {
    ui.speedValue.textContent = Number(ui.speedInput.value).toFixed(2) + "x";
    if (isPlaying()) {
      stopPreview(ui);
      togglePlay(ui);
    }
  });
  ui.previewLoopInput.addEventListener("change", () => {
    updateSettings({ loop: ui.previewLoopInput.checked });
    if (isPlaying()) {
      stopPreview(ui);
      togglePlay(ui);
    }
  });
  setupTimelinePopout(ui, () => togglePlay(ui));
  setupPlayerPopout(ui);

  ui.newCreateBtn.addEventListener("click", () => void createNew(ui));

  document.addEventListener("click", (e) => {
    const closer = (e.target as HTMLElement).closest(
      "[data-studio-dialog-close]",
    );
    if (!closer) return;
    const dialog = closer.closest<HTMLDialogElement>("dialog");
    if (!dialog) return;
    dialog.close();
    if (dialog === ui.newDialog) dialog.removeAttribute("data-mode");
  });

  document.addEventListener("click", (e) => {
    const dialog = e.target;
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
  });

  bindKeyboardShortcuts(ui);

  window.addEventListener("beforeunload", (e) => {
    if (isDirty()) e.preventDefault();
  });

  if (opts.initialId) {
    void loadAnimation(ui, opts.initialId);
  } else if (!getDef()) {
    startDraft();
    setStatus(ui, "임시 작업 (Draft), 저장 시 ID/제목 입력", "ok");
  } else {
    setStatus(ui, "준비됨", "ok");
  }
}

function reflectState(ui: StudioUi): void {
  ui.undoBtn.disabled = !canUndo();
  ui.redoBtn.disabled = !canRedo();
  const def = getDef();
  if (def) {
    ui.titleInput.disabled = false;
    ui.canvasWidthInput.disabled = false;
    ui.canvasHeightInput.disabled = false;
    if (document.activeElement !== ui.titleInput) {
      ui.titleInput.value = def.title;
    }
    if (document.activeElement !== ui.canvasWidthInput) {
      ui.canvasWidthInput.value = String(def.canvas.width);
    }
    if (document.activeElement !== ui.canvasHeightInput) {
      ui.canvasHeightInput.value = String(def.canvas.height);
    }
    ui.idDisplay.textContent = isDraft()
      ? "Draft"
      : ((def as { id?: string }).id ?? "");
    ui.saveBtn.disabled = false;
    ui.exportBtn.disabled = false;
    ui.deleteBtn.disabled = isDraft();
    if (document.activeElement !== ui.previewLoopInput) {
      ui.previewLoopInput.checked = def.settings.loop;
    }
  } else {
    ui.titleInput.disabled = true;
    ui.canvasWidthInput.disabled = true;
    ui.canvasHeightInput.disabled = true;
    ui.titleInput.value = "";
    ui.canvasWidthInput.value = "";
    ui.canvasHeightInput.value = "";
    ui.idDisplay.textContent = "";
    ui.saveBtn.disabled = true;
    ui.exportBtn.disabled = true;
    ui.deleteBtn.disabled = true;
  }
}
