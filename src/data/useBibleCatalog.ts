import { useEffect, useState } from "react";
import type { BibleLanguageOption } from "./languages";
import { bibleCatalogUrl, bibleDataBaseUrl } from "./languages";
import { fetchDatasetText } from "./fetchDataset";

export function useBibleCatalog() {
  const [options, setOptions] = useState<ReadonlyArray<BibleLanguageOption>>([]);
  useEffect(() => {
    const controller = new AbortController();
    const baseUrl = new URL("./", window.location.href).href;
    const dataUrl = bibleDataBaseUrl(baseUrl);
    void fetchDatasetText(bibleCatalogUrl(dataUrl), { signal: controller.signal })
      .then((text) => JSON.parse(text) as unknown)
      .then((value) => {
        if (!Array.isArray(value)) return;
        setOptions(value.filter((item): item is BibleLanguageOption => item && typeof item === "object" && typeof (item as BibleLanguageOption).id === "string" && typeof (item as BibleLanguageOption).label === "string"));
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  return options;
}
