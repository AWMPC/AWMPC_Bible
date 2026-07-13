/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from "./contracts";
import { fetchDatasetText } from "./fetchDataset";
import { isAllowedBibleDatasetUrl } from "./languages";
import { listBooks, parseLibrary, readChapter, type Library } from "./library";

let library: Library | null = null;
let loadSequence = 0;
let activeLoad: AbortController | null = null;

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === "load") {
    const sequence = ++loadSequence;
    activeLoad?.abort();
    const controller = new AbortController();
    activeLoad = controller;
    library = null;
    try {
      if (!isAllowedBibleDatasetUrl(data.language, data.datasetUrl, data.baseUrl, self.location.origin)) {
        throw new Error("The requested Bible dataset is not allowed.");
      }
      const loaded = parseLibrary(await fetchDatasetText(data.datasetUrl, { signal: controller.signal }));
      if (sequence !== loadSequence || controller.signal.aborted) return;
      library = loaded;
      post({ type: "ready", language: data.language, books: listBooks(loaded) });
    } catch (error) {
      if (sequence !== loadSequence || controller.signal.aborted) return;
      library = null;
      post({ type: "error", message: error instanceof Error ? error.message : "The library could not be read." });
    } finally {
      if (sequence === loadSequence) activeLoad = null;
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
