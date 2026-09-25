/**
 * Imports the reference catalog from data/fragrantica/*.csv into Postgres.
 *
 *   pnpm db:import-fragrantica                  # full dataset
 *   pnpm db:import-fragrantica -- --limit 500    # quick check
 *   pnpm db:import-fragrantica -- --data-dir data/fragrantica/samples
 *
 * Idempotent: each run deletes and recreates the batch FragranceRef rows by
 * PID, allowing safe reruns without duplicates. See data/fragrantica/README.md
 * for source format and parsing caveats, and prisma/schema.prisma for the
 * written model.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import path from "node:path";
import slugify from "slugify";
import { prisma } from "@/lib/db";
import { titleCaseFromSlug } from "./lib/fragrantica-parse";
import { readAndMergeFragrantica } from "./lib/read-fragrantica-csv";
import {
  loadAccordDict,
  loadNoteAliases,
  loadNoteDict,
} from "./lib/dictionaries";

const { values } = parseArgs({
  options: {
    limit: { type: "string" },
    "batch-size": { type: "string", default: "1000" },
    "data-dir": { type: "string", default: "data/fragrantica" },
  },
});

const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined;
const batchSize = Number.parseInt(values["batch-size"]!, 10);
const dataDir = path.resolve(process.cwd(), values["data-dir"]!);

function slug(s: string): string {
  return slugify(s, { lower: true, strict: true, trim: true });
}

function fmt(n: number): string {
  return n.toLocaleString("es-AR");
}

async function main() {
  const startedAt = Date.now();
  console.log(`Reading CSV files from ${dataDir} ...`);
  const merged = readAndMergeFragrantica({ dataDir });
  console.log(
    `  ${fmt(merged.size)} merged fragrances (fra_perfumes + fra_cleaned)`,
  );

  const noteAliases = loadNoteAliases();
  const accordDict = loadAccordDict();
  const noteDict = loadNoteDict();

  const canonicalNote = (raw: string): string => {
    const lower = raw.toLowerCase().trim();
    return noteAliases.get(lower) ?? lower;
  };

  let records = [...merged.values()].sort((a, b) => a.pid - b.pid);
  if (limit) {
    records = records.slice(0, limit);
    console.log(
      `  --limit ${limit}: processing the first ${fmt(records.length)}`,
    );
  }

  // -------------------------------------------------------------------
  // Dimensions: Brand, Perfumer, Note, Accord
  // -------------------------------------------------------------------
  const brandSlugs = new Map<string, string>(); // slug -> name (first occurrence)
  const perfumerSlugs = new Map<string, string>();
  const noteSlugs = new Map<string, string>(); // slug -> canonical lowercase English name

  for (const r of records) {
    const bSlug = slug(r.brandName);
    if (bSlug && !brandSlugs.has(bSlug)) brandSlugs.set(bSlug, r.brandName);

    for (const p of r.perfumerNames) {
      const pSlug = slug(p);
      if (pSlug && !perfumerSlugs.has(pSlug)) perfumerSlugs.set(pSlug, p);
    }

    const allNotes = r.pyramid
      ? [...r.pyramid.top, ...r.pyramid.middle, ...r.pyramid.base]
      : [];
    for (const n of allNotes) {
      const canonical = canonicalNote(n);
      const nSlug = slug(canonical);
      if (nSlug && !noteSlugs.has(nSlug)) noteSlugs.set(nSlug, canonical);
    }
  }

  console.log(
    `Detected dimensions: ${fmt(brandSlugs.size)} brands, ${fmt(perfumerSlugs.size)} perfumers, ${fmt(noteSlugs.size)} notes`,
  );

  console.log("Writing brands...");
  await prisma.brand.createMany({
    data: [...brandSlugs.entries()].map(([bslug, name]) => ({
      slug: bslug,
      name,
    })),
    skipDuplicates: true,
  });
  const brandRows = await prisma.brand.findMany({
    select: { id: true, slug: true },
  });
  const brandIdBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));

  console.log("Writing perfumers...");
  await prisma.perfumer.createMany({
    data: [...perfumerSlugs.entries()].map(([pslug, name]) => ({
      slug: pslug,
      name,
    })),
    skipDuplicates: true,
  });
  const perfumerRows = await prisma.perfumer.findMany({
    select: { id: true, slug: true },
  });
  const perfumerIdBySlug = new Map(perfumerRows.map((p) => [p.slug, p.id]));

  console.log(
    "Writing accords (the full 93-item catalog does not depend on --limit)...",
  );
  await prisma.accord.createMany({
    data: [...accordDict.values()].map((a) => ({
      slug: a.slug,
      nameEn: a.en,
      nameEs: a.es,
      color: a.color,
    })),
    skipDuplicates: true,
  });
  const accordRows = await prisma.accord.findMany({
    select: { id: true, slug: true },
  });
  const accordIdBySlug = new Map(accordRows.map((a) => [a.slug, a.id]));

  console.log("Writing notes...");
  await prisma.note.createMany({
    data: [...noteSlugs.entries()].map(([nslug, canonical]) => {
      const dictEntry = noteDict.get(canonical);
      return {
        slug: nslug,
        nameEn: dictEntry?.en ?? titleCaseFromSlug(canonical),
        nameEs: dictEntry?.es ?? null,
        // Placeholder: calculate the actual value after all FragranceRefNote
        // rows have been written.
        usageCount: 0,
      };
    }),
    skipDuplicates: true,
  });
  const noteRows = await prisma.note.findMany({
    select: { id: true, slug: true },
  });
  const noteIdBySlug = new Map(noteRows.map((n) => [n.slug, n.id]));

  const untranslated = [...noteSlugs.entries()].filter(
    ([, canonical]) => !noteDict.has(canonical),
  );
  console.log(
    `  ${fmt(noteSlugs.size)} total notes, ${fmt(untranslated.length)} untranslated (kept in English and editable from /admin/notas)`,
  );

  // -------------------------------------------------------------------
  // FragranceRef records and relations in batches
  // -------------------------------------------------------------------
  let processed = 0;
  let withPyramid = 0;
  let skippedNotes = 0;
  let skippedAccords = 0;
  let skippedPerfumers = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const pids = batch.map((r) => r.pid);

    await prisma.$transaction(async (tx) => {
      await tx.fragranceRef.deleteMany({ where: { pid: { in: pids } } });

      const created = await tx.fragranceRef.createManyAndReturn({
        data: batch.map((r) => {
          const brandId = brandIdBySlug.get(slug(r.brandName));
          if (!brandId)
            throw new Error(`Unresolved brand: ${r.brandName} (PID ${r.pid})`);
          return {
            pid: r.pid,
            url: r.url,
            brandId,
            name: r.name,
            year: r.year,
            gender: r.gender,
            ratingValue: r.ratingValue,
            ratingCount: r.ratingCount,
            descriptionEn: r.descriptionEn,
            hasPyramid: Boolean(r.pyramid),
            originCountry: r.originCountry,
            // The denormalized admin search field resolves "sauvage dior"
            // through one GIN index. See the matching Prisma migration.
            searchText: `${r.name} ${r.brandName}`,
          };
        }),
        select: { id: true, pid: true },
      });
      const refIdByPid = new Map(created.map((c) => [c.pid, c.id]));

      const noteRowsBatch: {
        fragranceRefId: string;
        noteId: string;
        position: "TOP" | "MIDDLE" | "BASE";
        sortOrder: number;
      }[] = [];
      const accordRowsBatch: {
        fragranceRefId: string;
        accordId: string;
        rank: number;
      }[] = [];
      const perfumerRowsBatch: {
        fragranceRefId: string;
        perfumerId: string;
      }[] = [];

      for (const r of batch) {
        const fragranceRefId = refIdByPid.get(r.pid);
        if (!fragranceRefId) continue;
        if (r.pyramid) withPyramid++;

        if (r.pyramid) {
          (["top", "middle", "base"] as const).forEach((level) => {
            const names = r.pyramid![level];
            names.forEach((raw, idx) => {
              const canonical = canonicalNote(raw);
              const noteId = noteIdBySlug.get(slug(canonical));
              if (!noteId) {
                skippedNotes++;
                return;
              }
              noteRowsBatch.push({
                fragranceRefId,
                noteId,
                position: level.toUpperCase() as "TOP" | "MIDDLE" | "BASE",
                sortOrder: idx,
              });
            });
          });
        }

        r.accordNames.forEach((name, idx) => {
          const dictEntry = accordDict.get(name);
          const accordId = dictEntry
            ? accordIdBySlug.get(dictEntry.slug)
            : undefined;
          if (!accordId) {
            skippedAccords++;
            return;
          }
          accordRowsBatch.push({ fragranceRefId, accordId, rank: idx + 1 });
        });

        r.perfumerNames.forEach((name) => {
          const perfumerId = perfumerIdBySlug.get(slug(name));
          if (!perfumerId) {
            skippedPerfumers++;
            return;
          }
          perfumerRowsBatch.push({ fragranceRefId, perfumerId });
        });
      }

      if (noteRowsBatch.length)
        await tx.fragranceRefNote.createMany({ data: noteRowsBatch });
      if (accordRowsBatch.length)
        await tx.fragranceRefAccord.createMany({ data: accordRowsBatch });
      if (perfumerRowsBatch.length)
        await tx.fragranceRefPerfumer.createMany({ data: perfumerRowsBatch });
    });

    processed += batch.length;
    const pct = ((processed / records.length) * 100).toFixed(1);
    console.log(`  ${fmt(processed)}/${fmt(records.length)} (${pct}%)`);
  }

  // usageCount is only known now. The dictionary counts only roughly 500
  // translated notes, so it would leave 1,398 untranslated notes at zero even
  // though /admin/notas needs to prioritize them. Recalculate real usage.
  console.log("Recalculating each note's usage...");
  const updatedCount = await prisma.$executeRaw`
    UPDATE "Note" n
       SET "usageCount" = COALESCE(u.total, 0)
      FROM (
        SELECT n2."id", count(fn."id") AS total
          FROM "Note" n2
          LEFT JOIN "FragranceRefNote" fn ON fn."noteId" = n2."id"
         GROUP BY n2."id"
      ) u
     WHERE u."id" = n."id"
       AND n."usageCount" IS DISTINCT FROM COALESCE(u.total, 0)
  `;
  console.log(`  ${fmt(updatedCount)} notes with updated counts`);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\nDone:");
  console.log(`  imported fragrances: ${fmt(processed)}`);
  console.log(
    `  with a note pyramid: ${fmt(withPyramid)} (${((withPyramid / processed) * 100).toFixed(1)}%)`,
  );
  if (skippedNotes || skippedAccords || skippedPerfumers) {
    console.log(
      `  skipped relations (unresolved dimension): ${skippedNotes} notes, ${skippedAccords} accords, ${skippedPerfumers} perfumers`,
    );
  }
  console.log(`  elapsed: ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
