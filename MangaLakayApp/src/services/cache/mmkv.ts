// src/services/cache/mmkv.ts
import {MMKV} from 'react-native-mmkv';

// Instance singleton MMKV
export const storage = new MMKV({
  id: 'mangalakay-cache',
});

// Helpers bas niveau
export const mmkv = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),
  delete: (key: string): void => storage.delete(key),
  getAllKeys: (): string[] => storage.getAllKeys(),
  contains: (key: string): boolean => storage.contains(key),
  clearAll: (): void => storage.clearAll(),
};
