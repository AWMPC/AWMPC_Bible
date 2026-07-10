export function lockDocumentScroll(): () => void {
  const root = document.documentElement;
  const body = document.body;
  const rootOverflow = root.style.overflow;
  const rootOverscroll = root.style.overscrollBehavior;
  const bodyOverflow = body.style.overflow;

  root.style.overflow = "hidden";
  root.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";

  let locked = true;
  return () => {
    if (!locked) return;
    locked = false;
    root.style.overflow = rootOverflow;
    root.style.overscrollBehavior = rootOverscroll;
    body.style.overflow = bodyOverflow;
  };
}
