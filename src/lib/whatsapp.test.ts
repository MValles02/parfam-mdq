import { describe, expect, it } from "vitest";
import {
  buildWhatsAppLink,
  extractWhatsAppText,
  isOrderNumber,
} from "./whatsapp";

describe("extractWhatsAppText", () => {
  it("round-trips the message built by buildWhatsAppLink", () => {
    const message = "Hola, soy Ana & quiero:\n- 1 x Perfume (50%)";
    expect(
      extractWhatsAppText(buildWhatsAppLink("5492236163910", message)),
    ).toBe(message);
  });

  it("returns null without text or for a malformed link", () => {
    expect(extractWhatsAppText("https://wa.me/5492236163910")).toBeNull();
    expect(extractWhatsAppText("not a url")).toBeNull();
  });
});

describe("isOrderNumber", () => {
  it("accepts only PM-<digits>", () => {
    expect(isOrderNumber("PM-0042")).toBe(true);
    expect(isOrderNumber("PM-")).toBe(false);
    expect(isOrderNumber("PM-12<script>")).toBe(false);
    expect(isOrderNumber("pm-1")).toBe(false);
  });
});
