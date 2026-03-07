// src/services/cache/mmkv.ts
import {createMMKV} from 'react-native-mmkv';

// Instance singleton MMKV (API v4 NitroModules)
export const storage = createMMKV({id: 'mangalakay-cache'});

export const mmkv = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),
  delete: (key: string): void => { storage.remove(key); },
  getAllKeys: (): string[] => storage.getAllKeys(),
  contains: (key: string): boolean => storage.contains(key),
  clearAll: (): void => storage.clearAll(),
};
