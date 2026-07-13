import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const LOCAL_DATASETS = new Map([
  ["/data/bible-en.json", "bible-en.json"],
  ["/data/bible-ko.json", "bible-ko.json"],
]);

function localDatasetPlugin(): Plugin {
  return {
    name: "awmpc-local-datasets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        const filename = LOCAL_DATASETS.get(pathname);
        if (!filename) return next();

        try {
          const data = await readFile(resolve(import.meta.dirname, filename));
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(request.method === "HEAD" ? undefined : data);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return next();
          next(error as Error);
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [localDatasetPlugin(), react()],
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
});
