import { describe, expect, it, vi } from "vitest";
import { setServerFieldErrors } from "./server-field-errors";

describe("setServerFieldErrors", () => {
  it("sets the first message of each field", () => {
    const setError = vi.fn();

    setServerFieldErrors(setError, {
      name: ["Obligatorio.", "Muy largo."],
      "variants.0.priceArs": ["Precio inválido."],
    });

    expect(setError.mock.calls).toEqual([
      ["name", { message: "Obligatorio." }],
      ["variants.0.priceArs", { message: "Precio inválido." }],
    ]);
  });

  it("does nothing without field errors", () => {
    const setError = vi.fn();

    setServerFieldErrors(setError, undefined);

    expect(setError).not.toHaveBeenCalled();
  });
});
