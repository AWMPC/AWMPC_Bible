import { useEffect, useState } from "react";
import type { BibleLanguageOption } from "./languages";

export function useBibleCatalog() {
  const [options, setOptions] = useState<ReadonlyArray<BibleLanguageOption>>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(new URL("data/bibles.json", window.location.href), { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<unknown> : Promise.reject(new Error("catalog unavailable")))
      .then((value) => {
        if (!Array.isArray(value)) return;
        setOptions(value.filter((item): item is BibleLanguageOption => item && typeof item === "object" && typeof (item as BibleLanguageOption).id === "string" && typeof (item as BibleLanguageOption).label === "string"));
      }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  return options;
}
