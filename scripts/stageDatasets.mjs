import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const DATASETS = ["bible-en.json", "bible-ko.json"];
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/data");

await mkdir(destination, { recursive: true });

try {
  await Promise.all(DATASETS.map((filename) => copyFile(resolve(root, filename), resolve(destination, filename))));
} catch (error) {
  const cause = error instanceof Error ? error.message : String(error);
  throw new Error(`Both bible-en.json and bible-ko.json must exist at the repository root before development or deployment builds. ${cause}`);
}
