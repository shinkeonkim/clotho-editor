import { animationDocumentSchema, type AnimationDocument } from "@kokoa/clotho";
import chapters from "./gallery/documents/chapters.json";
import connectors from "./gallery/documents/connectors.json";
import easing from "./gallery/documents/easing.json";
import effects from "./gallery/documents/effects.json";
import elements from "./gallery/documents/elements.json";
import incidentWalkthrough from "./gallery/documents/incident-walkthrough.json";
import groups from "./gallery/documents/groups.json";
import interpolation from "./gallery/documents/interpolation.json";
import iteration from "./gallery/documents/iteration.json";
import transitions from "./gallery/documents/transitions.json";

const galleryDocuments: readonly unknown[] = [
  incidentWalkthrough,
  elements,
  transitions,
  easing,
  interpolation,
  iteration,
  effects,
  connectors,
  groups,
  chapters,
];

/**
 * Generated from clotho/examples/gallery/documents.ts with:
 * bun examples/gallery/build.ts ../clotho-editor/app/gallery --documents-only
 */
export const exampleAnimations: readonly AnimationDocument[] =
  galleryDocuments.map((document) => animationDocumentSchema.parse(document));
