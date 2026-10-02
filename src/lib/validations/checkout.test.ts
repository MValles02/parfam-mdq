import { describe, expect, it } from "vitest";
import { checkoutCustomerSchema, checkoutRequestSchema } from "./checkout";

describe("checkout request", () => {
  it("accepts English field names and normalizes an Argentine phone number", () => {
    const result = checkoutRequestSchema.safeParse({
      customerName: "Mateo García",
      customerPhone: "+54 9 223 616-3910",
      items: [{ variantId: "variant-1", qty: 1 }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerPhone).toBe("+5492236163910");
    }
  });

  it("returns field errors under the English request keys", () => {
    const result = checkoutRequestSchema.safeParse({
      customerName: "",
      customerPhone: "123",
      items: [{ variantId: "variant-1", qty: 1 }],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.customerName?.[0]).toBe("Poné tu nombre completo.");
      expect(errors.customerPhone?.[0]).toBe(
        "Ese teléfono no parece completo.",
      );
    }
  });
});

describe("checkout customer form schema", () => {
  const parse = (customerPhone: string) =>
    checkoutCustomerSchema.safeParse({
      customerName: "Mateo García",
      customerPhone,
    });

  it("accepts a local Argentine mobile number", () => {
    expect(parse("223 616-3910").success).toBe(true);
  });

  it("rejects a long-enough number that is not a valid Argentine mobile", () => {
    expect(parse("1234567").success).toBe(false);
  });
});
