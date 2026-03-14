import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./config";

export async function uploadFile(path: string, file: File): Promise<string> {
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

export async function deleteFile(path: string): Promise<void> {
  const fileRef = storageRef(storage, path);
  return deleteObject(fileRef);
}

export { storageRef, getDownloadURL, storage };
