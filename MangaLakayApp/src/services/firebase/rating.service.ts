// src/services/firebase/rating.service.ts
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from '@react-native-firebase/firestore';
import {CommunityRating, RankingItem} from '../../types/firebase.types';
import {MIN_VOTES_FOR_SCORE} from '../../constants/config';
import {cacheService} from '../cache/cache.service';

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
    // Cache MMKV 24h (même classement pour toutes les périodes en beta)
    const cacheKey = `ranking:${period}`;
    const cached = cacheService.get<RankingItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Lire tous les documents agrégats depuis ratings/
    const snapshot = await getDocs(collection(db, 'ratings'));

    type RatingDoc = CommunityRating & {id: string};
    const allDocs: RatingDoc[] = snapshot.docs.map((d: any) => ({
      id: d.id as string,
      ...(d.data() as CommunityRating),
    }));

    const items: Array<Omit<RankingItem, 'rank'>> = allDocs
      // Minimum 5 votes (BR-008)
      .filter((data: RatingDoc) => data.totalVotes >= MIN_VOTES_FOR_SCORE && data.averageRating > 0)
      .map((data: RatingDoc) => ({
        mangaId: data.id,
        averageRating: data.averageRating,
        totalVotes: data.totalVotes,
      }));

    // Trier par note desc, ex-aequo par totalVotes desc (BR-009)
    items.sort((a, b) =>
      b.averageRating !== a.averageRating
        ? b.averageRating - a.averageRating
        : b.totalVotes - a.totalVotes,
    );

    // Top 50 avec rang
    const result: RankingItem[] = items.slice(0, 50).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    cacheService.set(cacheKey, result, 24); // Cache 24h
    return result;
  },
};
