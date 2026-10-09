/**
 * Streams a perfumes.jsonl dataset file one line at a time and yields each
 * line parsed into a `ParsedReference`. The full dataset holds 140k+ records,
 * too many to keep in memory as parsed JSON, so both
 * scripts/import-references.ts and scripts/check-reference-translations.ts
 * read it through this stream instead of loading it whole.
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { parseReferenceRecord, type ParsedReference } from "./reference-parse";

/** Repository-relative location of the gitignored, local-only dataset. */
export const DEFAULT_DATASET_PATH = "new-database/perfumes.jsonl";

interface ReferenceRecordReaderOptions {
  /** Stop after this many records; blank lines do not count toward it. */
  limit?: number;
}

export class ReferenceRecordReader implements AsyncIterable<ParsedReference> {
  private lineCount = 0;

  constructor(
    private readonly filePath: string,
    private readonly options: ReferenceRecordReaderOptions = {},
  ) {}

  /** Lines consumed by the most recent iteration, blank lines included. */
  get linesRead(): number {
    return this.lineCount;
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<ParsedReference> {
    const { limit } = this.options;
    const rl = createInterface({
      input: createReadStream(this.filePath, "utf-8"),
      crlfDelay: Infinity,
    });
    this.lineCount = 0;
    let recordCount = 0;
    for await (const line of rl) {
      this.lineCount += 1;
      if (line.trim() === "") continue;
      if (limit !== undefined && recordCount >= limit) {
        rl.close();
        break;
      }
      yield parseReferenceRecord(this.parseJsonLine(line));
      recordCount += 1;
    }
  }

  private parseJsonLine(line: string): unknown {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(
        `${this.filePath}:${this.lineCount}: line is not valid JSON (${(error as Error).message}).`,
      );
    }
  }
}
