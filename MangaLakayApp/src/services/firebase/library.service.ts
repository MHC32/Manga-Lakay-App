// src/services/firebase/library.service.ts
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from '@react-native-firebase/firestore';
import {LibraryEntry} from '../../types/firebase.types';
import {LibraryStatus} from '../../types/mangadex.types';

const db = getFirestore();

type Unsubscribe = () => void;

export const libraryService = {
  async getLibrary(uid: string): Promise<LibraryEntry[]> {
    const q = query(
      collection(db, 'users', uid, 'library'),
      orderBy('updatedAt', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: any) => d.data() as LibraryEntry);
  },

  async getLibraryEntry(uid: string, mangaId: string): Promise<LibraryEntry | null> {
    const snap = await getDoc(doc(db, 'users', uid, 'library', mangaId));
    return snap.exists() ? (snap.data() as LibraryEntry) : null;
  },

  async addToLibrary(uid: string, mangaId: string, status: LibraryStatus): Promise<void> {
    const now = Timestamp.now();
    const entry: LibraryEntry = {
      mangaId,
      status,
      userRating: null,
      chaptersRead: [],
      lastChapterRead: null,
      lastReadAt: null,
      addedAt: now,
      updatedAt: now,
    };
    await setDoc(doc(db, 'users', uid, 'library', mangaId), entry);
  },

  async updateStatus(uid: string, mangaId: string, status: LibraryStatus): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'library', mangaId), {
      status,
      updatedAt: Timestamp.now(),
    });
  },

  async removeFromLibrary(uid: string, mangaId: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'library', mangaId));
  },

  async markChapterRead(uid: string, mangaId: string, chapterId: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'library', mangaId), {
      chaptersRead: arrayUnion(chapterId),
      lastChapterRead: chapterId,
      lastReadAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  },

  async unmarkChapterRead(uid: string, mangaId: string, chapterId: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid, 'library', mangaId), {
      chaptersRead: arrayRemove(chapterId),
      updatedAt: Timestamp.now(),
    });
  },

  subscribeToLibrary(uid: string, callback: (entries: LibraryEntry[]) => void): Unsubscribe {
    const q = query(
      collection(db, 'users', uid, 'library'),
      orderBy('updatedAt', 'desc'),
    );
    return onSnapshot(q, snapshot => {
      const entries = snapshot.docs.map((d: any) => d.data() as LibraryEntry);
      callback(entries);
    });
  },
};
