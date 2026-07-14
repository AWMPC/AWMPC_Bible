import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { overflowMarqueeMetrics } from "./marqueeMetrics";

export function OverflowMarquee({ children, className = "" }: { children: ReactNode; className?: string }) {
  const viewportRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState(() => overflowMarqueeMetrics(0, 0));

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const next = overflowMarqueeMetrics(viewport.clientWidth, track.scrollWidth);
      setMetrics((current) => current.distance === next.distance && current.duration === next.duration ? current : next);
    };
    const scheduleMeasure = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);
    observer?.observe(viewport);
    observer?.observe(track);
    scheduleMeasure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [children]);

  const style = metrics.overflowing ? {
    "--marquee-distance": `${metrics.distance}px`,
    "--marquee-duration": `${metrics.duration}s`,
  } as CSSProperties : undefined;
  return (
    <span ref={viewportRef} className={`overflow-marquee${className ? ` ${className}` : ""}`} data-overflow={metrics.overflowing || undefined} style={style}>
      <span ref={trackRef} className="overflow-marquee-track">{children}</span>
    </span>
  );
}
