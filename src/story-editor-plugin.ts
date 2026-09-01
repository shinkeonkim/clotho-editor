import {
  defineStory,
  type AnimationDocument,
  type StoryEdge,
  type StoryManifest,
} from "@kokoa/clotho";
import type { EditorPluginDefinition } from "./plugin-host";

export interface StoryEditorOptions {
  manifest: StoryManifest;
  onChange?(manifest: StoryManifest): void;
}

export function replaceStoryNodeDocument(
  manifest: StoryManifest,
  nodeId: string,
  document: AnimationDocument,
): StoryManifest {
  return defineStory({
    ...manifest,
    nodes: manifest.nodes.map((node) =>
      node.id === nodeId ? { ...node, document } : node,
    ),
  });
}

export function appendStoryEdge(
  manifest: StoryManifest,
  edge: StoryEdge,
): StoryManifest {
  return defineStory({ ...manifest, edges: [...manifest.edges, edge] });
}

export function createStoryEditorPlugin(
  options: StoryEditorOptions,
): EditorPluginDefinition {
  let manifest = structuredClone(options.manifest);
  let activeNode = manifest.initialNode;
  return {
    manifest: {
      id: "dev.clotho.story",
      name: "Story Graph",
      capabilities: ["editor"],
      editor: { panels: ["story-graph"] },
    },
    panels: {
      "story-graph": {
        id: "story-graph",
        label: "Story Graph",
        mount(container, context) {
          const render = () => {
            container.innerHTML = `<div class="studio-tools-section"><div class="studio-tools-title">Story Graph</div><div class="studio-story-nodes">${manifest.nodes.map((node) => `<button type="button" class="studio-btn${node.id === activeNode ? " is-active" : ""}" data-story-node="${escapeAttribute(node.id)}">${escapeHtml(node.title || node.id)}</button>`).join("")}</div><div class="studio-tools-hint">${manifest.edges.map((edge) => `${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}${edge.label ? ` · ${escapeHtml(edge.label)}` : ""}`).join("<br>") || "연결이 없습니다."}</div></div>`;
          };
          const click = (event: Event) => {
            const button = (event.target as HTMLElement).closest<HTMLElement>(
              "[data-story-node]",
            );
            const nextId = button?.dataset.storyNode;
            if (!nextId || nextId === activeNode) return;
            manifest = replaceStoryNodeDocument(
              manifest,
              activeNode,
              context.getDocument(),
            );
            const node = manifest.nodes.find(({ id }) => id === nextId);
            if (!node) return;
            activeNode = nextId;
            context.replaceDocument(node.document);
            options.onChange?.(structuredClone(manifest));
            render();
          };
          container.addEventListener("click", click);
          render();
          return () => container.removeEventListener("click", click);
        },
      },
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
