import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. The mainland deployment uses the versioned JSON snapshot; configure a DB binding before enabling persistent knowledge imports."
    );
  }

  return drizzle(env.DB, { schema });
}
