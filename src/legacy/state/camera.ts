import type { Camera, CameraFocus, CameraProperty } from "@kokoa/clotho";
import { emit, mutateDef, state } from "./internals";

// The camera is document-level, not per element, so it does not fit the element
// track helpers next door. It has its own module for the same reason chapters and
// effects do.
//
// A document without a camera has no `camera` field at all — that is deliberate in
// the schema, so that every document written before the camera existed renders
// exactly as it did. So every mutation here creates the field on demand, and
// `clearCamera` removes it again rather than leaving an empty one behind.

const EMPTY: Camera = { tracks: [], focus: [], strokeScaling: "scale" };

export function getCamera(): Camera {
  return state.def?.camera ?? EMPTY;
}

/** Whether the document actually carries a camera, as opposed to defaults. */
export function hasCamera(): boolean {
  const camera = state.def?.camera;
  return (
    camera !== undefined &&
    (camera.tracks.length > 0 ||
      camera.focus.length > 0 ||
      camera.strokeScaling !== "scale")
  );
}

function ensure(def: { camera?: Camera }): Camera {
  def.camera ??= { tracks: [], focus: [], strokeScaling: "scale" };
  return def.camera;
}

export function setCameraStrokeScaling(value: Camera["strokeScaling"]): void {
  mutateDef(
    (def) => {
      ensure(def).strokeScaling = value;
    },
    `카메라 선 두께: ${value}`,
    "camera",
  );
}

/** Add or replace the keyframe at `time` on one camera property. */
export function setCameraKeyframe(
  property: CameraProperty,
  time: number,
  value: number,
  ease?: CameraKeyframeEase,
): void {
  mutateDef(
    (def) => {
      const camera = ensure(def);
      let track = camera.tracks.find((t) => t.property === property);
      if (!track) {
        track = { property, keyframes: [] };
        camera.tracks.push(track);
        camera.tracks.sort(
          (a, b) => ORDER.indexOf(a.property) - ORDER.indexOf(b.property),
        );
      }
      const existing = track.keyframes.findIndex((kf) => kf.time === time);
      const next = { time, value, ...(ease ? { ease } : {}) };
      if (existing >= 0) track.keyframes[existing] = next;
      else track.keyframes.push(next);
      track.keyframes.sort((a, b) => a.time - b.time);
    },
    `카메라 keyframe: ${property} @ ${time}ms`,
    "camera",
  );
}

type CameraKeyframeEase = NonNullable<
  Camera["tracks"][number]["keyframes"][number]["ease"]
>;

/** Camera properties in the order they are shown, which is also authoring order. */
const ORDER: CameraProperty[] = ["zoom", "x", "y"];

/**
 * Move a keyframe in time, keeping its value.
 *
 * Separate from `setCameraKeyframe` because a timeline drag has to remove the old
 * time as well; doing it as remove-then-set would push two history entries for one
 * gesture.
 */
export function moveCameraKeyframe(
  property: CameraProperty,
  from: number,
  to: number,
): void {
  if (from === to) return;
  mutateDef(
    (def) => {
      const track = def.camera?.tracks.find((t) => t.property === property);
      const kf = track?.keyframes.find((k) => k.time === from);
      if (!track || !kf) return;
      // A keyframe already sitting on the destination is replaced, which is what
      // dragging one onto another means everywhere else in this timeline.
      track.keyframes = track.keyframes.filter(
        (k) => k.time !== from && k.time !== to,
      );
      track.keyframes.push({ ...kf, time: to });
      track.keyframes.sort((a, b) => a.time - b.time);
    },
    `카메라 keyframe 이동: ${property} ${from}→${to}ms`,
    "camera",
  );
}

export function removeCameraKeyframe(
  property: CameraProperty,
  time: number,
): void {
  mutateDef(
    (def) => {
      const camera = def.camera;
      const track = camera?.tracks.find((t) => t.property === property);
      if (!camera || !track) return;
      track.keyframes = track.keyframes.filter((kf) => kf.time !== time);
      // The schema requires at least one keyframe, so an emptied track is dropped
      // rather than left as an invalid stub that `mutateDef` would reject.
      if (track.keyframes.length === 0) {
        camera.tracks = camera.tracks.filter((t) => t.property !== property);
      }
    },
    `카메라 keyframe 삭제: ${property} @ ${time}ms`,
    "camera",
  );
}

export function removeCameraTrack(property: CameraProperty): void {
  mutateDef(
    (def) => {
      if (def.camera) {
        def.camera.tracks = def.camera.tracks.filter(
          (t) => t.property !== property,
        );
      }
    },
    `카메라 track 삭제: ${property}`,
    "camera",
  );
}

export function addCameraFocus(focus: CameraFocus): void {
  mutateDef(
    (def) => {
      const camera = ensure(def);
      camera.focus.push(focus);
      camera.focus.sort((a, b) => a.time - b.time);
    },
    `카메라 focus 추가 @ ${focus.time}ms`,
    "camera",
  );
  const index = getCamera().focus.findIndex(
    (f) =>
      f.time === focus.time && f.elementIds.join() === focus.elementIds.join(),
  );
  state.selection = {
    kind: "camera",
    focusIndex: index < 0 ? undefined : index,
  };
  emit();
}

/**
 * Patch one focus entry.
 *
 * Sorting can move it, so the selection is re-pointed at the same entry rather than
 * at whatever ends up at the old index.
 */
export function updateCameraFocus(
  index: number,
  patch: Partial<CameraFocus>,
): void {
  const before = getCamera().focus[index];
  if (!before) return;
  const after = { ...before, ...patch };
  mutateDef(
    (def) => {
      const camera = def.camera;
      if (!camera?.focus[index]) return;
      camera.focus[index] = after;
      camera.focus.sort((a, b) => a.time - b.time);
    },
    `카메라 focus 수정: ${Object.keys(patch).join(", ")}`,
    "camera",
  );
  if (state.selection.kind === "camera") {
    // Matched by value, not identity: `mutateDef` clones the document and re-parses
    // it, so the object written above is never the one that comes back.
    const moved = getCamera().focus.findIndex(
      (f) =>
        f.time === after.time &&
        f.elementIds.join() === after.elementIds.join() &&
        f.duration === after.duration,
    );
    state.selection = {
      kind: "camera",
      focusIndex: moved < 0 ? undefined : moved,
    };
    emit();
  }
}

export function deleteCameraFocus(index: number): void {
  mutateDef(
    (def) => {
      if (def.camera) {
        def.camera.focus = def.camera.focus.filter((_, i) => i !== index);
      }
    },
    `카메라 focus 삭제 #${index + 1}`,
    "camera",
  );
  if (state.selection.kind === "camera") {
    state.selection = { kind: "camera" };
    emit();
  }
}

/** Remove the camera entirely, so the document renders as it did without one. */
export function clearCamera(): void {
  mutateDef(
    (def) => {
      delete (def as { camera?: Camera }).camera;
    },
    "카메라 제거",
    "camera",
  );
  if (state.selection.kind === "camera") {
    state.selection = { kind: "none" };
    emit();
  }
}
