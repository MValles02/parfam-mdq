/**
 * Groups an async stream into arrays of `size` items, in order. The last
 * batch holds whatever is left and may be shorter; an empty stream yields
 * nothing. The consumer's handling of one batch finishes before the next
 * item is read, so a stream backed by a file is never read ahead.
 */
export async function* inBatches<T>(
  items: AsyncIterable<T>,
  size: number,
): AsyncGenerator<T[]> {
  let batch: T[] = [];
  for await (const item of items) {
    batch.push(item);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) yield batch;
}
