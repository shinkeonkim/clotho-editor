import { describe, expect, test } from "bun:test";
import type { ParameterSchema } from "@kokoa/clotho";
import {
  initialParameterValue,
  parameterInputValue,
} from "../src/template-editor-plugin";

describe("template parameter form", () => {
  test("각 schema type에 맞는 초기값을 만든다", () => {
    const object: ParameterSchema = {
      type: "object",
      properties: {
        title: { type: "string", default: "Queue" },
        count: { type: "number", min: 2 },
        enabled: { type: "boolean" },
        color: { type: "enum", values: ["blue", "green"] },
        values: { type: "array", items: { type: "number" } },
      },
    };
    expect(initialParameterValue(object)).toEqual({
      title: "Queue",
      count: 2,
      enabled: false,
      color: "blue",
      values: [],
    });
  });

  test("number, boolean, array와 object 입력을 schema type으로 변환한다", () => {
    expect(parameterInputValue({ type: "number" }, "3.5")).toBe(3.5);
    expect(parameterInputValue({ type: "boolean" }, true)).toBe(true);
    expect(
      parameterInputValue(
        { type: "array", items: { type: "string" } },
        '["a"]',
      ),
    ).toEqual(["a"]);
    expect(
      parameterInputValue({ type: "object", properties: {} }, '{"x":1}'),
    ).toEqual({ x: 1 });
  });
});
