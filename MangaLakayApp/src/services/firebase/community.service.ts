// src/services/firebase/community.service.ts
import firestore from '@react-native-firebase/firestore';

interface CommunityData {
  topManga: {mangaId: string; readersCount: number}[];
  activeUsersCount: number;
  updatedAt?: any;
}

export const communityService = {
  async getReadingNow(): Promise<CommunityData | null> {
    try {
      const snap = await firestore()
        .collection('community_stats')
        .doc('reading_now')
        .get();
      return snap.exists() ? (snap.data() as CommunityData) : null;
    } catch {
      return null;
    }
  },
};
