import type { CloudGateway, CloudSnapshot, CloudUser } from "./contracts";
import type { FirebaseClientConfig } from "./config";
import { cloudDocumentPatch, migrateCloudDocument } from "./migration";
import { errorCode, withBackoff } from "./retry";

function safePhotoUrl(value: string | null): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com")) ? url.href : null;
  } catch { return null; }
}

export async function createFirebaseGateway(config: FirebaseClientConfig): Promise<CloudGateway> {
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import("firebase/app"), import("firebase/auth"), import("firebase/firestore"),
  ]);
  const app = appModule.getApps().find(({ name }) => name === "awmpc-bible") ?? appModule.initializeApp(config, "awmpc-bible");
  const auth = authModule.getAuth(app);
  const database = firestoreModule.getFirestore(app);
  const provider = new authModule.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  void authModule.getRedirectResult(auth).catch(() => undefined);

  const user = (candidate: typeof auth.currentUser): CloudUser | null => candidate ? {
    uid: candidate.uid,
    displayName: candidate.displayName?.trim().slice(0, 120) || "Google account",
    photoUrl: safePhotoUrl(candidate.photoURL),
  } : null;

  return {
    observeAuth(listener) {
      return authModule.onAuthStateChanged(auth, (candidate) => listener(user(candidate)), () => listener(null));
    },
    async signIn() {
      try { await authModule.signInWithPopup(auth, provider); } catch (error) {
        const code = errorCode(error);
        if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
          await authModule.signInWithRedirect(auth, provider);
          return;
        }
        throw error;
      }
    },
    async signOut() { await authModule.signOut(auth); },
    hydrate(uid, local, signal) {
      return withBackoff(() => firestoreModule.runTransaction(database, async (transaction) => {
        const reference = firestoreModule.doc(database, "users", uid);
        const current = await transaction.get(reference);
        const merged = migrateCloudDocument(current.exists() ? current.data() : null, local);
        transaction.set(reference, cloudDocumentPatch(merged, firestoreModule.serverTimestamp()), { merge: true });
        return merged;
      }), signal);
    },
    save(uid, snapshot, signal) {
      return withBackoff(() => firestoreModule.setDoc(
        firestoreModule.doc(database, "users", uid),
        cloudDocumentPatch(snapshot, firestoreModule.serverTimestamp()),
        { merge: true },
      ), signal);
    },
  };
}
