// src/services/firebase/user.service.ts
import firestore from '@react-native-firebase/firestore';
import {UserProfile} from '../../types/firebase.types';
import {sanitizeBio} from '../../utils/sanitize';

export const userService = {
  /**
   * Crée un profil utilisateur dans Firestore lors de l'inscription.
   */
  async createProfile(
    uid: string,
    email: string,
    username: string,
  ): Promise<void> {
    const now = firestore.Timestamp.now();
    const profile: Omit<UserProfile, 'updatedAt'> & {updatedAt: typeof now} = {
      uid,
      email,
      username: username.toLowerCase(),
      displayName: username,
      bio: '',
      avatarUrl: null,
      avatarEmoji: '🌺',
      country: 'HT',
      favoriteGenres: [],
      isPublic: true,
      isLibraryPublic: true,
      isEmailVerified: false,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
    };

    await firestore().collection('users').doc(uid).set(profile);
  },

  /**
   * Récupère un profil utilisateur par UID.
   */
  async getProfile(uid: string): Promise<UserProfile | null> {
    const doc = await firestore().collection('users').doc(uid).get();
    if (!doc.exists) {
      return null;
    }
    return {uid: doc.id, ...doc.data()} as UserProfile;
  },

  /**
   * Récupère un profil par username (pour les profils publics).
   */
  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const snapshot = await firestore()
      .collection('users')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {uid: doc.id, ...doc.data()} as UserProfile;
  },

  /**
   * Vérifie qu'un username est disponible (BR-005: unicité insensible à la casse).
   */
  async isUsernameAvailable(username: string): Promise<boolean> {
    const snapshot = await firestore()
      .collection('users')
      .where('username', '==', username.toLowerCase())
      .limit(1)
      .get();
    return snapshot.empty;
  },

  /**
   * Met à jour le profil utilisateur.
   * BR-019: sanitisation de la bio côté client.
   */
  async updateProfile(
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarUrl' | 'avatarEmoji' | 'country' | 'favoriteGenres' | 'isPublic' | 'isLibraryPublic'>>,
  ): Promise<void> {
    const sanitized = {
      ...updates,
      ...(updates.bio !== undefined && {bio: sanitizeBio(updates.bio)}),
      updatedAt: firestore.Timestamp.now(),
    };

    await firestore().collection('users').doc(uid).update(sanitized);
  },

  /**
   * Met à jour lastActiveAt pour le calcul des utilisateurs actifs (BR-020).
   */
  async updateLastActive(uid: string): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .update({lastActiveAt: firestore.Timestamp.now()});
  },

  /**
   * Met à jour les genres favoris (sélection initiale post-inscription).
   */
  async updateFavoriteGenres(uid: string, genres: string[]): Promise<void> {
    await firestore()
      .collection('users')
      .doc(uid)
      .update({
        favoriteGenres: genres,
        updatedAt: firestore.Timestamp.now(),
      });
  },
};
