import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DATASETS = ["bible-en.json", "bible-ko.json"];
const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/data");

try {
  const datasets = await Promise.all(DATASETS.map(async (filename) => {
    try {
      const data = await readFile(resolve(root, filename));
      const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
      JSON.parse(text);
      return { data, filename };
    } catch {
      throw new Error(`${filename} is missing or is not valid UTF-8 JSON.`);
    }
  }));
  await mkdir(destination, { recursive: true });
  await Promise.all(datasets.map(async ({ data, filename }) => {
    const staged = resolve(destination, `.${filename}.staging`);
    await writeFile(staged, data);
    await rename(staged, resolve(destination, filename));
  }));
} catch (error) {
  const cause = error instanceof Error ? error.message : String(error);
  throw new Error(`Both bible-en.json and bible-ko.json must be valid UTF-8 JSON at the repository root before a deployment build. ${cause}`);
}
