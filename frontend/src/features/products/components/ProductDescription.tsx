/**
 * ProductDescription
 * ─────────────────────────────────────────────────────────────
 * Renders the structured `description` JSONField from the backend
 * Product model. The field validator allows these top-level keys:
 *
 *   summary   — string or { text: string, priority?: number }
 *   details   — Record<string, string> or list, optional priority
 *   lists     — string[] or { title?, items: string[], priority? }[]
 *   labels    — string[] or Record<string, string>, optional priority
 *   tables    — { title?, headers: string[], rows: string[][], priority? }
 *               or an array of the above
 *   sections  — any custom key with the same shape
 *
 * Unknown keys are rendered as a JSON pre-block (dev-friendly fallback).
 * The section is hidden entirely when description is empty ({} or null).
 */

// ── Types ────────────────────────────────────────────────────
type PrioritisedSection = { priority?: number };

type SummarySection  = string | ({ text: string } & PrioritisedSection);
type DetailsSection  = (Record<string, string> | Array<Record<string, string>>) & PrioritisedSection;
type ListGroup       = string[] | ({ title?: string; items: string[]; priority?: number }[]);
type LabelSection    = string[] | Record<string, string>;
type TableItem       = { title?: string; headers?: string[]; rows?: string[][] };
type TableSection    = TableItem | TableItem[];

type DescriptionBlock = {
  summary?:  SummarySection;
  details?:  DetailsSection;
  lists?:    ListGroup;
  labels?:   LabelSection;
  tables?:   TableSection;
  [key: string]: unknown;
};

// ── Priority sort helper ─────────────────────────────────────
function sortByPriority(entries: [string, unknown][]): [string, unknown][] {
  return [...entries].sort(([, a], [, b]) => {
    const pa = (typeof a === 'object' && a !== null && 'priority' in a) ? Number((a as PrioritisedSection).priority ?? 99) : 99;
    const pb = (typeof b === 'object' && b !== null && 'priority' in b) ? Number((b as PrioritisedSection).priority ?? 99) : 99;
    return pa - pb;
  });
}

// ── Sub-renderers ────────────────────────────────────────────
function SummaryBlock({ value }: { value: SummarySection }) {
  const text = typeof value === 'string' ? value : value?.text;
  if (!text) return null;
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
      {text}
    </p>
  );
}

function DetailsBlock({ value }: { value: DetailsSection }) {
  const entries = Array.isArray(value)
    ? value.flatMap((item) => Object.entries(item).filter(([k]) => k !== 'priority'))
    : Object.entries(value as Record<string, string>).filter(([k]) => k !== 'priority');

  if (!entries.length) return null;
  return (
    <dl className="grid gap-1.5 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-sm">
          <dt className="shrink-0 font-medium capitalize" style={{ color: 'var(--color-text)' }}>
            {k.replace(/_/g, ' ')}:
          </dt>
          <dd style={{ color: 'var(--color-text-secondary)' }}>{String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ListsBlock({ value }: { value: ListGroup }) {
  // Plain string[]
  if (Array.isArray(value) && (value.length === 0 || typeof value[0] === 'string')) {
    const items = value as string[];
    return (
      <ul className="space-y-1 pl-5 text-sm" style={{ color: 'var(--color-text-secondary)', listStyleType: 'disc' }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  }
  // Array of grouped lists
  const groups = value as { title?: string; items: string[]; priority?: number }[];
  return (
    <div className="space-y-3">
      {groups.map((g, i) => (
        <div key={i}>
          {g.title && (
            <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              {g.title}
            </p>
          )}
          <ul className="space-y-1 pl-5 text-sm" style={{ color: 'var(--color-text-secondary)', listStyleType: 'disc' }}>
            {(g.items ?? []).map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LabelsBlock({ value }: { value: LabelSection }) {
  const tags: string[] = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, string>);

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="rounded-full px-3 py-0.5 text-xs font-medium"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function SingleTable({ table }: { table: TableItem }) {
  const { title, headers = [], rows = [] } = table;
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
      {title && (
        <p className="border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          {title}
        </p>
      )}
      <table className="w-full text-sm">
        {headers.length > 0 && (
          <thead style={{ background: 'var(--color-surface-raised)' }}>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2 text-left text-xs font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablesBlock({ value }: { value: TableSection }) {
  const tables = Array.isArray(value) ? value : [value];
  return (
    <div className="space-y-3">
      {tables.map((t, i) => <SingleTable key={i} table={t} />)}
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────
function SectionHeading({ title }: { title: string }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-text-muted)' }}>
      {title.replace(/_/g, ' ')}
    </h4>
  );
}

// ── Main component ───────────────────────────────────────────
interface ProductDescriptionProps {
  description: DescriptionBlock | string | null | undefined;
}

export function ProductDescription({ description }: ProductDescriptionProps) {
  // Hide entirely when empty
  if (!description || (typeof description === 'object' && Object.keys(description).length === 0)) {
    return null;
  }

  // If description is a plain string (legacy / simple products)
  if (typeof description === 'string') {
    return (
      <section className="mt-8" aria-labelledby="description-heading">
        <h3 id="description-heading" className="mb-3 text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Description
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </section>
    );
  }

  const desc = description as DescriptionBlock;
  // Sort all top-level keys by their `priority` field
  const sortedEntries = sortByPriority(Object.entries(desc));

  return (
    <section className="mt-8" aria-labelledby="description-heading">
      <h3
        id="description-heading"
        className="mb-5 text-lg font-bold"
        style={{ color: 'var(--color-text)' }}
      >
        Description
      </h3>

      <div className="space-y-6">
        {sortedEntries.map(([key, value]) => {
          if (value === null || value === undefined) return null;

          switch (key) {
            case 'summary':
              return (
                <div key={key}>
                  <SummaryBlock value={value as SummarySection} />
                </div>
              );

            case 'details':
              return (
                <div key={key}>
                  <SectionHeading title="Details" />
                  <DetailsBlock value={value as DetailsSection} />
                </div>
              );

            case 'lists':
              return (
                <div key={key}>
                  <SectionHeading title="Features" />
                  <ListsBlock value={value as ListGroup} />
                </div>
              );

            case 'labels':
              return (
                <div key={key}>
                  <SectionHeading title="Tags" />
                  <LabelsBlock value={value as LabelSection} />
                </div>
              );

            case 'tables':
              return (
                <div key={key}>
                  <SectionHeading title="Specifications" />
                  <TablesBlock value={value as TableSection} />
                </div>
              );

            default: {
              // Custom section — render with key as heading
              const val = value as unknown;
              if (typeof val === 'string') {
                return (
                  <div key={key}>
                    <SectionHeading title={key} />
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{val}</p>
                  </div>
                );
              }
              if (Array.isArray(val) && val.every((i) => typeof i === 'string')) {
                return (
                  <div key={key}>
                    <SectionHeading title={key} />
                    <ListsBlock value={val as string[]} />
                  </div>
                );
              }
              // Fallback: pretty JSON
              return (
                <div key={key}>
                  <SectionHeading title={key} />
                  <pre
                    className="overflow-x-auto rounded-lg p-3 text-xs"
                    style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)' }}
                  >
                    {JSON.stringify(val, null, 2)}
                  </pre>
                </div>
              );
            }
          }
        })}
      </div>
    </section>
  );
}
