// src/services/firebase/rating.service.ts
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from '@react-native-firebase/firestore';
import {CommunityRating, RankingDocument, RankingItem} from '../../types/firebase.types';
import {MIN_VOTES_FOR_SCORE} from '../../constants/config';

const db = getFirestore();

export const ratingService = {
  async submitRating(uid: string, mangaId: string, rating: number): Promise<void> {
    const now = Timestamp.now();
    await setDoc(doc(db, 'ratings', mangaId, 'votes', uid), {
      userId: uid,
      mangaId,
      rating: Math.round(rating),
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateRating(uid: string, mangaId: string, rating: number): Promise<void> {
    await updateDoc(doc(db, 'ratings', mangaId, 'votes', uid), {
      rating: Math.round(rating),
      updatedAt: Timestamp.now(),
    });
    await updateDoc(doc(db, 'users', uid, 'library', mangaId), {
      userRating: Math.round(rating),
      updatedAt: Timestamp.now(),
    });
  },

  async deleteRating(uid: string, mangaId: string): Promise<void> {
    await deleteDoc(doc(db, 'ratings', mangaId, 'votes', uid));
  },

  async getUserRating(uid: string, mangaId: string): Promise<number | null> {
    const snap = await getDoc(doc(db, 'ratings', mangaId, 'votes', uid));
    return snap.exists() ? (snap.data() as {rating: number}).rating : null;
  },

  async getCommunityRating(mangaId: string): Promise<CommunityRating | null> {
    const snap = await getDoc(doc(db, 'ratings', mangaId));
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data() as CommunityRating;
    if (data.totalVotes < MIN_VOTES_FOR_SCORE) {
      return null;
    }
    return data;
  },

  async getRanking(period: 'weekly' | 'monthly' | 'alltime'): Promise<RankingItem[]> {
    const snap = await getDoc(doc(db, 'rankings', period));
    if (!snap.exists()) {
      return [];
    }
    const data = snap.data() as RankingDocument;
    return data.items ?? [];
  },
};
