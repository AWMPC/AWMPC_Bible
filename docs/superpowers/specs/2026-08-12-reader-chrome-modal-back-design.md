# Reader Chrome, Modal Back, and Verse Indicator Design

## Goal

Make browser and device Back close an open feature sheet before allowing the
browser to leave the reader. Keep the top reading-location controls and bottom
tool dock governed by one clear visibility model after every navigation path.
Replace the selected-verse glow with a thin left-side pill indicator.

## Architecture

Introduce one reader-chrome visibility controller. It owns the durable reader
visibility state (`visible` or `hidden`) and is the only source used by both
floating control groups. Trusted reader scrolling and a trusted tap on reading
content are its only state-changing inputs. Feature sheets suppress reader
interaction while open; they do not reset, override, or otherwise mutate the
controller's state. Closing a sheet resumes the retained state immediately.

Feature-sheet history is managed independently from reader chrome. Opening a
sheet adds a same-document history entry that represents the open overlay.
`popstate` closes that overlay and consumes the entry. Close controls, Escape,
and shade clicks remove the overlay entry without causing a duplicate close.
When no overlay is open, Back retains normal browser behavior.

## Behavior

- Opening a dock sheet or either top navigation sheet makes the feature overlay
  active and creates one overlay history entry.
- Browser/device Back closes the active overlay, returns focus to its trigger,
  and leaves the reader page active.
- Any other overlay close path removes its own history entry and leaves no
  stale overlay state behind.
- Selecting a book, chapter, verse, history entry, or search result may scroll
  the reader programmatically, but it must not force either floater visible.
- After the overlay closes, the top controls and bottom dock both render from
  the preserved controller state. A subsequent trusted scroll auto-hides or
  reveals both together; a trusted reader tap toggles both together.
- A selected verse receives a temporary thin left-side pill. The pill has no
  layout impact, is accessible-neutral, and does not obscure the verse text.
  Reduced-motion mode renders the static selected state without animation.

## Testing

- Unit-test the chrome controller transition rules, including overlay
  suppression without visibility reset.
- Add browser coverage for Back closing a dock sheet and a top navigation
  sheet, while normal Back remains available without a sheet.
- Add browser coverage proving top and bottom navigation do not leave their
  associated floater permanently visible after a normal reader scroll.
- Assert the selected verse uses the left pill indicator and no longer applies
  the full-card glow.

## Non-goals

- This does not add application-wide route history or change chapter/verse URL
  semantics.
- It does not create separate visibility preferences for the top and bottom
  controls.
