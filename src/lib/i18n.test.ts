import { strict as assert } from "node:assert";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { es } from "./i18n-es";

// Finds every t("…") / msg("…") in the app and checks it has a Spanish translation.

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

const used = new Set<string>();
for (const file of sourceFiles("src")) {
  for (const match of readFileSync(file, "utf8").matchAll(/\b(?:t|msg)\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    used.add(match[1]);
  }
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every string in the app has a Spanish translation", () => {
  const missing = [...used].filter((key) => !(key in es)).sort();
  assert.deepEqual(missing, [], `Missing Spanish translations:\n${missing.map((k) => JSON.stringify(k)).join(",\n")}`);
});

test("no leftover Spanish translations", () => {
  const unused = Object.keys(es).filter((key) => !used.has(key));
  assert.deepEqual(unused, []);
});

test("translations use the same placeholders as the English", () => {
  for (const [key, value] of Object.entries(es)) {
    const extra = placeholders(value).filter((p) => !placeholders(key).includes(p));
    assert.deepEqual(extra, [], `"${value}" uses a placeholder that "${key}" doesn't have`);
  }
});
