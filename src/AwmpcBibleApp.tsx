import { useCallback, useEffect, useRef, useState } from "react";
import { useBibleLibrary, type Passage } from "./data/useBibleLibrary";
import { useBibleHistory } from "./history/useBibleHistory";
import { useStagedNavigation } from "./navigation/useStagedNavigation";
import { useChooseVerse } from "./selection/useChooseVerse";
import { useBibleSettings } from "./settings/useBibleSettings";
import { EmptyFeature } from "./ui/EmptyFeature";
import { FeatureOverlay, type FeatureOverlayHandle } from "./ui/FeatureOverlay";
import { FloatingDock } from "./ui/FloatingDock";
import { HistoryPanel } from "./ui/HistoryPanel";
import { NavigationPanel } from "./ui/NavigationPanel";
import { ProfilePanel } from "./ui/ProfilePanel";
import { Skeleton } from "./ui/Skeleton";
import type { FeatureId, OverlayOrigin } from "./ui/features";
import { verseElementId } from "./ui/transitionVerseView";
import { isTrustedReadingTap, useUserScrollDockVisibility } from "./ui/useUserScrollDockVisibility";

export function AwmpcBibleApp() {
  const overlayRef = useRef<FeatureOverlayHandle>(null);
  const readingPaneRef = useRef<HTMLElement>(null);
  const library = useBibleLibrary();
  const [passage, setPassage] = useState<Passage>({ book: "", chapter: "", verses: [] });
  const { book, chapter, verses } = passage;
  const navigation = useStagedNavigation(library.books, library.requestChapter, library.invalidate);
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<OverlayOrigin | null>(null);
  const { entries: history, record: recordHistory } = useBibleHistory();
  const { settings, update: updateSettings } = useBibleSettings();
  const { textScale, verseFont, appearance } = settings;
  const closeOverlay = useCallback(async () => { await overlayRef.current?.close(); }, []);
  const { chooseVerse, cancel: cancelVerseSelection } = useChooseVerse({
    passage,
    readingPaneRef,
    requestChapter: library.requestChapter,
    cancelRequest: () => library.invalidate("selection"),
    commit: setPassage,
    recordHistory,
    closeOverlay,
  });

  useEffect(() => {
    if (library.initialPassage && !passage.book) setPassage(library.initialPassage);
  }, [library.initialPassage, passage.book]);

  const { visible: dockVisible, toggle: toggleDockVisibility } = useUserScrollDockVisibility(activeFeature === null);

  function openFeature(feature: FeatureId, origin: OverlayOrigin) {
    if (feature === activeFeature) {
      void overlayRef.current?.close();
      return;
    }
    overlayRef.current?.keepOpen();
    cancelVerseSelection();
    if (activeFeature === "navigation") navigation.abandon();
    if (feature === "navigation") {
      navigation.openFrom(passage);
    }
    setOverlayOrigin(origin);
    setActiveFeature(feature);
  }

  function finishOverlayClose() {
    const closedFeature = activeFeature;
    cancelVerseSelection();
    navigation.abandon();
    setActiveFeature(null);
    setOverlayOrigin(null);
    requestAnimationFrame(() => {
      if (closedFeature) document.querySelector<HTMLButtonElement>(`.dock-button[data-feature="${closedFeature}"]`)?.focus({ preventScroll: true });
    });
  }

  return (
    <div className="awmpc-bible-shell" data-text-scale={textScale} data-verse-font={verseFont}>
      <div className="reader-layer" inert={activeFeature !== null}>
        <a className="skip-link" href="#reading-pane">Skip to text</a>
        <div className="workspace">
          <main
          ref={readingPaneRef}
          id="reading-pane"
          className="reading-pane"
          tabIndex={-1}
          onClick={(event) => {
            const interactive = event.target instanceof Element && Boolean(event.target.closest("a, button, input, select, textarea, [contenteditable='true']"));
            if (isTrustedReadingTap(event.nativeEvent.isTrusted, event.detail, interactive)) toggleDockVisibility();
          }}
        >
          {library.status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{library.error}</p></section> : (
            <>
              <div className="reading-header">
                <h1>{book || "Preparing your library"}</h1>
                {chapter && <p className="chapter-indicator">Chapter <strong>{chapter}</strong></p>}
              </div>
              {verses.length === 0 ? <Skeleton rows={8} text /> : <article aria-label={`${book} chapter ${chapter}`}><ol className="verses">{verses.map((verse) => <li id={verseElementId(chapter, verse.number)} tabIndex={-1} key={verse.number}><span aria-label={`Verse ${verse.number}`}>{verse.number}</span><p>{verse.text}</p></li>)}</ol></article>}
            </>
          )}
          </main>
        </div>
      </div>
      {activeFeature && <button className="overlay-shade" type="button" aria-label="Close overlay" onClick={() => void overlayRef.current?.close()} />}
      <FloatingDock activeFeature={activeFeature} visible={dockVisible} onOpen={openFeature} />
      <FeatureOverlay ref={overlayRef} activeFeature={activeFeature} origin={overlayOrigin} onClose={finishOverlayClose}>
        {activeFeature === "navigation" && (
          <NavigationPanel books={library.books} book={navigation.state.book} chapters={navigation.chapters} chapter={navigation.state.chapter} verses={navigation.state.verses} initialLoading={library.status === "loading"} versesLoading={navigation.state.status === "loading"} error={navigation.state.error || undefined} onBook={navigation.chooseBook} onChapter={navigation.chooseChapter} onVerse={(verse) => void chooseVerse({ book: navigation.state.book, chapter: navigation.state.chapter, verse }, { prefetchedVerses: navigation.state.verses })} />
        )}
        {activeFeature === "history" && <HistoryPanel entries={history} onSelect={(entry) => void chooseVerse(entry, { recordHistory: false })} />}
        {activeFeature === "search" && <EmptyFeature title="Search is ready for its index" detail="Full-text results and your recent searches will share this focused space." />}
        {activeFeature === "profile" && <ProfilePanel textScale={textScale} onTextScaleChange={(value) => updateSettings({ textScale: value })} verseFont={verseFont} onVerseFontChange={(value) => updateSettings({ verseFont: value })} appearance={appearance} onAppearanceChange={(value) => updateSettings({ appearance: value })} />}
      </FeatureOverlay>
    </div>
  );
}
