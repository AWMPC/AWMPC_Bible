/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from "./contracts";
import { isRetryableStatus, LIMITS, listBooks, parseLibrary, readChapter, type Library } from "./library";

const DATASET_URL = "/data/bible-en.json";
let library: Library | null = null;

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

function delay(attempt: number): Promise<void> {
  const duration = Math.min(4000, 250 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function fetchWithBackoff(): Promise<string> {
  let lastError: unknown = new Error("The library could not be loaded.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(DATASET_URL, { cache: "force-cache", credentials: "same-origin" });
      if (!response.ok) {
        const error = new Error(`Data request failed (${response.status}).`);
        if (!isRetryableStatus(response.status)) throw error;
        lastError = error;
      } else {
        const declaredLength = Number(response.headers.get("content-length") || 0);
        if (declaredLength > LIMITS.bytes) throw new Error("The data file is too large.");
        return await response.text();
      }
    } catch (error) {
      lastError = error;
      if (error instanceof TypeError === false) throw error;
    }
    if (attempt < 3) await delay(attempt);
  }
  throw lastError;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === "load") {
      library = parseLibrary(await fetchWithBackoff());
      post({ type: "ready", books: listBooks(library) });
    } else if (data.type === "chapter" && library) {
      post({ ...data, type: "chapter", verses: readChapter(library, data.book, data.chapter) });
    }
  } catch (error) {
    library = null;
    post({ type: "error", message: error instanceof Error ? error.message : "The library could not be read." });
  }
};
