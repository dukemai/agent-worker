import * as fs from "node:fs";
import * as path from "node:path";

/** Latest scrape outputs (gitignored). Disable with `PROMO_NO_DISK_OUTPUT=1`. */
const PROMO_RUN_DIR = path.join(__dirname, "..", "..", "data", "promo-run");

export function writePromoRunJson(filename: string, payload: unknown): string | null {
  if (process.env.PROMO_NO_DISK_OUTPUT === "1") {
    return null;
  }
  fs.mkdirSync(PROMO_RUN_DIR, { recursive: true });
  const fp = path.join(PROMO_RUN_DIR, filename);
  fs.writeFileSync(fp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return fp;
}
