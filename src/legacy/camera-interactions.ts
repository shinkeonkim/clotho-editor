import type { CameraControl } from "./state";

// The arithmetic behind dragging the camera frame, kept apart from the canvas for
// the same reason `drawing-interactions.ts` is: a decision that can be stated as a
// function of numbers should be testable without a DOM.

export type CameraDragMode = "pan" | "zoom" | "padding";

/** Which part of the frame the pointer went down on. */
export type CameraFramePart = "border" | "pan" | "resize";

export interface CameraDrag {
  readonly mode: CameraDragMode;
  /** Index into `camera.focus`, or -1 when the tracks are in control. */
  readonly focusIndex: number;
  /** The playhead when the drag started; keyframes are written here. */
  readonly time: number;
  readonly startX: number;
  readonly startY: number;
  readonly startCenterX: number;
  readonly startCenterY: number;
  readonly startZoom: number;
  readonly startPadding: number;
  readonly startDistance: number;
}

/**
 * What a drag from `part` means, given what controls the view.
 *
 * Null means the gesture has no meaning here, and the caller must not invent one.
 * Under a focus the camera centre *is* the target's centre, so there is nothing for
 * a pan to write — a pan that wrote track keyframes would be overridden by the
 * focus on the very next frame, which looks exactly like a broken control.
 */
export function cameraDragMode(
  part: CameraFramePart,
  control: CameraControl,
): CameraDragMode | null {
  if (control.kind === "none" || part === "border") return null;
  if (part === "resize") return control.kind === "focus" ? "padding" : "zoom";
  return control.kind === "tracks" ? "pan" : null;
}

/** Distance from the camera centre, floored so a drag through the centre is finite. */
export function centreDistance(
  point: { x: number; y: number },
  centreX: number,
  centreY: number,
): number {
  return Math.max(1, Math.hypot(point.x - centreX, point.y - centreY));
}

export interface CameraDragResult {
  readonly centerX?: number;
  readonly centerY?: number;
  readonly zoom?: number;
  readonly padding?: number;
}

/**
 * What the document should say after the pointer reaches `point`.
 *
 * Pan moves the centre *against* the pointer: the drag grabs the picture, so
 * dragging right shows what was to the left, which is what every map does.
 *
 * Resize keeps the grabbed corner under the pointer. Pulling a corner outward makes
 * the visible rectangle larger, and a larger rectangle is a *smaller* zoom — the
 * inverse relation is why this is worth stating rather than inlining.
 */
export function cameraDragResult(
  drag: CameraDrag,
  point: { x: number; y: number },
): CameraDragResult {
  if (drag.mode === "pan") {
    return {
      centerX: Math.round(drag.startCenterX - (point.x - drag.startX)),
      centerY: Math.round(drag.startCenterY - (point.y - drag.startY)),
    };
  }

  const ratio =
    centreDistance(point, drag.startCenterX, drag.startCenterY) /
    drag.startDistance;

  if (drag.mode === "zoom") {
    const zoom = Math.max(0.05, Math.min(20, drag.startZoom / ratio));
    return { zoom: Number(zoom.toFixed(3)) };
  }

  // Padding is the only size knob a focus has. The additive term keeps a drag from
  // stalling at padding 0, where a pure ratio can never grow.
  return {
    padding: Math.max(
      0,
      Math.round(drag.startPadding * ratio + (ratio - 1) * 40),
    ),
  };
}
