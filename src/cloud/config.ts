export type FirebaseClientConfig = Readonly<{
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}>;

const bounded = (value: unknown, maximum = 200) => typeof value === "string" && value.length > 0 && value.length <= maximum ? value : null;

export function readFirebaseClientConfig(environment: ImportMetaEnv = import.meta.env): FirebaseClientConfig | null {
  const apiKey = bounded(environment.VITE_FIREBASE_API_KEY);
  const authDomain = bounded(environment.VITE_FIREBASE_AUTH_DOMAIN);
  const projectId = bounded(environment.VITE_FIREBASE_PROJECT_ID);
  const appId = bounded(environment.VITE_FIREBASE_APP_ID);
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  if (!/^[a-z0-9.-]+$/i.test(authDomain) || !/^[a-z0-9-]+$/i.test(projectId)) return null;
  return { apiKey, authDomain, projectId, appId };
}
