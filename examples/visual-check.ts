import "../src/styles/clotho-editor.css";
import "@kokoa/clotho/styles.css";
import { animationDocumentSchema } from "@kokoa/clotho";
import { mountPlayer } from "@kokoa/clotho/dom";
import { initProperties } from "../src/legacy/properties";
import { setDef, setSelection } from "../src/legacy/state";

const base = animationDocumentSchema.parse({
  clothoVersion: 1,
  id: "chapter-position-check",
  title: "Chapter list positions",
  duration: 2000,
  canvas: { width: 480, height: 180, background: "transparent" },
  elements: [
    {
      type: "circle",
      id: "dot",
      cx: 80,
      cy: 90,
      r: 24,
      fill: "#6366f1",
      appearances: [{ start: 0, end: 2000 }],
      tracks: [{ property: "cx", keyframes: [{ time: 0, value: 80 }, { time: 2000, value: 400 }] }],
    },
  ],
  chapters: [
    { id: "one", time: 0, label: "준비", subtitle: "입력 확인" },
    { id: "two", time: 700, label: "처리", subtitle: "상태 갱신" },
    { id: "three", time: 1400, label: "완료", subtitle: "결과 출력" },
  ],
  settings: { showCaption: true, showChapterList: true, chapterListPosition: "right" },
});

setDef(base);
setSelection({ kind: "none" });
initProperties(document.querySelector<HTMLElement>("#properties")!);

const previews = document.querySelector<HTMLElement>("#previews")!;
for (const position of ["left", "right", "top", "bottom"] as const) {
  const figure = document.createElement("figure");
  const heading = document.createElement("figcaption");
  heading.textContent = position;
  const host = document.createElement("div");
  figure.append(heading, host);
  previews.append(figure);
  mountPlayer(host, { ...base, settings: { ...base.settings, chapterListPosition: position } }, {
    player: { autoplay: false },
  });
}

const style = document.createElement("style");
style.textContent = `
  body { margin: 0; background: #f4f4f5; color: #18181b; font-family: system-ui, sans-serif; }
  .check-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 20px; padding: 20px; }
  #properties { position: sticky; top: 20px; align-self: start; max-height: calc(100vh - 40px); overflow: auto; background: white; border: 1px solid #d4d4d8; border-radius: 10px; padding: 12px; }
  .check-previews { display: grid; gap: 20px; }
  figure { margin: 0; background: white; border-radius: 12px; padding: 12px; }
  figcaption { margin-bottom: 8px; font: 700 14px ui-monospace, monospace; }
`;
document.head.append(style);
