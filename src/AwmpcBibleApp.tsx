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
import { ReadingLocationControls } from "./ui/ReadingLocationControls";
import { ProfilePanel } from "./ui/ProfilePanel";
import { Skeleton } from "./ui/Skeleton";
import { createOverlayOrigin, featureTitle, type FeatureId, type OverlayOrigin } from "./ui/features";
import { verseElementId } from "./ui/transitionVerseView";
import { isTrustedReadingTap, useUserScrollChromeVisibility } from "./ui/useUserScrollChromeVisibility";
import { useChapterScrollProgress } from "./ui/useChapterScrollProgress";
import { VerseWithFootnotes } from "./ui/VerseWithFootnotes";
import type { NavigationSection, NavigationSectionRequest } from "./ui/navigationTarget";

export function AwmpcBibleApp() {
  const overlayRef = useRef<FeatureOverlayHandle>(null);
  const selectionCloseRef = useRef(false);
  const overlayTriggerRef = useRef<HTMLButtonElement | null>(null);
  const navigationRequestIdRef = useRef(0);
  const readingPaneRef = useRef<HTMLElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const { settings, update: updateSettings } = useBibleSettings();
  const { textScale, verseFont, appearance, bibleLanguage } = settings;
  const library = useBibleLibrary(bibleLanguage);
  const [passage, setPassage] = useState<Passage>({ book: "", chapter: "", verses: [] });
  const visiblePassage = library.status === "loading" ? { book: "", chapter: "", verses: [] } : passage;
  const { book, chapter, verses } = visiblePassage;
  useChapterScrollProgress(chapterRef, shellRef, `${bibleLanguage}:${book}:${chapter}`);
  const navigation = useStagedNavigation(library.books, library.requestChapter, library.invalidate);
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<OverlayOrigin | null>(null);
  const [navigationSectionRequest, setNavigationSectionRequest] = useState<NavigationSectionRequest | null>(null);
  const { entries: history, record: recordHistory, remove: removeHistory, clear: clearHistory } = useBibleHistory();
  const visibleHistory = history.filter((entry) => entry.bibleLanguage === bibleLanguage);
  const recordHistoryForLanguage = useCallback((selection: { book: string; chapter: string; verse: string }) => {
    recordHistory({ ...selection, bibleLanguage });
  }, [bibleLanguage, recordHistory]);
  const closeOverlay = useCallback(async () => {
    selectionCloseRef.current = true;
    try { await overlayRef.current?.close(); } finally { selectionCloseRef.current = false; }
  }, []);
  const { chooseVerse, cancel: cancelVerseSelection } = useChooseVerse({
    passage,
    readingPaneRef,
    requestChapter: library.requestChapter,
    cancelRequest: () => library.invalidate("selection"),
    commit: setPassage,
    recordHistory: recordHistoryForLanguage,
    closeOverlay,
  });

  useEffect(() => {
    cancelVerseSelection();
    navigation.abandon();
    setPassage({ book: "", chapter: "", verses: [] });
  }, [bibleLanguage]);

  useEffect(() => {
    if (library.initialPassage && !passage.book) setPassage(library.initialPassage);
  }, [library.initialPassage, passage.book]);

  const { visible: chromeVisible, toggle: toggleChromeVisibility } = useUserScrollChromeVisibility(activeFeature === null);

  function openFeature(feature: FeatureId, trigger: HTMLButtonElement) {
    const dock = dockRef.current;
    if (!dock) return;
    const origin = createOverlayOrigin(trigger.getBoundingClientRect(), dock.getBoundingClientRect());
    overlayTriggerRef.current = trigger;
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
    setNavigationSectionRequest(null);
    setOverlayOrigin(origin);
    setActiveFeature(feature);
  }

  function openNavigationAt(section: NavigationSection, origin: OverlayOrigin, trigger: HTMLButtonElement) {
    overlayTriggerRef.current = trigger;
    overlayRef.current?.keepOpen();
    cancelVerseSelection();
    navigation.openFrom(passage);
    setNavigationSectionRequest({ section, id: ++navigationRequestIdRef.current });
    setOverlayOrigin(origin);
    setActiveFeature("navigation");
  }

  function finishOverlayClose() {
    const closedFeature = activeFeature;
    if (!selectionCloseRef.current) cancelVerseSelection();
    navigation.abandon();
    setActiveFeature(null);
    setOverlayOrigin(null);
    setNavigationSectionRequest(null);
    requestAnimationFrame(() => {
      const trigger = overlayTriggerRef.current;
      overlayTriggerRef.current = null;
      if (closedFeature && trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
  }

  return (
    <div ref={shellRef} className="awmpc-bible-shell" data-text-scale={textScale} data-verse-font={verseFont}>
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
            if (isTrustedReadingTap(event.nativeEvent.isTrusted, event.detail, interactive)) toggleChromeVisibility();
          }}
        >
          {library.status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{library.error}</p></section> : (
            library.status === "loading" || verses.length === 0 ? <Skeleton rows={8} text /> : <article ref={chapterRef} lang={bibleLanguage} aria-label={`${book} chapter ${chapter}`}><ol className="verses">{verses.map((verse) => <li id={verseElementId(chapter, verse.number)} tabIndex={-1} key={`${book}-${chapter}-${verse.number}`}><VerseWithFootnotes verse={verse} /></li>)}</ol></article>
          )}
          </main>
        </div>
      </div>
      <ReadingLocationControls book={book} chapter={chapter} visible={chromeVisible && activeFeature === null} activeSection={activeFeature === "navigation" ? navigationSectionRequest?.section ?? null : null} obscured={activeFeature !== null} dockRef={dockRef} onNavigate={openNavigationAt} />
      <FloatingDock ref={dockRef} activeFeature={activeFeature} visible={chromeVisible} onOpen={openFeature} />
      <p className="visually-hidden" role="status" aria-live="polite">{activeFeature ? `${featureTitle(activeFeature)} overlay open` : ""}</p>
      <FeatureOverlay ref={overlayRef} activeFeature={activeFeature} origin={overlayOrigin} dockRef={dockRef} contentRef={overlayContentRef} onClose={finishOverlayClose}>
        {activeFeature === "navigation" && (
          <NavigationPanel books={library.books} book={navigation.state.book} chapters={navigation.chapters} chapter={navigation.state.chapter} verses={navigation.state.verses} initialLoading={library.status === "loading"} versesLoading={navigation.state.status === "loading"} error={navigation.state.error || undefined} sectionRequest={navigationSectionRequest} scrollContainerRef={overlayContentRef} onBook={navigation.chooseBook} onChapter={navigation.chooseChapter} onVerse={(verse) => void chooseVerse({ book: navigation.state.book, chapter: navigation.state.chapter, verse }, { prefetchedVerses: navigation.state.verses })} />
        )}
        {activeFeature === "history" && <HistoryPanel entries={visibleHistory} onSelect={(entry) => void chooseVerse(entry, { recordHistory: false })} onRemove={removeHistory} onClear={clearHistory} />}
        {activeFeature === "search" && <EmptyFeature title="Search is ready for its index" detail="Full-text results and your recent searches will share this focused space." />}
        {activeFeature === "profile" && <ProfilePanel textScale={textScale} onTextScaleChange={(value) => updateSettings({ textScale: value })} verseFont={verseFont} onVerseFontChange={(value) => updateSettings({ verseFont: value })} appearance={appearance} onAppearanceChange={(value) => updateSettings({ appearance: value })} bibleLanguage={bibleLanguage} onBibleLanguageChange={(value) => updateSettings({ bibleLanguage: value })} />}
      </FeatureOverlay>
    </div>
  );
}
