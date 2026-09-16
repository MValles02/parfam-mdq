/**
 * Chequeo rápido de los parsers contra casos reales del dataset.
 * No es parte de una suite de CI todavía (no hay test runner instalado para
 * unit tests, sólo Playwright para e2e) — se corre a mano con:
 *   pnpm exec tsx scripts/lib/fragrantica-parse.test.ts
 */
import assert from "node:assert/strict";
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

// --- parseFragranticaUrl ----------------------------------------------------
assert.deepEqual(
  parseFragranticaUrl(
    "https://www.fragrantica.com/perfume/Jean-Paul-Gaultier/Scandal-A-Paris-54275.html",
  ),
  { pid: 54275, brandName: "Jean Paul Gaultier", name: "Scandal A Paris" },
);
assert.deepEqual(
  parseFragranticaUrl(
    "https://www.fragrantica.com/perfume/Afnan/9am-Dive-78611.html",
  ),
  { pid: 78611, brandName: "Afnan", name: "9am Dive" },
);
assert.equal(
  parseFragranticaUrl("https://www.fragrantica.com/news/x-123.html"),
  null,
);

// --- titleCaseFromSlug -------------------------------------------------------
assert.equal(titleCaseFromSlug("jean-paul-gaultier"), "Jean Paul Gaultier");
assert.equal(
  titleCaseFromSlug("accento-overdose-pride-edition"),
  "Accento Overdose Pride Edition",
);

// --- géneros -----------------------------------------------------------------
assert.equal(normalizeGenderCleaned("women"), "WOMEN");
assert.equal(normalizeGenderCleaned("unisex"), "UNISEX");
assert.equal(normalizeGenderCleaned("bogus"), null);
assert.equal(normalizeGenderPerfumes("for women and men"), "UNISEX");
assert.equal(normalizeGenderPerfumes("N/A"), null);

// --- splitProseList -----------------------------------------------------------
assert.deepEqual(
  splitProseList("Lemon, Mandarin Orange, Cardamom and Pink Pepper"),
  ["Lemon", "Mandarin Orange", "Cardamom", "Pink Pepper"],
);
assert.deepEqual(splitProseList("Vanilla"), ["Vanilla"]);
assert.deepEqual(splitProseList(""), []);

// --- parsePyramidFromDescription ----------------------------------------------
const desc1 =
  "9am Dive byAfnanis a Aromatic Aquatic fragrance for women and men. This is a new fragrance.9am Divewas launched in 2022. Top notes are Lemon, Mint, Black Currant and Pink Pepper; middle notes are Apple, Incense and Cedar; base notes are Ginger, Sandalwood, Patchouli and Jasmine.";
assert.deepEqual(parsePyramidFromDescription(desc1), {
  top: ["Lemon", "Mint", "Black Currant", "Pink Pepper"],
  middle: ["Apple", "Incense", "Cedar"],
  base: ["Ginger", "Sandalwood", "Patchouli", "Jasmine"],
});
assert.equal(parseYearFromDescription(desc1), 2022);
assert.equal(parsePyramidFromDescription("No notes info here at all"), null);

// --- parsePyStringList ---------------------------------------------------------
assert.deepEqual(parsePyStringList("[]"), []);
assert.deepEqual(parsePyStringList("['Clement Gavarry']"), ["Clement Gavarry"]);
assert.deepEqual(
  parsePyStringList("['Ali Asgar Fakhruddin', 'Mathieu Nardin']"),
  ["Ali Asgar Fakhruddin", "Mathieu Nardin"],
);
assert.deepEqual(parsePyStringList(`["O'Connor", 'Jane Doe']`), [
  "O'Connor",
  "Jane Doe",
]);

// --- numeros ---------------------------------------------------------------
assert.equal(parseDecimal("1,42"), 1.42);
assert.equal(parseDecimal("3.73"), 3.73);
assert.equal(parseDecimal(""), null);
assert.equal(parseIntOrNull("2022"), 2022);
assert.equal(parseIntOrNull(""), null);

console.log("fragrantica-parse: todos los checks pasaron ✔");
