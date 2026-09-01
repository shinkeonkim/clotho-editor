import {
  buildScene,
  compileSceneDependencyPlan,
  type AnimationDocument,
} from "@kokoa/clotho";
import type { EditorPluginDefinition } from "./plugin-host";

export interface SceneProfile {
  elementCount: number;
  trackCount: number;
  keyframeCount: number;
  sampleCount: number;
  totalMs: number;
  averageMs: number;
  maxMs: number;
  overBudget: boolean;
}

export function profileAnimation(
  document: AnimationDocument,
  sampleCount = 30,
  frameBudgetMs = 16.7,
): SceneProfile {
  const plan = compileSceneDependencyPlan(document);
  const samples: number[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const time =
      sampleCount === 1 ? 0 : (document.duration * index) / (sampleCount - 1);
    const started = performance.now();
    buildScene(document, time);
    samples.push(performance.now() - started);
  }
  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  const maxMs = Math.max(0, ...samples);
  return {
    elementCount: plan.elementCount,
    trackCount: plan.trackCount,
    keyframeCount: plan.keyframeCount,
    sampleCount,
    totalMs,
    averageMs: totalMs / Math.max(1, sampleCount),
    maxMs,
    overBudget: maxMs > frameBudgetMs,
  };
}

export function createPerformanceProfilerPlugin(): EditorPluginDefinition {
  return {
    manifest: {
      id: "dev.clotho.performance",
      name: "Scene Profiler",
      capabilities: ["editor"],
      editor: { inspectors: ["performance"] },
    },
    inspectors: {
      performance: {
        id: "performance",
        label: "Scene Profiler",
        mount(container, context) {
          const run = () => {
            const profile = profileAnimation(context.getDocument());
            container.innerHTML = `<div class="studio-props-header"><span class="studio-props-header-title">Scene Profiler</span></div><dl class="studio-profile"><div><dt>Elements</dt><dd>${profile.elementCount}</dd></div><div><dt>Tracks / keyframes</dt><dd>${profile.trackCount} / ${profile.keyframeCount}</dd></div><div><dt>평균 / 최대</dt><dd>${profile.averageMs.toFixed(2)} / ${profile.maxMs.toFixed(2)} ms</dd></div></dl><p class="studio-template-status" data-error="${profile.overBudget}">${profile.overBudget ? "16.7ms frame budget을 넘었습니다." : "60fps frame budget 안에 있습니다."}</p><button type="button" class="studio-btn" data-run-profiler>다시 측정</button>`;
          };
          const click = (event: Event) => {
            if ((event.target as HTMLElement).closest("[data-run-profiler]"))
              run();
          };
          container.addEventListener("click", click);
          run();
          return () => container.removeEventListener("click", click);
        },
      },
    },
  };
}
