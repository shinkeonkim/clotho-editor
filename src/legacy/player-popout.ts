import type { PlayerHandle } from "@kokoa/clotho/dom";
import { getDef, subscribe } from "./state";
import type { StudioUi } from "./studio-ui";
import { prepareStudioPopupDocument } from "./popup-document";

export function setupPlayerPopout(ui: StudioUi): void {
  const button = document.getElementById(
    "studio-player-preview",
  ) as HTMLButtonElement | null;
  if (!button) return;

  let popup: Window | null = null;
  let playerHandle: PlayerHandle | null = null;
  let unsubscribe: (() => void) | null = null;
  let renderedDocument = getDef();

  const cleanup = (): void => {
    playerHandle?.destroy();
    playerHandle = null;
    unsubscribe?.();
    unsubscribe = null;
    popup = null;
    button.setAttribute("aria-pressed", "false");
  };

  const render = async (): Promise<void> => {
    const targetWindow = popup;
    const def = getDef();
    if (!targetWindow || targetWindow.closed || !def) return;
    const container = targetWindow.document.getElementById(
      "clotho-player-preview",
    );
    if (!container) return;
    playerHandle?.destroy();
    container.replaceChildren();
    const { mountPlayer, koreanStrings } = await import("@kokoa/clotho/dom");
    if (!popup || popup !== targetWindow || targetWindow.closed) return;
    playerHandle = mountPlayer(container, def, {
      strings: koreanStrings,
      player: {
        autoplay: def.settings.autoplay,
        loop: def.settings.loop,
      },
    });
    renderedDocument = def;
  };

  button.addEventListener("click", () => {
    if (popup && !popup.closed) {
      popup.focus();
      return;
    }
    const def = getDef();
    if (!def) {
      ui.status.textContent = "먼저 애니메이션을 열거나 만들어주세요.";
      return;
    }
    const opened = window.open("", "_blank", "popup=yes,width=1100,height=760");
    if (!opened) {
      ui.status.textContent = "브라우저에서 popup을 허용해주세요.";
      return;
    }
    popup = opened;
    prepareStudioPopupDocument(opened.document, document, ui.app, {
      title: `${def.title || def.id} · 실제 미리보기`,
      bodyClass: "studio-player-popout",
    });
    const container = opened.document.createElement("main");
    container.id = "clotho-player-preview";
    opened.document.body.appendChild(container);
    button.setAttribute("aria-pressed", "true");
    renderedDocument = def;
    void render();
    unsubscribe = subscribe(() => {
      const next = getDef();
      if (next !== renderedDocument) void render();
    });
    opened.addEventListener("beforeunload", cleanup, { once: true });
    opened.focus();
  });
}
