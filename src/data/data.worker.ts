/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from "./contracts";
import { fetchDatasetText } from "./fetchDataset";
import { listBooks, parseLibrary, readChapter, type Library } from "./library";

const DATASET_URL = "/data/bible-en.json";
let library: Library | null = null;

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === "load") {
    try {
      library = parseLibrary(await fetchDatasetText(DATASET_URL));
      post({ type: "ready", books: listBooks(library) });
    } catch (error) {
      library = null;
      post({ type: "error", message: error instanceof Error ? error.message : "The library could not be read." });
    }
  } else if (data.type === "chapter") {
    try {
      if (!library) throw new Error("The library is not ready.");
      post({ ...data, type: "chapter", verses: readChapter(library, data.book, data.chapter) });
    } catch (error) {
      post({ type: "error", requestId: data.requestId, target: data.target, message: error instanceof Error ? error.message : "That chapter could not be read." });
    }
  }
};
