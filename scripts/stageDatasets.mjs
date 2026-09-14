import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const destination = resolve(root, "public/data");

// A Pages build can load its public datasets from R2 at runtime. In that mode
// the ignored local translation sources are intentionally absent from CI and
// any locally staged copies must not leak into the Pages artifact.
if (process.env.VITE_BIBLE_DATA_BASE_URL?.trim()) {
  try {
    const staged = await readdir(destination);
    await Promise.all(staged.filter((filename) => filename === "bibles.json" || /^bible-.+\.json$/i.test(filename)).map((filename) => unlink(resolve(destination, filename))));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  process.exit(0);
}

try {
  const DATASETS = (await readdir(root)).filter((filename) => /^bible-.+\.json$/i.test(filename)).sort();
  if (DATASETS.length === 0) throw new Error("No bible-*.json datasets were found at the repository root.");
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
  await writeFile(resolve(destination, "bibles.json"), JSON.stringify(DATASETS.map((filename) => ({ id: filename.slice(6, -5), label: filename.slice(6, -5).replace(/[._-]+/g, " ") }))));
} catch (error) {
  const cause = error instanceof Error ? error.message : String(error);
  throw new Error(`All bible-*.json files must be valid UTF-8 JSON at the repository root before a deployment build. ${cause}`);
}
