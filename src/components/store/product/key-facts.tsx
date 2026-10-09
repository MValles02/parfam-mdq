import { summarizeKeyFacts } from "@/lib/store/key-facts";

type KeyFactsInput = Parameters<typeof summarizeKeyFacts>[0];

/** Four short community-data captions; each cell is hidden when its data is unknown. */
export function KeyFacts(props: KeyFactsInput) {
  const facts = summarizeKeyFacts(props);
  const cells = [
    { label: "Duración", value: facts.duration },
    { label: "Estela", value: facts.sillage },
    { label: "Ideal en", value: facts.idealIn },
    { label: "Momento", value: facts.moment },
  ].filter((cell) => cell.value !== null);

  if (cells.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 border-y py-3.5 lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label}>
          <dt className="text-xs text-muted-foreground">{cell.label}</dt>
          <dd className="text-sm font-semibold">{cell.value}</dd>
        </div>
      ))}
    </dl>
  );
}
