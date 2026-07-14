import { useEffect, useState } from "react";
import type { CloudAccountState, CloudUser } from "../cloud/contracts";
import { Skeleton } from "./Skeleton";

function AccountAvatar({ user }: { user: CloudUser }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user.photoUrl]);
  return user.photoUrl && !failed
    ? <img src={user.photoUrl} alt="" width="56" height="56" referrerPolicy="no-referrer" loading="lazy" decoding="async" onError={() => setFailed(true)} />
    : <span className="account-avatar" aria-hidden="true">{user.displayName.slice(0, 1).toLocaleUpperCase()}</span>;
}

export function CloudAccountCard({ account, onSignIn, onSignOut }: { account: CloudAccountState; onSignIn: () => void; onSignOut: () => void }) {
  return <section className="account-card" aria-label="Cloud account" aria-busy={account.status === "loading" || account.status === "syncing" || undefined}>
    {account.status === "loading" ? <Skeleton rows={2} /> : account.user ? <>
      <AccountAvatar user={account.user} />
      <div><p className="eyebrow">Google account</p><h3>{account.user.displayName}</h3><p role="status" aria-live="polite">{account.status === "ready" ? "Settings and activity are synced." : account.status === "syncing" ? "Bringing cloud data up to date…" : account.message}</p></div>
      <button type="button" onClick={onSignOut}>Sign out</button>
    </> : <>
      <span className="account-avatar" aria-hidden="true">A</span>
      <div><p className="eyebrow">Cloud sync</p><h3>Keep your reader in sync</h3><p role="status" aria-live="polite">{account.message ?? "Sign in to sync settings, reading history, and search history."}</p></div>
      {account.status === "signed-out" && <button type="button" onClick={onSignIn}>Continue with Google</button>}
    </>}
  </section>;
}
