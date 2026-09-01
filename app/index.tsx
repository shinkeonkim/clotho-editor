import { createRoot } from "react-dom/client";
import { StudioMount } from "../src/StudioMount";
import {
  createLinterPlugin,
  createPerformanceProfilerPlugin,
  createResponsiveInspectorPlugin,
  createVisualRegressionPlugin,
} from "../src";
import { createLocalStorageRepository } from "../src/repository";
import { exampleAnimations } from "./examples";
import "../src/styles/clotho-editor.css";
import "@kokoa/clotho/styles.css";
import "./standalone.css";

const root = document.getElementById("root");
if (!root) throw new Error("에디터를 표시할 요소를 찾지 못했습니다.");

const repository = createLocalStorageRepository({
  examples: exampleAnimations,
});

const qaPlugins = [
  createResponsiveInspectorPlugin(),
  createPerformanceProfilerPlugin(),
  createLinterPlugin(),
  createVisualRegressionPlugin(),
];

createRoot(root).render(
  <StudioMount
    repository={repository}
    plugins={qaPlugins}
    resolvePluginPermissions={() => ({
      ui: true,
      documentRead: true,
      documentWrite: true,
    })}
  />,
);
