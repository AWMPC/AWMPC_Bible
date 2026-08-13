# History Verse Previews Design

## Goal

Show a concise preview of each saved verse beneath its reference in the History modal without adding Bible text to persisted or synced history.

## User experience

Each history entry remains one selectable button. Its reference and language label stay on the first line; a single, truncated verse preview is shown as subdued subtext before the visit timestamp. While a preview is resolving, the subtext uses the existing compact skeleton treatment. If the local dataset cannot provide a matching verse, the button stays usable and omits the preview rather than showing an error message.

## Data boundary

`HistoryEntry` continues to contain only its identifier, language, book, chapter, verse, and visit timestamp. Verse text is resolved only while the History modal is mounted, from local Bible datasets. It is neither written to local storage nor included in cloud-history synchronization.

## Architecture

Add a focused preview resolver owned by the History panel. It accepts the current history entries and returns a keyed, transient preview state for each entry. It loads only the language datasets represented by the visible entries, honors cancellation when the panel closes or entries change, and reuses the existing bounded, retrying dataset request path. A small in-memory cache is scoped to the mounted panel so repeated rows or rerenders do not repeat work.

The resolver extracts only the requested chapter and verse from validated local dataset content. Malformed, missing, or unavailable data produces an empty preview state; it must never block selection, throw into the modal, or persist data.

## Rendering and accessibility

The history button groups the reference, preview, and timestamp as one accessible control. Preview text uses the entry language as its `lang` attribute and is visually constrained to one line with ellipsis. The skeleton is marked decorative so it does not create noisy announcements. Existing remove and clear actions retain their current labels and behavior.

## Error handling and lifecycle

Preview loading runs independently from the already-loaded history list. Requests use the existing graceful retry/backoff behavior and are aborted on unmount or when the entry set changes. State updates are generation-guarded after cancellation. A failure affects only the missing preview; all history actions continue to work.

## Testing

Unit coverage will verify that the resolver maps entries to matching verse text, ignores invalid or missing verse data, and does not introduce preview fields into persisted history normalization. UI coverage will verify ready previews, loading skeleton subtext, unavailable-data fallback, and that selecting an entry still invokes its existing callback.

## Scope

This change does not alter the History store schema, cloud synchronization payload, search results, verse navigation, or retained Bible dataset format.
