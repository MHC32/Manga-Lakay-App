// src/services/firebase/user.service.ts
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  limit,
  Timestamp,
} from '@react-native-firebase/firestore';
import {UserProfile} from '../../types/firebase.types';
import {sanitizeBio} from '../../utils/sanitize';

const db = getFirestore();

export const userService = {
  async createProfile(uid: string, email: string, username: string): Promise<void> {
    const now = Timestamp.now();
    await setDoc(doc(db, 'users', uid), {
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
    });
  },

  async getProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      return null;
    }
    return {uid: snap.id, ...snap.data()} as UserProfile;
  },

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username.toLowerCase()),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    const snap = snapshot.docs[0];
    return {uid: snap.id, ...snap.data()} as UserProfile;
  },

  async isUsernameAvailable(username: string): Promise<boolean> {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username.toLowerCase()),
      limit(1),
    );
    const snapshot = await getDocs(q);
    return snapshot.empty;
  },

  async updateProfile(
    uid: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarUrl' | 'avatarEmoji' | 'country' | 'favoriteGenres' | 'isPublic' | 'isLibraryPublic'>>,
  ): Promise<void> {
    const sanitized = {
      ...updates,
      ...(updates.bio !== undefined && {bio: sanitizeBio(updates.bio)}),
      updatedAt: Timestamp.now(),
    };
    await updateDoc(doc(db, 'users', uid), sanitized);
  },

  async updateLastActive(uid: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {lastActiveAt: Timestamp.now()});
  },

  async updateFavoriteGenres(uid: string, genres: string[]): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      favoriteGenres: genres,
      updatedAt: Timestamp.now(),
    });
  },
};
