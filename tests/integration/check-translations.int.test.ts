import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

const FIXTURES = "tests/integration/fixtures/references";
const tmp = mkdtempSync(path.join(tmpdir(), "parfam-translations-"));

function run(script: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", script, ...args],
    { encoding: "utf8" },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function cleanup() {
  await prisma.fragranceRef.deleteMany({ where: { pid: { gte: 990000000 } } });
  await prisma.note.deleteMany({
    where: { slug: { startsWith: "fixture-import-" } },
  });
  await prisma.accord.deleteMany({
    where: { slug: { startsWith: "fixture-import-" } },
  });
  await prisma.perfumer.deleteMany({
    where: { slug: { startsWith: "fixture-sophie-" } },
  });
  await prisma.brand.deleteMany({ where: { slug: "fixture-import-brand" } });
}

const check = (args: string[]) =>
  run("scripts/check-reference-translations.ts", args);

describe("reference translation coverage", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    rmSync(tmp, { recursive: true, force: true });
    await prisma.$disconnect();
  });

  it("accepts a dataset whose slugs are in the committed translations", () => {
    // Real slugs: proves prisma/reference/*.es.json load and validate.
    const file = path.join(tmp, "real.jsonl");
    writeFileSync(
      file,
      JSON.stringify({
        id: 990000020,
        slug: "Fixture-Import-Brand/Real",
        name: "Real",
        brand: "Fixture Import Brand",
        accords: [{ name: "woody", strength: 100 }],
        notes: { flat: [{ name: "Rose", slug: "Rose", weight: 10 }] },
      }) + "\n",
    );
    const result = check(["--file", file]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(
      "Every note and accord used by the dataset is translated.",
    );
  });

  it("fails on an unknown slug and emits a skeleton for it", () => {
    const out = path.join(tmp, "missing.json");
    const result = check([
      "--file",
      `${FIXTURES}/unknown-slug.jsonl`,
      "--emit-missing",
      out,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("no Spanish translation");
    const skeleton = JSON.parse(readFileSync(out, "utf8"));
    expect(skeleton.notes["fixture-import-unknown-note"]).toEqual({
      en: "Fixture Import Unknown Note",
      es: "",
    });
  });

  it("makes the importer refuse to write while a slug is untranslated", async () => {
    const dir = path.join(tmp, "translations");
    cpSync(`${FIXTURES}/translations`, dir, { recursive: true });
    const notesPath = path.join(dir, "notes.es.json");
    const notes = JSON.parse(readFileSync(notesPath, "utf8"));
    delete notes["fixture-import-cedar"];
    writeFileSync(notesPath, JSON.stringify(notes));

    const result = run("scripts/import-references.ts", [
      "--file",
      `${FIXTURES}/valid.jsonl`,
      "--translations-dir",
      dir,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("fixture-import-cedar");
    expect(
      await prisma.fragranceRef.count({ where: { pid: { gte: 990000000 } } }),
    ).toBe(0);
  });
});
