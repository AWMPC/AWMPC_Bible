export function lockDocumentScroll(): () => void {
  const root = document.documentElement;
  const body = document.body;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const rootOverscroll = root.style.overscrollBehavior;
  const bodyStyle = {
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);

  root.style.overscrollBehavior = "none";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = `-${scrollX}px`;
  body.style.width = "100%";
  body.style.overflow = "hidden";
  if (scrollbarWidth) body.style.paddingRight = `${scrollbarWidth}px`;

  let locked = true;
  return () => {
    if (!locked) return;
    locked = false;
    root.style.overscrollBehavior = rootOverscroll;
    Object.assign(body.style, bodyStyle);
    window.scrollTo(scrollX, scrollY);
  };
}
