/**
 * Renders a JSON-LD <script> tag for structured data. Next.js 16
 * recommendation: emit as a Server Component script tag inside the page
 * tree — content is included in initial HTML, no client JS required.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
