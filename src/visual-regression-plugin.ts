import {
  AnimationAssertionError,
  animationFailureReport,
  animationSampleTimes,
  expectAnimation,
  snapshotAnimationMatrix,
} from "@kokoa/clotho/testing";
import type { EditorPluginDefinition } from "./plugin-host";

function downloadReport(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "clotho-animation-qa.html";
  link.click();
  URL.revokeObjectURL(url);
}

export function createVisualRegressionPlugin(): EditorPluginDefinition {
  return {
    manifest: {
      id: "dev.clotho.visual-regression",
      name: "Animation QA",
      capabilities: ["editor"],
      editor: { inspectors: ["animation-qa"] },
    },
    inspectors: {
      "animation-qa": {
        id: "animation-qa",
        label: "Animation QA",
        mount(container, context) {
          container.classList.add("studio-qa-panel");
          const title = document.createElement("strong");
          title.textContent = "Animation QA";
          const run = document.createElement("button");
          run.type = "button";
          run.className = "studio-btn";
          run.textContent = "전체 frame 검사";
          const status = document.createElement("p");
          status.className = "studio-props-empty";
          container.append(title, run, status);
          run.addEventListener("click", () => {
            const animation = context.getDocument();
            const errors: AnimationAssertionError[] = [];
            for (const time of animationSampleTimes(animation)) {
              for (const element of animation.elements) {
                if (!["rect", "circle", "image", "code"].includes(element.type))
                  continue;
                try {
                  expectAnimation(animation).at(time).insideCanvas(element.id);
                } catch (error) {
                  if (error instanceof AnimationAssertionError)
                    errors.push(error);
                }
              }
            }
            const snapshots = snapshotAnimationMatrix(animation);
            if (errors.length === 0) {
              status.textContent = `${snapshots.length}개 locale·theme frame을 검사했습니다. 문제가 없습니다.`;
              status.removeAttribute("data-error");
            } else {
              status.textContent = `${errors.length}개 문제를 발견했습니다. HTML report를 내려받습니다.`;
              status.dataset.error = "true";
              downloadReport(animationFailureReport(errors));
            }
          });
        },
      },
    },
  };
}
