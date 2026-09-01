import type {
  AnimationTemplate,
  ParameterSchema,
  TemplateParameterError,
  TemplateReference,
} from "@kokoa/clotho";
import { downloadAnimationJson } from "./export-json";
import type { EditorPluginDefinition } from "./plugin-host";

export function initialParameterValue(schema: ParameterSchema): unknown {
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schema.type === "string") return "";
  if (schema.type === "number") return schema.min ?? 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "enum") return schema.values[0];
  if (schema.type === "array") return [];
  return Object.fromEntries(
    Object.entries(schema.properties).map(([key, child]) => [
      key,
      initialParameterValue(child),
    ]),
  );
}

export function parameterInputValue(
  schema: ParameterSchema,
  raw: string | boolean,
): unknown {
  if (schema.type === "boolean") return Boolean(raw);
  if (schema.type === "number") return Number(raw);
  if (schema.type === "array" || schema.type === "object")
    return JSON.parse(String(raw));
  return String(raw);
}

function downloadReference(reference: TemplateReference): void {
  const blob = new Blob([JSON.stringify(reference, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${reference.templateId.replace(/[^a-z0-9._-]/gi, "-")}.template.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function field(
  key: string,
  schema: ParameterSchema,
  value: unknown,
  onChange: (value: unknown) => void,
): HTMLElement {
  const label = document.createElement("label");
  label.className = "studio-field studio-template-field";
  const title = document.createElement("span");
  title.textContent = key;
  if (schema.description) title.title = schema.description;
  label.append(title);

  let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (schema.type === "enum") {
    control = document.createElement("select");
    for (const option of schema.values) {
      const element = document.createElement("option");
      element.value = option;
      element.textContent = option;
      control.append(element);
    }
    control.value = String(value);
  } else if (schema.type === "array" || schema.type === "object") {
    control = document.createElement("textarea");
    control.rows = 3;
    control.value = JSON.stringify(value, null, 2);
  } else {
    control = document.createElement("input");
    control.type = schema.type === "boolean" ? "checkbox" : schema.type;
    if (schema.type === "boolean") control.checked = Boolean(value);
    else control.value = String(value);
    if (schema.type === "number") {
      if (schema.min !== undefined) control.min = String(schema.min);
      if (schema.max !== undefined) control.max = String(schema.max);
      control.step = schema.integer ? "1" : "any";
    }
    if (schema.type === "string") {
      if (schema.minLength !== undefined) control.minLength = schema.minLength;
      if (schema.maxLength !== undefined) control.maxLength = schema.maxLength;
      if (schema.pattern !== undefined) control.pattern = schema.pattern;
    }
  }
  control.dataset.templateParameter = key;
  const update = (): void => {
    try {
      const raw =
        control instanceof HTMLInputElement && control.type === "checkbox"
          ? control.checked
          : control.value;
      onChange(parameterInputValue(schema, raw));
      control.setCustomValidity("");
    } catch {
      control.setCustomValidity("올바른 JSON을 입력하세요.");
    }
  };
  control.addEventListener(
    schema.type === "enum" || schema.type === "boolean" ? "change" : "input",
    update,
  );
  label.append(control);
  return label;
}

/** Built-in authoring panel for trusted templates registered by the host. */
export function createTemplateEditorPlugin(
  templates: readonly AnimationTemplate[],
): EditorPluginDefinition {
  return {
    manifest: {
      id: "dev.clotho.templates",
      name: "Template parameters",
      capabilities: ["editor"],
      editor: { panels: ["parameters"] },
    },
    panels: {
      parameters: {
        id: "parameters",
        label: "Template parameters",
        mount(container, context) {
          if (templates.length === 0) return;
          container.classList.add(
            "studio-tools-section",
            "studio-template-panel",
          );
          const heading = document.createElement("div");
          heading.className = "studio-tools-title";
          heading.textContent = "Template";
          const select = document.createElement("select");
          select.className = "studio-template-select";
          for (const template of templates) {
            const option = document.createElement("option");
            option.value = template.id;
            option.textContent = template.id;
            select.append(option);
          }
          const form = document.createElement("div");
          const status = document.createElement("p");
          status.className = "studio-props-empty studio-template-status";
          const actions = document.createElement("div");
          actions.className = "studio-align-row";
          const standalone = document.createElement("button");
          standalone.className = "studio-btn";
          standalone.textContent = "Standalone JSON";
          const reference = document.createElement("button");
          reference.className = "studio-btn";
          reference.textContent = "Template 참조";
          actions.append(standalone, reference);
          container.append(heading, select, form, status, actions);

          let active = templates[0]!;
          let values: Record<string, unknown> = {};
          let previewDocument = context.getDocument();
          const rebuild = (): void => {
            try {
              previewDocument = active.instantiate(values);
              context.replaceDocument(previewDocument);
              status.textContent = "parameter가 미리보기에 반영되었습니다.";
              status.removeAttribute("data-error");
            } catch (error) {
              const issues = (error as TemplateParameterError).issues;
              status.textContent = issues
                ? issues
                    .map(({ path, message }) => `${path}: ${message}`)
                    .join(" · ")
                : String(error);
              status.dataset.error = "true";
            }
          };
          const render = (): void => {
            values = Object.fromEntries(
              Object.entries(active.parameters).map(([key, schema]) => [
                key,
                initialParameterValue(schema),
              ]),
            );
            form.replaceChildren(
              ...Object.entries(active.parameters).map(([key, schema]) =>
                field(key, schema, values[key], (value) => {
                  values[key] = value;
                  rebuild();
                }),
              ),
            );
            rebuild();
          };
          select.addEventListener("change", () => {
            active =
              templates.find(({ id }) => id === select.value) ?? templates[0]!;
            render();
          });
          standalone.addEventListener("click", () =>
            downloadAnimationJson(previewDocument),
          );
          reference.addEventListener("click", () =>
            downloadReference(active.reference(values)),
          );
          render();
        },
      },
    },
  };
}
