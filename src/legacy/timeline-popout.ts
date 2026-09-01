import type { StudioUi } from "./studio-ui";
import { bindTimelinePointerDocument } from "./timeline";
import { prepareStudioPopupDocument } from "./popup-document";

const POPUP_FEATURES = "popup=yes,width=1200,height=620";

export function setupTimelinePopout(
  ui: StudioUi,
  _togglePlayback: () => void,
): void {
  const timeline = ui.detachTimelineBtn.closest<HTMLElement>(
    ".studio-timeline-wrap",
  );
  if (!timeline) return;

  let popup: Window | null = null;
  let placeholder: Comment | null = null;
  let closeTimer: number | null = null;
  let unbindPopupPointerEvents: (() => void) | null = null;
  let restoring = false;

  const restoreTimeline = (closePopup: boolean): void => {
    if (restoring) return;
    restoring = true;
    if (placeholder?.parentNode) {
      placeholder.parentNode.insertBefore(timeline, placeholder.nextSibling);
      placeholder.remove();
    }
    placeholder = null;
    unbindPopupPointerEvents?.();
    unbindPopupPointerEvents = null;
    if (closeTimer !== null) window.clearInterval(closeTimer);
    closeTimer = null;
    ui.app.classList.remove("is-timeline-detached");
    ui.detachTimelineBtn.setAttribute("aria-pressed", "false");
    ui.detachTimelineBtn.textContent = "▣ 타임라인 분리";
    const windowToClose = popup;
    popup = null;
    if (closePopup && windowToClose && !windowToClose.closed) {
      windowToClose.close();
    }
    restoring = false;
  };

  ui.detachTimelineBtn.addEventListener("click", () => {
    if (popup && !popup.closed) {
      restoreTimeline(true);
      return;
    }

    const opened = window.open("", "_blank", POPUP_FEATURES);
    if (!opened) {
      ui.status.textContent = "브라우저에서 popup을 허용해주세요.";
      return;
    }
    popup = opened;
    placeholder = document.createComment("clotho-timeline-home");
    timeline.before(placeholder);

    prepareStudioPopupDocument(opened.document, document, ui.app, {
      title: "Clotho Timeline",
      bodyClass: "studio-timeline-popout",
    });
    opened.document.body.appendChild(timeline);
    unbindPopupPointerEvents = bindTimelinePointerDocument(opened.document);
    opened.addEventListener("beforeunload", () => restoreTimeline(false), {
      once: true,
    });
    closeTimer = window.setInterval(() => {
      if (!popup || popup.closed) restoreTimeline(false);
    }, 500);

    ui.app.classList.add("is-timeline-detached");
    ui.detachTimelineBtn.setAttribute("aria-pressed", "true");
    ui.detachTimelineBtn.textContent = "↙ 편집기에 다시 합치기";
    opened.focus();
  });
}
