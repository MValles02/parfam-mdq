import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getReferenceForAdoption } from "@/lib/admin/references";

const FIXTURES = "tests/integration/fixtures/references";

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

const adopt = async (pid: number) => {
  const { id } = await prisma.fragranceRef.findUniqueOrThrow({
    where: { pid },
    select: { id: true },
  });
  return getReferenceForAdoption(id);
};

describe("reference adoption read model", () => {
  beforeAll(async () => {
    await cleanup();
    const run = spawnSync(
      process.execPath,
      [
        "node_modules/tsx/dist/cli.mjs",
        "scripts/import-references.ts",
        "--file",
        `${FIXTURES}/valid.jsonl`,
        "--translations-dir",
        `${FIXTURES}/translations`,
      ],
      { encoding: "utf8" },
    );
    expect(run.status, run.stderr).toBe(0);
  });
  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("turns imported vote counts into percentages that sum to 100", async () => {
    const ref = await adopt(990000001);
    // Season votes 1/1/1/0 and day/night 3/1.
    const seasons = [
      ref!.seasonSpring,
      ref!.seasonSummer,
      ref!.seasonFall,
      ref!.seasonWinter,
    ];
    expect(seasons.reduce((sum, v) => sum! + v!, 0)).toBe(100);
    expect(ref!.seasonFall).toBe(0);
    expect([ref!.daypartDay, ref!.daypartNight]).toEqual([75, 25]);
    expect(ref!.longevity).toBe(4.5);
    expect(ref!.notes.map((n) => n.position)).toEqual([
      "TOP",
      "TOP",
      "MIDDLE",
      "BASE",
    ]);
    expect(ref!.notes[0].name).toBe("rosa de prueba");
    expect(ref!.perfumers.map((p) => p.name)).toEqual(["Sophie Labbé"]);
  });

  it("returns null groups when the votes are unset", async () => {
    const ref = await adopt(990000002);
    expect(ref!.seasonSpring).toBeNull();
    expect(ref!.seasonWinter).toBeNull();
    expect(ref!.daypartDay).toBeNull();
    expect(ref!.daypartNight).toBeNull();
    expect(ref!.longevity).toBeNull();
  });
});
