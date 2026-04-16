/**
 * Best-effort extraction of summary + numbered steps from pasted recipe markdown.
 * Supports common patterns: "1. …" lines, sections like ## Tillagning / ## Instructions.
 */

function stripMarkdownFormatting(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").trim();
}

/**
 * @returns summary (optional intro line) and ordered steps (non-empty strings).
 */
export function parseMarkdownRecipeMarkdown(md: string): { summary: string; steps: string[] } {
  const raw = md.replace(/\r\n/g, "\n").trim();
  if (!raw) {
    return { summary: "", steps: [] };
  }

  const numbered: string[] = [];
  for (const line of raw.split("\n")) {
    const t = line.trim();
    const m = t.match(/^\d{1,2}[.)]\s+(.+)$/);
    if (m) {
      const cleaned = stripMarkdownFormatting(m[1]).trim();
      if (cleaned) {
        numbered.push(cleaned);
      }
    }
  }
  if (numbered.length >= 2) {
    return { summary: "", steps: numbered };
  }

  const sectionMatch = raw.match(
    /##\s*(Tillagning|Gör\s+så|Instruktioner?|Instructions?|Method|Steps)[^\n]*\n([\s\S]*?)(?=\n##\s|\s*$)/i,
  );
  if (sectionMatch) {
    const body = sectionMatch[2];
    const fromSection: string[] = [];
    for (const line of body.split("\n")) {
      const t = line.trim();
      if (!t) {
        continue;
      }
      const num = t.match(/^\d{1,2}[.)]\s+(.+)$/);
      if (num) {
        const cleaned = stripMarkdownFormatting(num[1]).trim();
        if (cleaned) {
          fromSection.push(cleaned);
        }
        continue;
      }
      const bullet = t.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        const cleaned = stripMarkdownFormatting(bullet[1]).trim();
        if (cleaned) {
          fromSection.push(cleaned);
        }
      }
    }
    if (fromSection.length >= 2) {
      return { summary: "", steps: fromSection };
    }
  }

  const paras = raw
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length >= 2) {
    const first = stripMarkdownFormatting(paras[0]).trim();
    const rest = paras
      .slice(1)
      .map((p) => stripMarkdownFormatting(p).trim())
      .filter(Boolean);
    if (rest.length > 0) {
      return { summary: first.slice(0, 2000), steps: rest };
    }
  }

  const singleLines = raw
    .split("\n")
    .map((l) => stripMarkdownFormatting(l.trim()))
    .filter(Boolean);
  if (singleLines.length >= 3) {
    return { summary: "", steps: singleLines };
  }

  return { summary: "", steps: [] };
}
