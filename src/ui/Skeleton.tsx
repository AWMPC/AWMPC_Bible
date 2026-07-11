export function Skeleton({ rows, text = false }: { rows: number; text?: boolean }) {
  return (
    <div className={text ? "skeleton text-skeleton" : "skeleton"} aria-label="Loading text" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => <span key={index} />)}
    </div>
  );
}
