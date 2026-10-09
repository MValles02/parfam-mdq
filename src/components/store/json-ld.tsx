import { serializeJsonLd } from "@/lib/seo";

/** Structured data for search engines, serialized safely for an inline script. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
