export type StudioTool =
  | "select"
  | "rect"
  | "circle"
  | "line"
  | "arrow"
  | "text"
  | "image"
  | "path"
  | "polygon";

let activeTool: StudioTool = "select";
const listeners = new Set<(tool: StudioTool) => void>();

export function getActiveTool(): StudioTool {
  return activeTool;
}

export function setActiveTool(tool: StudioTool): void {
  activeTool = tool;
  for (const listener of listeners) listener(tool);
}

export function subscribeActiveTool(
  listener: (tool: StudioTool) => void,
): () => void {
  listeners.add(listener);
  listener(activeTool);
  return () => listeners.delete(listener);
}
