/**
 * Recipe steps are stored as string[], each string may contain markdown (bold, lists, links).
 * In the editor we show an ordered-list markdown document; this module converts both ways.
 */

function parseNumberedList(md: string): string[] {
  const text = md.replace(/\r\n/g, "\n").trimEnd();
  const lines = text.split("\n");
  const steps: string[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length) {
      const joined = current.join("\n").trim();
      if (joined) {
        steps.push(joined);
      }
      current = [];
    }
  };

  for (const line of lines) {
    const m = line.match(/^\s*(\d{1,3})[.)]\s+(.*)$/);
    if (m) {
      flush();
      current = [m[2]];
    } else if (current.length) {
      current.push(line);
    }
  }
  flush();
  return steps;
}

function parseBulletLines(md: string): string[] {
  const out: string[] = [];
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const t = line.trim();
    const b = t.match(/^[-*+]\s+(.+)$/);
    if (b) {
      out.push(b[1].trim());
    }
  }
  return out;
}

/**
 * Convert editor markdown into step strings for the API.
 * Prefer numbered lists (`1. …`); supports bullets and plain blocks as fallbacks.
 */
export function markdownToRecipeSteps(md: string): string[] {
  const trimmed = md.replace(/\r\n/g, "\n").trim();
  if (!trimmed) {
    return [];
  }

  const numbered = parseNumberedList(trimmed);
  if (numbered.length > 0) {
    return numbered;
  }

  const bullets = parseBulletLines(trimmed);
  if (bullets.length > 0) {
    return bullets;
  }

  const paras = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length > 1) {
    return paras;
  }

  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines;
  }

  return [trimmed];
}

/**
 * Format saved steps as markdown (ordered list) for the textarea.
 */
export function recipeStepsToMarkdown(steps: string[]): string {
  if (steps.length === 0) {
    return "";
  }
  return steps
    .map((raw, i) => {
      const n = i + 1;
      const body = raw.replace(/\r\n/g, "\n").replace(/\s+$/u, "");
      if (!body.trim()) {
        return "";
      }
      const lines = body.split("\n");
      const out: string[] = [`${n}. ${lines[0] ?? ""}`];
      for (let j = 1; j < lines.length; j++) {
        out.push(`   ${lines[j]}`);
      }
      return out.join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}
