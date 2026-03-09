// src/components/manga/MangaCardVertical.tsx
import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet, Image} from 'react-native';
import {Manga} from '../../types/mangadex.types';
import {getTitle} from '../../utils/locale';
import {colors, radius, spacing} from '../../constants/theme';

const ORIGIN_FLAG: Record<string, string> = {
  ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', 'zh-hk': '🇨🇳', fr: '🇫🇷',
};
const ORIGIN_CHIP: Record<string, {label: string; color: string}> = {
  ko: {label: 'MANHWA', color: colors.teal},
  zh: {label: 'MANHUA', color: colors.mango},
  'zh-hk': {label: 'MANHUA', color: colors.mango},
  fr: {label: 'BD FR', color: colors.orange},
};

interface MangaCardVerticalProps {
  manga: Manga;
  onPress: () => void;
  width?: number;
}

const MangaCardVertical = ({manga, onPress, width = 120}: MangaCardVerticalProps) => {
  const title = getTitle(manga.title);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, {width}]}>
      <View style={[styles.coverContainer, {width}]}>
        {manga.coverUrl ? (
          <Image
            source={{uri: manga.coverUrl}}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.placeholderText}>📖</Text>
          </View>
        )}
        {/* Badge statut */}
        {manga.status === 'ongoing' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>En cours</Text>
          </View>
        )}
        {/* Badge flag origine */}
        {ORIGIN_FLAG[manga.originalLanguage] && (
          <View style={styles.originFlag}>
            <Text style={styles.originFlagText}>
              {ORIGIN_FLAG[manga.originalLanguage]}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {/* Chip type */}
      {ORIGIN_CHIP[manga.originalLanguage] && (
        <View style={[
          styles.originChip,
          {backgroundColor: `${ORIGIN_CHIP[manga.originalLanguage]!.color}22`},
        ]}>
          <Text style={[
            styles.originChipText,
            {color: ORIGIN_CHIP[manga.originalLanguage]!.color},
          ]}>
            {ORIGIN_CHIP[manga.originalLanguage]!.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.s3,
  },
  coverContainer: {
    height: 170,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  placeholderText: {
    fontSize: 36,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: `${colors.orange}CC`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text100,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.s2,
    lineHeight: 16,
  },
  originFlag: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1,
  },
  originFlagText: { fontSize: 12 },
  originChip: {
    alignSelf: 'flex-start', borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2, marginTop: 3,
  },
  originChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
});

export default MangaCardVertical;
