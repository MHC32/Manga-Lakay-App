// src/components/manga/MangaCardVertical.tsx
import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet, Image} from 'react-native';
import {Manga} from '../../types/mangadex.types';
import {getTitle} from '../../utils/locale';
import {colors, radius, spacing} from '../../constants/theme';

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
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
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
});

export default MangaCardVertical;
