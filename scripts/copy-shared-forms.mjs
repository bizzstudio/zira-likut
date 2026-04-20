#!/usr/bin/env node
/**
 * העתקת תיקיית shared/ לפרויקטים חיצוניים (בקאנד / אדמין).
 * שימוש:
 *   node scripts/copy-shared-forms.mjs --backend "C:\path\to\backend\shared"
 *   node scripts/copy-shared-forms.mjs --admin "C:\path\to\admin\shared"
 *   node scripts/copy-shared-forms.mjs --backend "..." --admin "..."
 */
import { cpSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "shared");

function parseArg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return null;
  return process.argv[i + 1];
}

const destBackend = parseArg("--backend");
const destAdmin = parseArg("--admin");

if (!destBackend && !destAdmin) {
  console.error(
    "נא לציין לפחות אחד: --backend <path> ו/או --admin <path>\n" +
      "דוגמה: node scripts/copy-shared-forms.mjs --backend C:\\\\repos\\\\api\\\\shared"
  );
  process.exit(1);
}

if (!existsSync(src)) {
  console.error("לא נמצא:", src);
  process.exit(1);
}

function copyTo(dest) {
  const parent = dirname(dest);
  if (!existsSync(parent)) {
    console.error("תיקיית היעד לא קיימת:", parent);
    process.exit(1);
  }
  cpSync(src, dest, { recursive: true, force: true });
  console.log("הועתק ל:", dest);
}

if (destBackend) copyTo(destBackend);
if (destAdmin) copyTo(destAdmin);
