import { useCallback, useEffect, useRef, useState } from "react";
import { useBibleLibrary, type Passage } from "./data/useBibleLibrary";
import { pairedBookName, versesByNumber } from "./data/dualLanguage";
import { useSecondaryPassage } from "./data/useSecondaryPassage";
import { useBibleHistory } from "./history/useBibleHistory";
import type { HistoryEntry } from "./history/HistoryStore";
import { useStagedNavigation } from "./navigation/useStagedNavigation";
import { parseVerseLink, type LinkedVerse } from "./links/verseLinks";
import { useChooseVerse } from "./selection/useChooseVerse";
import { useLanguageVerseAnchor } from "./selection/useLanguageVerseAnchor";
import { activeBibleLanguages } from "./settings/SettingsStore";
import { useBibleSettings } from "./settings/useBibleSettings";
import { BIBLE_LANGUAGE_OPTIONS, type BibleLanguage } from "./settings/bibleLanguage";
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
import { middleVerseNumber } from "./ui/middleVerse";
import { VerseWithFootnotes } from "./ui/VerseWithFootnotes";
import { VerseActionsMenu, type VerseActionTarget } from "./ui/VerseActionsMenu";
import type { NavigationSection, NavigationSectionRequest } from "./ui/navigationTarget";

export function AwmpcBibleApp() {
  const overlayRef = useRef<FeatureOverlayHandle>(null);
  const selectionCloseRef = useRef(false);
  const overlayTriggerRef = useRef<HTMLButtonElement | null>(null);
  const navigationRequestIdRef = useRef(0);
  const verseActionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const readingPaneRef = useRef<HTMLElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const initialVerseLinkRef = useRef<LinkedVerse | null>(parseVerseLink(window.location.href));
  const [pendingVerseLink, setPendingVerseLink] = useState<LinkedVerse | null>(initialVerseLinkRef.current);
  const { settings, update: updateSettings, setPrimaryBibleLanguage, setSecondaryBibleLanguage } = useBibleSettings(initialVerseLinkRef.current?.bibleLanguage);
  const { textScale, verseFont, appearance, primaryBibleLanguage, secondaryBibleLanguage } = settings;
  const primaryLibrary = useBibleLibrary(primaryBibleLanguage);
  const secondaryLibrary = useBibleLibrary(secondaryBibleLanguage);
  const [passage, setPassage] = useState<Passage>({ book: "", chapter: "", verses: [] });
  const visiblePassage = primaryLibrary.status === "loading" ? { book: "", chapter: "", verses: [] } : passage;
  const { book, chapter, verses } = visiblePassage;
  const secondary = useSecondaryPassage({
    language: secondaryBibleLanguage,
    primaryBook: book,
    primaryChapter: chapter,
    primaryBooks: primaryLibrary.books,
    secondaryBooks: secondaryLibrary.books,
    libraryStatus: secondaryLibrary.status,
    requestChapter: secondaryLibrary.requestChapter,
    invalidate: secondaryLibrary.invalidate,
  });
  const secondaryBook = pairedBookName(book, primaryLibrary.books, secondaryLibrary.books);
  const secondaryVerses = versesByNumber(secondary.passage?.verses ?? []);
  useChapterScrollProgress(chapterRef, shellRef, `${primaryBibleLanguage}:${secondaryBibleLanguage ?? ""}:${book}:${chapter}`);
  const navigation = useStagedNavigation(primaryLibrary.books, primaryLibrary.requestChapter, primaryLibrary.invalidate);
  const [activeFeature, setActiveFeature] = useState<FeatureId | null>(null);
  const [overlayOrigin, setOverlayOrigin] = useState<OverlayOrigin | null>(null);
  const [navigationSectionRequest, setNavigationSectionRequest] = useState<NavigationSectionRequest | null>(null);
  const [verseActionTarget, setVerseActionTarget] = useState<VerseActionTarget | null>(null);
  const [readerStatus, setReaderStatus] = useState("");
  const { entries: history, record: recordHistory, remove: removeHistory, clear: clearHistory } = useBibleHistory();
  const recordHistoryForLanguage = useCallback((selection: { book: string; chapter: string; verse: string }) => {
    recordHistory({ ...selection, bibleLanguage: primaryBibleLanguage });
  }, [primaryBibleLanguage, recordHistory]);
  const closeOverlay = useCallback(async () => {
    selectionCloseRef.current = true;
    try { await overlayRef.current?.close(); } finally { selectionCloseRef.current = false; }
  }, []);
  const { chooseVerse, cancel: cancelVerseSelection } = useChooseVerse({
    passage,
    readingPaneRef,
    requestChapter: primaryLibrary.requestChapter,
    cancelRequest: () => primaryLibrary.invalidate("selection"),
    commit: setPassage,
    recordHistory: recordHistoryForLanguage,
    closeOverlay,
  });
  const secondaryAnchorRef = useRef<string | null>(null);
  const updatePrimaryBibleLanguage = useCallback((language: BibleLanguage) => {
    secondaryAnchorRef.current = middleVerseNumber(chapterRef.current);
    setPrimaryBibleLanguage(language);
  }, [setPrimaryBibleLanguage]);
  const { changeLanguage, restoring: restoringLanguageAnchor } = useLanguageVerseAnchor({
    language: primaryBibleLanguage,
    books: primaryLibrary.books,
    passage,
    chapterRef,
    libraryStatus: primaryLibrary.status,
    requestChapter: primaryLibrary.requestChapter,
    commit: setPassage,
    updateLanguage: updatePrimaryBibleLanguage,
  });

  const changeSecondaryLanguage = useCallback((language: BibleLanguage | null) => {
    secondaryAnchorRef.current = middleVerseNumber(chapterRef.current);
    setSecondaryBibleLanguage(language);
  }, [setSecondaryBibleLanguage]);

  const closeVerseActions = useCallback((restoreFocus: boolean) => {
    const trigger = verseActionTriggerRef.current;
    verseActionTriggerRef.current = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    setVerseActionTarget(null);
  }, []);

  const openVerseActions = useCallback((targetVerse: VerseActionTarget["verse"], trigger: HTMLButtonElement, language: BibleLanguage, localizedBook: string, localizedChapter: string) => {
    setReaderStatus("");
    if (verseActionTriggerRef.current === trigger) {
      closeVerseActions(true);
      return;
    }
    verseActionTriggerRef.current = trigger;
    setVerseActionTarget({ bibleLanguage: language, book: localizedBook, chapter: localizedChapter, verse: targetVerse, trigger });
  }, [closeVerseActions]);

  useEffect(() => {
    cancelVerseSelection();
    navigation.abandon();
    verseActionTriggerRef.current = null;
    setVerseActionTarget(null);
    setPassage({ book: "", chapter: "", verses: [] });
  }, [primaryBibleLanguage]);

  useEffect(() => {
    const targetVerse = secondaryAnchorRef.current;
    const secondarySettled = secondaryBibleLanguage === null || secondary.status === "ready" || secondary.status === "error";
    if (!targetVerse || !secondarySettled || !chapter) return;
    secondaryAnchorRef.current = null;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        document.getElementById(verseElementId(chapter, targetVerse))?.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [chapter, secondary.status, secondaryBibleLanguage]);

  useEffect(() => {
    if (!pendingVerseLink || pendingVerseLink.bibleLanguage !== primaryBibleLanguage || primaryLibrary.status !== "ready") return;
    setPendingVerseLink(null);
    if (!primaryLibrary.books.some(({ name }) => name === pendingVerseLink.book)) {
      setReaderStatus("The linked verse is unavailable in this Bible.");
      return;
    }
    void chooseVerse(pendingVerseLink, { recordHistory: false }).then((result) => {
      if (result.status !== "selected") setReaderStatus("The linked verse is unavailable in this Bible.");
    });
  }, [primaryBibleLanguage, chooseVerse, primaryLibrary.books, primaryLibrary.status, pendingVerseLink]);

  useEffect(() => {
    if (primaryLibrary.initialPassage && !passage.book && !pendingVerseLink && !restoringLanguageAnchor) setPassage(primaryLibrary.initialPassage);
  }, [primaryLibrary.initialPassage, passage.book, pendingVerseLink, restoringLanguageAnchor]);

  const selectHistoryEntry = useCallback((entry: HistoryEntry) => {
    if (entry.bibleLanguage === primaryBibleLanguage) {
      void chooseVerse(entry, { recordHistory: false });
      return;
    }
    if (entry.bibleLanguage === secondaryBibleLanguage) {
      const index = secondaryLibrary.books.findIndex(({ name }) => name === entry.book);
      const primaryBook = primaryLibrary.books[index]?.name;
      if (primaryBook) {
        void chooseVerse({ book: primaryBook, chapter: entry.chapter, verse: entry.verse }, { recordHistory: false });
      } else {
        setReaderStatus("This history entry is unavailable in the primary Bible.");
      }
      return;
    }
    setPendingVerseLink({ bibleLanguage: entry.bibleLanguage, book: entry.book, chapter: entry.chapter, verse: entry.verse });
    setPrimaryBibleLanguage(entry.bibleLanguage);
  }, [chooseVerse, primaryBibleLanguage, primaryLibrary.books, secondaryBibleLanguage, secondaryLibrary.books, setPrimaryBibleLanguage]);

  const { visible: chromeVisible, toggle: toggleChromeVisibility } = useUserScrollChromeVisibility(activeFeature === null);
  const dualLanguage = secondaryBibleLanguage !== null;
  const languageLabels = new Map(BIBLE_LANGUAGE_OPTIONS.map(({ id, label }) => [id, label]));
  const activeLanguageLabels = activeBibleLanguages(settings).map((language) => languageLabels.get(language) ?? language);

  function openFeature(feature: FeatureId, trigger: HTMLButtonElement) {
    const dock = dockRef.current;
    if (!dock) return;
    closeVerseActions(false);
    setReaderStatus("");
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
    <div ref={shellRef} className="awmpc-bible-shell" data-text-scale={textScale} data-verse-font={verseFont} data-dual-language={dualLanguage || undefined}>
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
          {primaryLibrary.status === "error" ? <section className="error-card" role="alert"><h1>Unable to open the text</h1><p>{primaryLibrary.error}</p></section> : (
            primaryLibrary.status === "loading" || verses.length === 0 ? <Skeleton rows={8} text /> : <article ref={chapterRef} aria-label={`${book} chapter ${chapter}`}><ol className="verses">{verses.map((verse) => {
              const secondaryVerse = secondaryVerses.get(verse.number);
              return <li id={verseElementId(chapter, verse.number)} data-verse-number={verse.number} tabIndex={-1} key={`${book}-${chapter}-${verse.number}`}>
                <VerseWithFootnotes key={`${primaryBibleLanguage}:${verse.number}`} verse={verse} language={primaryBibleLanguage} actionLanguageLabel={dualLanguage ? languageLabels.get(primaryBibleLanguage) : undefined} actionsOpen={verseActionTarget?.bibleLanguage === primaryBibleLanguage && verseActionTarget.verse.number === verse.number} onActions={(targetVerse, trigger) => openVerseActions(targetVerse, trigger, primaryBibleLanguage, book, chapter)} />
                {secondaryBibleLanguage && secondary.status === "loading" && <div className="verse-language-row secondary-verse-skeleton" lang={secondaryBibleLanguage} aria-hidden="true"><div className="verse-rail" /><div className="verse-content" /></div>}
                {secondaryBibleLanguage && secondary.passage && secondaryVerse && <VerseWithFootnotes key={`${secondaryBibleLanguage}:${verse.number}`} verse={secondaryVerse} language={secondaryBibleLanguage} actionLanguageLabel={languageLabels.get(secondaryBibleLanguage)} actionsOpen={verseActionTarget?.bibleLanguage === secondaryBibleLanguage && verseActionTarget.verse.number === secondaryVerse.number} onActions={(targetVerse, trigger) => openVerseActions(targetVerse, trigger, secondaryBibleLanguage, secondary.passage!.book, secondary.passage!.chapter)} />}
              </li>;
            })}</ol>{secondaryBibleLanguage && secondary.status === "error" && <p className="secondary-language-error" role="status">The secondary Bible text is unavailable for this passage.</p>}</article>
          )}
          </main>
        </div>
      </div>
      <ReadingLocationControls book={book} secondaryBook={secondaryBook} secondaryLanguage={secondaryBibleLanguage} chapter={chapter} visible={chromeVisible && activeFeature === null} activeSection={activeFeature === "navigation" ? navigationSectionRequest?.section ?? null : null} obscured={activeFeature !== null} dockRef={dockRef} onNavigate={openNavigationAt} />
      <FloatingDock ref={dockRef} activeFeature={activeFeature} visible={chromeVisible} onOpen={openFeature} />
      <p className="visually-hidden" role="status" aria-live="polite">{readerStatus || (activeFeature ? `${featureTitle(activeFeature)} overlay open` : "")}</p>
      <VerseActionsMenu target={verseActionTarget} onClose={closeVerseActions} onStatus={setReaderStatus} />
      <FeatureOverlay ref={overlayRef} activeFeature={activeFeature} origin={overlayOrigin} dockRef={dockRef} contentRef={overlayContentRef} onClose={finishOverlayClose}>
        {activeFeature === "navigation" && (
          <NavigationPanel books={primaryLibrary.books} secondaryBooks={secondaryLibrary.books} secondaryLanguage={secondaryBibleLanguage} book={navigation.state.book} chapters={navigation.chapters} chapter={navigation.state.chapter} verses={navigation.state.verses} initialLoading={primaryLibrary.status === "loading"} versesLoading={navigation.state.status === "loading"} error={navigation.state.error || undefined} sectionRequest={navigationSectionRequest} scrollContainerRef={overlayContentRef} onBook={navigation.chooseBook} onChapter={navigation.chooseChapter} onVerse={(verse) => void chooseVerse({ book: navigation.state.book, chapter: navigation.state.chapter, verse }, { prefetchedVerses: navigation.state.verses })} />
        )}
        {activeFeature === "history" && <HistoryPanel entries={history} onSelect={selectHistoryEntry} onRemove={removeHistory} onClear={clearHistory} />}
        {activeFeature === "search" && <EmptyFeature title="Search is ready for its index" detail={`Search will use only the active ${activeLanguageLabels.join(" and ")} Bible text${activeLanguageLabels.length > 1 ? "s" : ""}.`} />}
        {activeFeature === "profile" && <ProfilePanel textScale={textScale} onTextScaleChange={(value) => updateSettings({ textScale: value })} verseFont={verseFont} onVerseFontChange={(value) => updateSettings({ verseFont: value })} appearance={appearance} onAppearanceChange={(value) => updateSettings({ appearance: value })} primaryBibleLanguage={primaryBibleLanguage} secondaryBibleLanguage={secondaryBibleLanguage} onPrimaryBibleLanguageChange={changeLanguage} onSecondaryBibleLanguageChange={changeSecondaryLanguage} />}
      </FeatureOverlay>
    </div>
  );
}
