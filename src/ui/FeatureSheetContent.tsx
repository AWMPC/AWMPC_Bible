import type { RefObject } from "react";
import type { Book, Verse } from "../data/contracts";
import type { CloudAccountState } from "../cloud/contracts";
import type { HistoryEntry } from "../history/HistoryStore";
import type { BibleLanguage } from "../settings/bibleLanguage";
import type { BibleLanguageOption } from "../data/languages";
import type { TextScale } from "../settings/textScale";
import type { VerseFont } from "../settings/verseFont";
import type { Appearance } from "../settings/appearance";
import type { BibleSearchStatus, LocalizedSearchResult } from "../search/useBibleSearch";
import { HistoryPanel } from "./HistoryPanel";
import { NavigationPanel } from "./NavigationPanel";
import { ProfilePanel } from "./ProfilePanel";
import { SearchPanel } from "./SearchPanel";
import { Skeleton } from "./Skeleton";
import type { FeatureId } from "./features";
import type { NavigationSectionRequest } from "./navigationTarget";

type FeatureSheetContentProps = {
  activeFeature: FeatureId | null;
  navigation: {
    books: Book[];
    secondaryBooks: Book[];
    secondaryLanguage: BibleLanguage | null;
    book: string;
    chapters: string[];
    chapter: string;
    verses: Verse[];
    initialLoading: boolean;
    versesLoading: boolean;
    error?: string;
    sectionRequest: NavigationSectionRequest | null;
    scrollContainerRef: RefObject<HTMLElement | null>;
    onBook: (book: string) => void;
    onChapter: (chapter: string) => void;
    onVerse: (verse: string) => void;
  };
  history: {
    entries: HistoryEntry[];
    loading: boolean;
    bibleLanguageOptions: ReadonlyArray<BibleLanguageOption>;
    onSelect: (entry: HistoryEntry) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
  };
  search: {
    query: string;
    status: BibleSearchStatus;
    results: LocalizedSearchResult[];
    inputRef: RefObject<HTMLInputElement | null>;
    bibleLanguageOptions: ReadonlyArray<BibleLanguageOption>;
    onQueryChange: (query: string) => void;
    onSelect: (result: LocalizedSearchResult) => void;
    history: string[];
    historyLoading: boolean;
    onRecord: (query: string) => void;
    onRemoveHistory: (query: string) => void;
    onClearHistory: () => void;
  };
  profile: {
    textScale: TextScale;
    onTextScaleChange: (value: TextScale) => void;
    verseFont: VerseFont;
    onVerseFontChange: (value: VerseFont) => void;
    appearance: Appearance;
    onAppearanceChange: (value: Appearance) => void;
    primaryBibleLanguage: BibleLanguage;
    secondaryBibleLanguage: BibleLanguage | null;
    onPrimaryBibleLanguageChange: (value: BibleLanguage) => void;
    onSecondaryBibleLanguageChange: (value: BibleLanguage | null) => void;
    bibleLanguageOptions: ReadonlyArray<BibleLanguageOption>;
    account: CloudAccountState;
    onSignIn: () => void;
    onSignOut: () => void;
  };
};

export function FeatureSheetContent({ activeFeature, navigation, history, search, profile }: FeatureSheetContentProps) {
  if (activeFeature === "navigation") {
    return <NavigationPanel books={navigation.books} secondaryBooks={navigation.secondaryBooks} secondaryLanguage={navigation.secondaryLanguage} book={navigation.book} chapters={navigation.chapters} chapter={navigation.chapter} verses={navigation.verses} initialLoading={navigation.initialLoading} versesLoading={navigation.versesLoading} error={navigation.error} sectionRequest={navigation.sectionRequest} scrollContainerRef={navigation.scrollContainerRef} onBook={navigation.onBook} onChapter={navigation.onChapter} onVerse={navigation.onVerse} />;
  }
  if (activeFeature === "history") {
    return history.loading ? <Skeleton rows={5} text /> : <HistoryPanel entries={history.entries} bibleLanguageOptions={history.bibleLanguageOptions} onSelect={history.onSelect} onRemove={history.onRemove} onClear={history.onClear} />;
  }
  if (activeFeature === "search") {
    return <SearchPanel query={search.query} status={search.status} results={search.results} inputRef={search.inputRef} onQueryChange={search.onQueryChange} onSelect={search.onSelect} bibleLanguageOptions={search.bibleLanguageOptions} history={search.history} historyLoading={search.historyLoading} onRecord={search.onRecord} onRemoveHistory={search.onRemoveHistory} onClearHistory={search.onClearHistory} />;
  }
  if (activeFeature === "profile") {
    return <ProfilePanel {...profile} />;
  }
  return null;
}
