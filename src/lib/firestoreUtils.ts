import { getAdminDb } from "@/lib/firebase/admin";
import type { CollectionReference, DocumentData } from "firebase-admin/firestore";

/**
 * Deletes all documents in a Firestore collection reference in batches of 500.
 * Recurses until the collection is empty.
 */
export async function deleteCollection(
  collRef: CollectionReference<DocumentData>
): Promise<void> {
  const snapshot = await collRef.limit(500).get();
  if (snapshot.empty) return;
  const batch = getAdminDb().batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  if (snapshot.size === 500) await deleteCollection(collRef);
}
