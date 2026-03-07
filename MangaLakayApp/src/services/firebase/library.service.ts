// src/services/firebase/library.service.ts
import firestore from '@react-native-firebase/firestore';
import {LibraryEntry} from '../../types/firebase.types';
import {LibraryStatus} from '../../types/mangadex.types';

type Unsubscribe = () => void;

export const libraryService = {
  /**
   * Récupère toute la bibliothèque d'un utilisateur.
   */
  async getLibrary(uid: string): Promise<LibraryEntry[]> {
    const snapshot = await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => doc.data() as LibraryEntry);
  },

  /**
   * Récupère une entrée spécifique de la bibliothèque.
   */
  async getLibraryEntry(
    uid: string,
    mangaId: string,
  ): Promise<LibraryEntry | null> {
    const doc = await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .get();

    return doc.exists ? (doc.data() as LibraryEntry) : null;
  },

  /**
   * Ajoute un manga à la bibliothèque.
   */
  async addToLibrary(
    uid: string,
    mangaId: string,
    status: LibraryStatus,
  ): Promise<void> {
    const now = firestore.Timestamp.now();
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

    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .set(entry);
  },

  /**
   * Met à jour le statut d'un manga dans la bibliothèque.
   * BR-013: changer de statut ne supprime pas la progression ni la note.
   */
  async updateStatus(
    uid: string,
    mangaId: string,
    status: LibraryStatus,
  ): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .update({status, updatedAt: firestore.Timestamp.now()});
  },

  /**
   * Retire un manga de la bibliothèque.
   * BR-007: la note est supprimée si le manga est retiré.
   */
  async removeFromLibrary(uid: string, mangaId: string): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .delete();
  },

  /**
   * Marque un chapitre comme lu.
   * BR-014: progression stockée localement ET synchronisée Firebase.
   */
  async markChapterRead(
    uid: string,
    mangaId: string,
    chapterId: string,
  ): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .update({
        chaptersRead: firestore.FieldValue.arrayUnion(chapterId),
        lastChapterRead: chapterId,
        lastReadAt: firestore.Timestamp.now(),
        updatedAt: firestore.Timestamp.now(),
      });
  },

  /**
   * Démarque un chapitre comme lu.
   */
  async unmarkChapterRead(
    uid: string,
    mangaId: string,
    chapterId: string,
  ): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .update({
        chaptersRead: firestore.FieldValue.arrayRemove(chapterId),
        updatedAt: firestore.Timestamp.now(),
      });
  },

  /**
   * Stream temps réel de la bibliothèque (synchronisation cross-device).
   */
  subscribeToLibrary(
    uid: string,
    callback: (entries: LibraryEntry[]) => void,
  ): Unsubscribe {
    return firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snapshot => {
        const entries = snapshot.docs.map(doc => doc.data() as LibraryEntry);
        callback(entries);
      });
  },
};
