import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getDatabase, Database } from "firebase-admin/database";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminRtdb(): Database {
  return getDatabase(getAdminApp());
}

// Convenience accessors (lazily evaluated at call time, not module load time)
export const adminAuth = { createSessionCookie: (...args: Parameters<Auth["createSessionCookie"]>) => getAdminAuth().createSessionCookie(...args), verifySessionCookie: (...args: Parameters<Auth["verifySessionCookie"]>) => getAdminAuth().verifySessionCookie(...args), setCustomUserClaims: (...args: Parameters<Auth["setCustomUserClaims"]>) => getAdminAuth().setCustomUserClaims(...args), getUser: (...args: Parameters<Auth["getUser"]>) => getAdminAuth().getUser(...args), createUser: (...args: Parameters<Auth["createUser"]>) => getAdminAuth().createUser(...args), updateUser: (...args: Parameters<Auth["updateUser"]>) => getAdminAuth().updateUser(...args), deleteUser: (...args: Parameters<Auth["deleteUser"]>) => getAdminAuth().deleteUser(...args), };
export const adminDb = { collection: (...args: Parameters<Firestore["collection"]>) => getAdminDb().collection(...args), doc: (...args: Parameters<Firestore["doc"]>) => getAdminDb().doc(...args), collectionGroup: (...args: Parameters<Firestore["collectionGroup"]>) => getAdminDb().collectionGroup(...args), };
export const adminRtdb = { ref: (...args: Parameters<Database["ref"]>) => getAdminRtdb().ref(...args), };
