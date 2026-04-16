/** Summary counts for ingredient lines marked need vs at home (Prepare + shared list editor). */
export function LineStateSummary({
  need,
  atHome,
  total,
}: {
  need: number;
  atHome: number;
  total: number;
}) {
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-6 gap-y-2 rounded-lg border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/35"
      role="status"
      aria-live="polite"
      aria-label={`Summary: ${need} to buy, ${atHome} at home, ${total} lines total`}
    >
      <p>
        <span className="text-muted-foreground">To buy</span>{" "}
        <span className="text-lg font-semibold tabular-nums text-foreground">{need}</span>
      </p>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <p>
        <span className="text-muted-foreground">At home</span>{" "}
        <span className="text-lg font-semibold tabular-nums text-foreground">{atHome}</span>
      </p>
      <span className="text-xs text-muted-foreground sm:ml-auto">
        {total} line{total === 1 ? "" : "s"} total
      </span>
    </div>
  );
}
