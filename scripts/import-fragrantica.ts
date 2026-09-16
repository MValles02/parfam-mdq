/**
 * Importa el catalogo de referencia desde data/fragrantica/*.csv a Postgres.
 *
 *   pnpm db:import-fragrantica                  # dataset completo
 *   pnpm db:import-fragrantica -- --limit 500    # prueba rapida
 *   pnpm db:import-fragrantica -- --data-dir data/fragrantica/samples
 *
 * Idempotente: cada corrida borra (por pid) y vuelve a crear las
 * FragranceRef del lote que procesa, así se puede re-ejecutar sin duplicar.
 * Ver data/fragrantica/README.md para el formato de origen y
 * PLAN.md (Fase 1) para el diseño del modelo de datos.
 */
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
  console.log(`Leyendo CSV desde ${dataDir} ...`);
  const merged = readAndMergeFragrantica({ dataDir });
  console.log(
    `  ${fmt(merged.size)} fragancias fusionadas (fra_perfumes + fra_cleaned)`,
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
      `  --limit ${limit}: se procesan las primeras ${fmt(records.length)}`,
    );
  }

  // -------------------------------------------------------------------
  // Dimensiones: Brand, Perfumer, Note, Accord
  // -------------------------------------------------------------------
  const brandSlugs = new Map<string, string>(); // slug -> name (primera ocurrencia)
  const perfumerSlugs = new Map<string, string>();
  const noteSlugs = new Map<string, string>(); // slug -> nombre canonico (en, minuscula)

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
    `Dimensiones detectadas: ${fmt(brandSlugs.size)} marcas, ${fmt(perfumerSlugs.size)} perfumistas, ${fmt(noteSlugs.size)} notas`,
  );

  console.log("Escribiendo marcas...");
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

  console.log("Escribiendo perfumistas...");
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
    "Escribiendo acordes (catalogo completo de 93, no depende de --limit)...",
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

  console.log("Escribiendo notas...");
  await prisma.note.createMany({
    data: [...noteSlugs.entries()].map(([nslug, canonical]) => {
      const dictEntry = noteDict.get(canonical);
      return {
        slug: nslug,
        nameEn: dictEntry?.en ?? titleCaseFromSlug(canonical),
        nameEs: dictEntry?.es ?? null,
        usageCount: dictEntry?.usageCount ?? 0,
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
    `  ${fmt(noteSlugs.size)} notas totales, ${fmt(untranslated.length)} sin traducir (quedan en ingles, editables desde /admin/notas)`,
  );

  // -------------------------------------------------------------------
  // FragranceRef + relaciones, en lotes
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
            throw new Error(`marca no resuelta: ${r.brandName} (pid ${r.pid})`);
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

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\nListo:");
  console.log(`  fragancias importadas: ${fmt(processed)}`);
  console.log(
    `  con piramide de notas: ${fmt(withPyramid)} (${((withPyramid / processed) * 100).toFixed(1)}%)`,
  );
  if (skippedNotes || skippedAccords || skippedPerfumers) {
    console.log(
      `  relaciones omitidas (dimension no resuelta): ${skippedNotes} notas, ${skippedAccords} acordes, ${skippedPerfumers} perfumistas`,
    );
  }
  console.log(`  tiempo: ${elapsed}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
