import react from "@vitejs/plugin-react";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import packageMetadata from "./package.json" with { type: "json" };

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

function localDatasetPlugin(): Plugin {
  return {
    name: "awmpc-local-datasets",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        const filename = pathname.match(/^\/data\/(bible-.+\.json)$/i)?.[1];
        if (pathname === "/data/bibles.json") {
          const files = (await readdir(import.meta.dirname)).filter((file) => /^bible-.+\.json$/i.test(file)).sort();
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify(files.map((file) => ({ id: file.slice(6, -5), label: file.slice(6, -5).replace(/[._-]+/g, " ") }))));
          return;
        }
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

function serviceWorkerVersionPlugin(): Plugin {
  return {
    name: "awmpc-service-worker-version",
    apply: "build",
    async writeBundle(options) {
      const outDir = options.dir ?? resolve(import.meta.dirname, "dist");
      const swPath = resolve(outDir, "sw.js");
      const source = await readFile(swPath, "utf8");
      const dataBaseUrl = process.env.VITE_BIBLE_DATA_BASE_URL?.trim() ?? "";
      await writeFile(swPath, source
        .replaceAll("__APP_VERSION__", packageMetadata.version)
        .replaceAll("__BIBLE_DATA_BASE_URL__", JSON.stringify(dataBaseUrl)));
    },
  };
}

export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(packageMetadata.version) },
  plugins: [localDatasetPlugin(), serviceWorkerVersionPlugin(), react()],
  server: isCodexSeatbeltSandbox
    ? { watch: { useFsEvents: false, usePolling: true } }
    : undefined,
});
