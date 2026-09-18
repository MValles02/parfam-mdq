/**
 * Chequeo de los parsers contra casos reales del dataset.
 *   pnpm test -- scripts/lib/fragrantica-parse.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  parseFragranticaUrl,
  titleCaseFromSlug,
  normalizeGenderCleaned,
  normalizeGenderPerfumes,
  splitProseList,
  parsePyramidFromDescription,
  parseYearFromDescription,
  parsePyStringList,
  parseDecimal,
  parseIntOrNull,
} from "./fragrantica-parse";

describe("parseFragranticaUrl", () => {
  it("separa marca y nombre de una URL de perfume", () => {
    expect(
      parseFragranticaUrl(
        "https://www.fragrantica.com/perfume/Jean-Paul-Gaultier/Scandal-A-Paris-54275.html",
      ),
    ).toEqual({
      pid: 54275,
      brandName: "Jean Paul Gaultier",
      name: "Scandal A Paris",
    });
    expect(
      parseFragranticaUrl(
        "https://www.fragrantica.com/perfume/Afnan/9am-Dive-78611.html",
      ),
    ).toEqual({ pid: 78611, brandName: "Afnan", name: "9am Dive" });
  });

  it("devuelve null para una URL que no es de perfume", () => {
    expect(
      parseFragranticaUrl("https://www.fragrantica.com/news/x-123.html"),
    ).toBeNull();
  });
});

describe("titleCaseFromSlug", () => {
  it("convierte un slug a Title Case", () => {
    expect(titleCaseFromSlug("jean-paul-gaultier")).toBe("Jean Paul Gaultier");
    expect(titleCaseFromSlug("accento-overdose-pride-edition")).toBe(
      "Accento Overdose Pride Edition",
    );
  });
});

describe("géneros", () => {
  it("normaliza el género limpio", () => {
    expect(normalizeGenderCleaned("women")).toBe("WOMEN");
    expect(normalizeGenderCleaned("unisex")).toBe("UNISEX");
    expect(normalizeGenderCleaned("bogus")).toBeNull();
  });

  it("normaliza el género en prosa de Perfumes.csv", () => {
    expect(normalizeGenderPerfumes("for women and men")).toBe("UNISEX");
    expect(normalizeGenderPerfumes("N/A")).toBeNull();
  });
});

describe("splitProseList", () => {
  it("separa una lista en prosa con comas y 'and'", () => {
    expect(
      splitProseList("Lemon, Mandarin Orange, Cardamom and Pink Pepper"),
    ).toEqual(["Lemon", "Mandarin Orange", "Cardamom", "Pink Pepper"]);
    expect(splitProseList("Vanilla")).toEqual(["Vanilla"]);
    expect(splitProseList("")).toEqual([]);
  });
});

describe("parsePyramidFromDescription", () => {
  const desc1 =
    "9am Dive byAfnanis a Aromatic Aquatic fragrance for women and men. This is a new fragrance.9am Divewas launched in 2022. Top notes are Lemon, Mint, Black Currant and Pink Pepper; middle notes are Apple, Incense and Cedar; base notes are Ginger, Sandalwood, Patchouli and Jasmine.";

  it("extrae la pirámide olfativa de una descripción real", () => {
    expect(parsePyramidFromDescription(desc1)).toEqual({
      top: ["Lemon", "Mint", "Black Currant", "Pink Pepper"],
      middle: ["Apple", "Incense", "Cedar"],
      base: ["Ginger", "Sandalwood", "Patchouli", "Jasmine"],
    });
  });

  it("extrae el año de la misma descripción", () => {
    expect(parseYearFromDescription(desc1)).toBe(2022);
  });

  it("devuelve null si la descripción no tiene pirámide", () => {
    expect(parsePyramidFromDescription("No notes info here at all")).toBeNull();
  });
});

describe("parsePyStringList", () => {
  it("parsea listas con la sintaxis de repr() de Python", () => {
    expect(parsePyStringList("[]")).toEqual([]);
    expect(parsePyStringList("['Clement Gavarry']")).toEqual([
      "Clement Gavarry",
    ]);
    expect(
      parsePyStringList("['Ali Asgar Fakhruddin', 'Mathieu Nardin']"),
    ).toEqual(["Ali Asgar Fakhruddin", "Mathieu Nardin"]);
    expect(parsePyStringList(`["O'Connor", 'Jane Doe']`)).toEqual([
      "O'Connor",
      "Jane Doe",
    ]);
  });
});

describe("números", () => {
  it("parsea decimales con coma o punto", () => {
    expect(parseDecimal("1,42")).toBe(1.42);
    expect(parseDecimal("3.73")).toBe(3.73);
    expect(parseDecimal("")).toBeNull();
  });

  it("parsea enteros opcionales", () => {
    expect(parseIntOrNull("2022")).toBe(2022);
    expect(parseIntOrNull("")).toBeNull();
  });
});
