// src/services/firebase/rating.service.ts
import firestore from '@react-native-firebase/firestore';
import {CommunityRating, RankingDocument, RankingItem} from '../../types/firebase.types';
import {MIN_VOTES_FOR_SCORE} from '../../constants/config';

export const ratingService = {
  /**
   * Soumet une note pour un manga.
   * BR-007: must avoir le manga dans sa bibliothèque (vérifié côté UI).
   * BR-007: échelle 1-10, entiers uniquement.
   */
  async submitRating(
    uid: string,
    mangaId: string,
    rating: number,
  ): Promise<void> {
    const now = firestore.Timestamp.now();
    await firestore()
      .collection('ratings')
      .doc(mangaId)
      .collection('votes')
      .doc(uid)
      .set({
        userId: uid,
        mangaId,
        rating: Math.round(rating), // entiers uniquement
        createdAt: now,
        updatedAt: now,
      });
  },

  /**
   * Met à jour une note existante.
   * BR-007: la note est modifiable à tout moment.
   */
  async updateRating(
    uid: string,
    mangaId: string,
    rating: number,
  ): Promise<void> {
    await firestore()
      .collection('ratings')
      .doc(mangaId)
      .collection('votes')
      .doc(uid)
      .update({
        rating: Math.round(rating),
        updatedAt: firestore.Timestamp.now(),
      });

    // Mettre aussi à jour dans la bibliothèque
    await firestore()
      .collection('users')
      .doc(uid)
      .collection('library')
      .doc(mangaId)
      .update({
        userRating: Math.round(rating),
        updatedAt: firestore.Timestamp.now(),
      });
  },

  /**
   * Supprime une note.
   */
  async deleteRating(uid: string, mangaId: string): Promise<void> {
    await firestore()
      .collection('ratings')
      .doc(mangaId)
      .collection('votes')
      .doc(uid)
      .delete();
  },

  /**
   * Récupère la note d'un utilisateur pour un manga.
   */
  async getUserRating(uid: string, mangaId: string): Promise<number | null> {
    const doc = await firestore()
      .collection('ratings')
      .doc(mangaId)
      .collection('votes')
      .doc(uid)
      .get();

    return doc.exists ? (doc.data() as {rating: number}).rating : null;
  },

  /**
   * Récupère le score communautaire MangaKay pour un manga.
   * BR-008: minimum 5 notes requises pour afficher un score.
   */
  async getCommunityRating(mangaId: string): Promise<CommunityRating | null> {
    const doc = await firestore().collection('ratings').doc(mangaId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as CommunityRating;
    if (data.totalVotes < MIN_VOTES_FOR_SCORE) {
      return null; // Pas assez de votes
    }

    return data;
  },

  /**
   * Récupère le classement communautaire.
   * BR-009: tri par score desc, puis par votes desc en cas d'égalité.
   */
  async getRanking(
    period: 'weekly' | 'monthly' | 'alltime',
  ): Promise<RankingItem[]> {
    const doc = await firestore().collection('rankings').doc(period).get();

    if (!doc.exists) {
      return [];
    }

    const data = doc.data() as RankingDocument;
    return data.items ?? [];
  },
};
