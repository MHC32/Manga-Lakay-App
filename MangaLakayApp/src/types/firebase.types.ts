// src/types/firebase.types.ts
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { LibraryStatus } from './mangadex.types';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  country: string;
  favoriteGenres: string[];
  isPublic: boolean;
  isLibraryPublic: boolean;
  isEmailVerified: boolean;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  lastActiveAt: FirebaseFirestoreTypes.Timestamp;
}

export interface LibraryEntry {
  mangaId: string;
  status: LibraryStatus;
  userRating: number | null;
  chaptersRead: string[];
  lastChapterRead: string | null;
  lastReadAt: FirebaseFirestoreTypes.Timestamp | null;
  addedAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface CommunityRating {
  mangaId: string;
  averageRating: number;
  totalVotes: number;
  sumRatings: number;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
}

export interface RankingItem {
  mangaId: string;
  averageRating: number;
  totalVotes: number;
  rank: number;
}

export interface RankingDocument {
  generatedAt: FirebaseFirestoreTypes.Timestamp;
  ttlHours: number;
  items: RankingItem[];
}

export interface CommunityStats {
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  activeUsersCount: number;
  topManga: Array<{
    mangaId: string;
    readersCount: number;
  }>;
}
