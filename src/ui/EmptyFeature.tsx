export function EmptyFeature({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-feature"><span aria-hidden="true" /><h3>{title}</h3><p>{detail}</p></div>;
}
