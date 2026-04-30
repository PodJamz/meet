import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(filePath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^['"]/, "")
        .replace(/['"]$/, "");
      env[key] = value;
    }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error(`Could not read env file "${filePath}":`, err);
  }
  return env;
}

export function requireEnv(...keys: string[]): Record<string, string> {
  const env = loadEnv(join(process.cwd(), ".env.local"));
  const missing = keys.filter((k) => !env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
  return Object.fromEntries(keys.map((k) => [k, env[k]])) as Record<string, string>;
}
