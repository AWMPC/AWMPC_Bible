import { useCallback, useEffect, useRef, useState } from "react";
import { useBibleLibrary, type Passage } from "./data/useBibleLibrary";
import type { Verse } from "./data/contracts";
import { pairedBookName, versesByNumber } from "./data/dualLanguage";
import { useSecondaryPassage } from "./data/useSecondaryPassage";
import type { HistoryEntry, HistorySelection } from "./history/HistoryStore";
import { useStagedNavigation } from "./navigation/useStagedNavigation";
import { useAdjacentChapterNavigation } from "./navigation/useAdjacentChapterNavigation";
import { parseVerseLink, type LinkedVerse } from "./links/verseLinks";
import { useChooseVerse } from "./selection/useChooseVerse";
import { useLanguageVerseAnchor } from "./selection/useLanguageVerseAnchor";
import type { BibleLanguage } from "./settings/bibleLanguage";
import { FeatureOverlay, type FeatureOverlayHandle } from "./ui/FeatureOverlay";
import { FeatureSheetContent } from "./ui/FeatureSheetContent";
import { FloatingDock } from "./ui/FloatingDock";
import { ReadingLocationControls } from "./ui/ReadingLocationControls";
import { ReaderPassageView } from "./ui/ReaderPassageView";
import { createOverlayOrigin, featureTitle, type FeatureId, type OverlayOrigin } from "./ui/features";
import { verseElementId } from "./ui/transitionVerseView";
import { useUserScrollChromeVisibility } from "./ui/useUserScrollChromeVisibility";
import { useChapterScrollProgress } from "./ui/useChapterScrollProgress";
import { useChapterSwipe } from "./ui/useChapterSwipe";
import { useOverlayHistory } from "./ui/useOverlayHistory";
import { middleVerseNumber } from "./ui/middleVerse";
import { VerseActionsMenu, type VerseActionTarget } from "./ui/VerseActionsMenu";
import type { NavigationSection, NavigationSectionRequest } from "./ui/navigationTarget";
import { useBibleSearch, type LocalizedSearchResult } from "./search/useBibleSearch";
import { useReaderPersistence } from "./persistence/useReaderPersistence";
import { useBibleCatalog } from "./data/useBibleCatalog";

type LocalizedVerseReference = Readonly<{ bibleLanguage: BibleLanguage; book: string; chapter: string; verse: string }>;
type ReferenceSelectionOptions = Readonly<{ recordHistory: boolean; allowLanguageSwitch?: boolean; prefetchedVerses?: Verse[] }>;

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialVerseLinkRef = useRef<LinkedVerse | null>(parseVerseLink(window.location.href));
  const [pendingVerseLink, setPendingVerseLink] = useState<LinkedVerse | null>(initialVerseLinkRef.current);
  const bibleLanguageOptions = useBibleCatalog();
  const { settingsStore, historyStore, searchHistoryStore: searchHistory, cloud } = useReaderPersistence(initialVerseLinkRef.current?.bibleLanguage);
  const { settings, update: updateSettings, setPrimaryBibleLanguage, setSecondaryBibleLanguage } = settingsStore;
  const { textScale, verseFont, appearance, primaryBibleLanguage, secondaryBibleLanguage } = settings;
  const primaryLibrary = useBibleLibrary(primaryBibleLanguage);
  const secondaryLibrary = useBibleLibrary(secondaryBibleLanguage);
  useEffect(() => {
    if (bibleLanguageOptions.length === 0 || bibleLanguageOptions.some(({ id }) => id === primaryBibleLanguage)) return;
    setPrimaryBibleLanguage(bibleLanguageOptions[0].id);
  }, [bibleLanguageOptions, primaryBibleLanguage, setPrimaryBibleLanguage]);
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
  const requestOverlayClose = useCallback(() => {
    void overlayRef.current?.close();
  }, []);
  const { dismiss: dismissOverlayHistory } = useOverlayHistory(activeFeature !== null, requestOverlayClose);
  const { entries: history, record: recordHistory, remove: removeHistory, clear: clearHistory } = historyStore;
  const bibleSearch = useBibleSearch({
    enabled: activeFeature === "search",
    primaryLanguage: primaryBibleLanguage,
    secondaryLanguage: secondaryBibleLanguage,
    primaryStatus: primaryLibrary.status,
    secondaryStatus: secondaryLibrary.status,
    searchPrimary: primaryLibrary.search,
    searchSecondary: secondaryLibrary.search,
    cancelPrimary: primaryLibrary.cancelSearch,
    cancelSecondary: secondaryLibrary.cancelSearch,
  });
  const swipeNavigationEnabled = activeFeature === null && verseActionTarget === null && primaryLibrary.status === "ready" && Boolean(book && chapter);
  const chapterSwipe = useAdjacentChapterNavigation({
    enabled: swipeNavigationEnabled,
    books: primaryLibrary.books,
    passage,
    readingPaneRef,
    requestChapter: primaryLibrary.requestChapter,
    invalidate: primaryLibrary.invalidate,
    commit: setPassage,
    onStatus: setReaderStatus,
  });
  useChapterSwipe(readingPaneRef, swipeNavigationEnabled, chapterSwipe.canNavigate, chapterSwipe.navigate);
  const cancelChapterSwipe = chapterSwipe.cancel;
  const recordHistoryForLanguage = useCallback((selection: HistorySelection) => {
    recordHistory({ ...selection, bibleLanguage: selection.bibleLanguage ?? primaryBibleLanguage });
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
  const { changeLanguage, restoreAfterOverlayClose, restoring: restoringLanguageAnchor } = useLanguageVerseAnchor({
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
    if (language !== null && language === primaryBibleLanguage) return;
    secondaryAnchorRef.current = middleVerseNumber(chapterRef.current);
    setSecondaryBibleLanguage(language);
  }, [primaryBibleLanguage, setSecondaryBibleLanguage]);

  const closeVerseActions = useCallback((restoreFocus: boolean) => {
    const trigger = verseActionTriggerRef.current;
    verseActionTriggerRef.current = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
    setVerseActionTarget(null);
  }, []);

  const openVerseActions = useCallback((targetVerse: VerseActionTarget["verse"], trigger: HTMLButtonElement, language: BibleLanguage, localizedBook: string, localizedChapter: string) => {
    cancelChapterSwipe();
    setReaderStatus("");
    if (verseActionTriggerRef.current === trigger) {
      closeVerseActions(true);
      return;
    }
    verseActionTriggerRef.current = trigger;
    setVerseActionTarget({ bibleLanguage: language, book: localizedBook, chapter: localizedChapter, verse: targetVerse, trigger });
  }, [cancelChapterSwipe, closeVerseActions]);

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

  const selectVerseReference = useCallback((entry: LocalizedVerseReference, options: ReferenceSelectionOptions) => {
    const chooseOptions = {
      recordHistory: options.recordHistory,
      prefetchedVerses: options.prefetchedVerses,
      historySelection: options.recordHistory ? entry : undefined,
    };
    if (entry.bibleLanguage === primaryBibleLanguage) {
      void chooseVerse(entry, chooseOptions);
      return;
    }
    if (entry.bibleLanguage === secondaryBibleLanguage) {
      const index = secondaryLibrary.books.findIndex(({ name }) => name === entry.book);
      const primaryBook = primaryLibrary.books[index]?.name;
      if (primaryBook) {
        void chooseVerse({ book: primaryBook, chapter: entry.chapter, verse: entry.verse }, chooseOptions);
      } else {
        setReaderStatus("This verse is unavailable in the primary Bible.");
      }
      return;
    }
    if (options.allowLanguageSwitch) {
      setPendingVerseLink({ bibleLanguage: entry.bibleLanguage, book: entry.book, chapter: entry.chapter, verse: entry.verse });
      setPrimaryBibleLanguage(entry.bibleLanguage);
    } else {
      setReaderStatus("That search result is no longer in an active Bible.");
    }
  }, [chooseVerse, primaryBibleLanguage, primaryLibrary.books, secondaryBibleLanguage, secondaryLibrary.books, setPrimaryBibleLanguage]);

  const { visible: chromeVisible, hide: hideChromeVisibility, toggle: toggleChromeVisibility } = useUserScrollChromeVisibility(activeFeature === null);

  const selectHistoryEntry = useCallback((entry: HistoryEntry) => {
    selectVerseReference(entry, { recordHistory: false, allowLanguageSwitch: true });
  }, [selectVerseReference]);

  const selectSearchResult = useCallback((result: LocalizedSearchResult) => {
    hideChromeVisibility();
    selectVerseReference(result, { recordHistory: true });
  }, [hideChromeVisibility, selectVerseReference]);

  const dualLanguage = secondaryBibleLanguage !== null;
  const languageLabels = new Map(bibleLanguageOptions.map(({ id, label }) => [id, label]));

  function openFeature(feature: FeatureId, trigger: HTMLButtonElement) {
    const dock = dockRef.current;
    if (!dock) return;
    cancelChapterSwipe();
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
    cancelChapterSwipe();
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
    restoreAfterOverlayClose();
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
          <ReaderPassageView readingPaneRef={readingPaneRef} chapterRef={chapterRef} chapterSwipeLoading={chapterSwipe.loading} primaryStatus={primaryLibrary.status} primaryError={primaryLibrary.error} primaryLanguage={primaryBibleLanguage} book={book} chapter={chapter} verses={verses} secondaryLanguage={secondaryBibleLanguage} secondaryStatus={secondary.status} secondaryBook={secondary.passage?.book} secondaryChapter={secondary.passage?.chapter} secondaryVerses={secondaryVerses} languageLabels={languageLabels} verseActionTarget={verseActionTarget} onToggleChrome={toggleChromeVisibility} onVerseActions={openVerseActions} />
        </div>
      </div>
      <ReadingLocationControls book={book} secondaryBook={secondaryBook} secondaryLanguage={secondaryBibleLanguage} chapter={chapter} visible={chromeVisible && activeFeature === null} activeSection={activeFeature === "navigation" ? navigationSectionRequest?.section ?? null : null} obscured={activeFeature !== null} dockRef={dockRef} onNavigate={openNavigationAt} />
      <FloatingDock ref={dockRef} activeFeature={activeFeature} visible={chromeVisible} onOpen={openFeature} />
      <p className="visually-hidden" role="status" aria-live="polite">{readerStatus || (activeFeature ? `${featureTitle(activeFeature)} overlay open` : "")}</p>
      <VerseActionsMenu target={verseActionTarget} onClose={closeVerseActions} onStatus={setReaderStatus} />
      <FeatureOverlay ref={overlayRef} activeFeature={activeFeature} origin={overlayOrigin} dockRef={dockRef} contentRef={overlayContentRef} initialFocusRef={activeFeature === "search" ? searchInputRef : undefined} onCloseStart={dismissOverlayHistory} onClose={finishOverlayClose}>
        <FeatureSheetContent
          activeFeature={activeFeature}
          navigation={{ books: primaryLibrary.books, secondaryBooks: secondaryLibrary.books, secondaryLanguage: secondaryBibleLanguage, book: navigation.state.book, chapters: navigation.chapters, chapter: navigation.state.chapter, verses: navigation.state.verses, initialLoading: primaryLibrary.status === "loading", versesLoading: navigation.state.status === "loading", error: navigation.state.error || undefined, sectionRequest: navigationSectionRequest, scrollContainerRef: overlayContentRef, onBook: navigation.chooseBook, onChapter: navigation.chooseChapter, onVerse: (verse) => selectVerseReference({ bibleLanguage: primaryBibleLanguage, book: navigation.state.book, chapter: navigation.state.chapter, verse }, { recordHistory: true, prefetchedVerses: navigation.state.verses }) }}
          history={{ entries: history, loading: cloud.state.status === "loading" || cloud.state.status === "syncing", bibleLanguageOptions, onSelect: selectHistoryEntry, onRemove: removeHistory, onClear: clearHistory }}
          search={{ query: bibleSearch.query, status: bibleSearch.status, results: bibleSearch.results, inputRef: searchInputRef, onQueryChange: bibleSearch.setQuery, onSelect: selectSearchResult, bibleLanguageOptions, history: searchHistory.entries, historyLoading: cloud.state.status === "loading" || cloud.state.status === "syncing", onRecord: searchHistory.record, onRemoveHistory: searchHistory.remove, onClearHistory: searchHistory.clear }}
          profile={{ textScale, onTextScaleChange: (value) => updateSettings({ textScale: value }), verseFont, onVerseFontChange: (value) => updateSettings({ verseFont: value }), appearance, onAppearanceChange: (value) => updateSettings({ appearance: value }), primaryBibleLanguage, secondaryBibleLanguage, onPrimaryBibleLanguageChange: changeLanguage, onSecondaryBibleLanguageChange: changeSecondaryLanguage, bibleLanguageOptions, account: cloud.state, onSignIn: cloud.signIn, onSignOut: cloud.signOut }}
        />
      </FeatureOverlay>
    </div>
  );
}
