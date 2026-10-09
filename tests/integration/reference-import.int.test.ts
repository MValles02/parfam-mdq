import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

const FIXTURES = "tests/integration/fixtures/references";
const MIN_PID = 990000000;

function runImporter(file: string) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/import-references.ts",
      "--file",
      `${FIXTURES}/${file}`,
      "--translations-dir",
      `${FIXTURES}/translations`,
    ],
    { encoding: "utf8" },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function cleanup() {
  await prisma.fragranceRef.deleteMany({ where: { pid: { gte: MIN_PID } } });
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

const byPid = (pid: number) =>
  prisma.fragranceRef.findUniqueOrThrow({
    where: { pid },
    include: {
      brand: true,
      notes: {
        include: { note: true },
        orderBy: [{ position: "asc" }, { weight: "desc" }],
      },
      accords: { include: { accord: true } },
      perfumers: { include: { perfumer: true } },
    },
  });

describe("reference importer", () => {
  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("imports tiered and flat records into the database", async () => {
    const run = runImporter("valid.jsonl");
    expect(run.status, run.stderr).toBe(0);
    // Out-of-range year (1200) is reported as a warning count, not a failure.
    expect(run.stdout).toContain("1 registros con año fuera de rango");

    const tiered = await byPid(990000001);
    expect(tiered.year).toBe(2020);
    expect(tiered.gender).toBe("WOMEN");
    expect(Number(tiered.longevity)).toBe(4.5);
    expect(Number(tiered.sillage)).toBe(3);
    expect(tiered.seasonSpringVotes).toBe(1);
    expect(tiered.seasonFallVotes).toBe(0);
    expect(tiered.daypartDayVotes).toBe(3);
    expect(tiered.communityVotes).toBe(10);
    expect(tiered.popularity).toBe(500);

    // Duplicate rose in the same tier is dropped; musk may repeat across tiers.
    expect(
      tiered.notes.map((n) => [n.note.slug, n.position, n.weight]),
    ).toEqual([
      ["fixture-import-rose", "TOP", 100],
      ["fixture-import-musk", "TOP", 60],
      ["fixture-import-cedar", "MIDDLE", 50],
      ["fixture-import-musk", "BASE", 40],
    ]);
    expect(tiered.notes[0].note.nameEs).toBe("rosa de prueba");
    expect(tiered.accords).toHaveLength(1);
    expect(tiered.accords[0].strength).toBe(100);
    expect(tiered.accords[0].accord.color).toBe("#AA3366");

    // The percent-escaped dataset slug is decoded; the duplicate credit is dropped.
    expect(tiered.perfumers.map((p) => p.perfumer.slug)).toEqual([
      "fixture-sophie-labbe",
    ]);

    const flat = await byPid(990000002);
    expect(flat.notes.map((n) => [n.position, n.weight])).toEqual([
      [null, 0],
      [null, 0],
    ]);
    expect(flat.year).toBeNull();
    expect(flat.gender).toBe("UNISEX");
    // 0 averages and all-zero tallies mean "nobody voted".
    expect(flat.longevity).toBeNull();
    expect(flat.sillage).toBeNull();
    expect(flat.seasonWinterVotes).toBeNull();
    expect(flat.daypartNightVotes).toBeNull();
    expect(flat.communityVotes).toBe(0);

    const bare = await byPid(990000003);
    expect(bare.longevity).toBeNull();
    expect(bare.seasonSummerVotes).toBeNull();
    expect(bare.popularity).toBeNull();
    expect(bare.gender).toBe("MEN");
  });

  it("uses the majority brand casing and the majority note family", async () => {
    const ref = await byPid(990000002);
    expect(ref.brand.name).toBe("Fixture Import Brand");
    const rose = await prisma.note.findUniqueOrThrow({
      where: { slug: "fixture-import-rose" },
    });
    expect(rose.family).toBe("FamX");
    expect(rose.usageCount).toBe(3);
  });

  it("keeps FragranceRef ids stable and replaces relation rows on rerun", async () => {
    const before = await byPid(990000001);
    // Add a stale relation the rerun must replace.
    const cedar = await prisma.note.findUniqueOrThrow({
      where: { slug: "fixture-import-cedar" },
    });
    await prisma.fragranceRefNote.create({
      data: {
        fragranceRefId: before.id,
        noteId: cedar.id,
        position: "BASE",
        weight: 7,
        sortOrder: 99,
      },
    });

    const run = runImporter("valid.jsonl");
    expect(run.status, run.stderr).toBe(0);

    const after = await byPid(990000001);
    expect(after.id).toBe(before.id);
    expect(after.notes).toHaveLength(4);
    expect(after.notes.some((n) => n.weight === 7)).toBe(false);
  });

  it("rejects a corrupt record with a non-zero exit and writes nothing", async () => {
    const run = runImporter("invalid.jsonl");
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("990000009");
    expect(run.stderr).toContain("longevity");
    expect(await prisma.fragranceRef.count({ where: { pid: 990000009 } })).toBe(
      0,
    );
  });
});
