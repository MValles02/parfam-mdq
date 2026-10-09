import type { NotePosition } from "@/generated/prisma/enums";
import { PYRAMID_LEVEL_LABELS } from "@/lib/catalog";
import { CollapsibleSection } from "./collapsible-section";
import { GROUP_LABEL_CLASS, SECTION_TITLE_CLASS } from "./section-styles";

/**
 * A null level means the product's notes have no top/middle/base tiers; they
 * render as a single flat list instead of being dropped.
 */
type PyramidLevel = {
  level: NotePosition | null;
  notes: { slug: string; name: string }[];
};

/**
 * Customer-facing descriptions of when each fragrance level is perceived.
 */
const WHEN_PERCEIVED_LABELS: Record<NotePosition, string> = {
  TOP: "primeros minutos",
  MIDDLE: "1 a 3 horas",
  BASE: "el resto del día",
};

/**
 * Notes intentionally have no color dots because the dictionary defines
 * colors for accords only. Empty pyramids are not rendered.
 */
export function Pyramid({ levels }: { levels: PyramidLevel[] }) {
  if (levels.length === 0) return null;

  return (
    <CollapsibleSection
      className="border-t pt-11"
      defaultOpenOnMobile
      title={<h2 className={SECTION_TITLE_CLASS}>Pirámide olfativa</h2>}
    >
      <p className="mt-1.5 text-sm text-muted-foreground">
        Cómo evoluciona la fragancia en la piel, de las primeras notas al fondo.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {levels.map((level) => (
          <div
            key={level.level ?? "flat"}
            className="rounded border bg-card p-6"
          >
            <div className="flex items-center gap-3">
              <span className={GROUP_LABEL_CLASS}>
                {level.level ? PYRAMID_LEVEL_LABELS[level.level] : "Notas"}
              </span>
              <span className="h-px flex-1 bg-border" />
              {level.level ? (
                <span className="text-[11px] text-muted-foreground">
                  {WHEN_PERCEIVED_LABELS[level.level]}
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {level.notes.map((note) => (
                <span
                  key={note.slug}
                  className="rounded border bg-background px-3 py-2 text-[13px]"
                >
                  {note.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
