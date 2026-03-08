// src/screens/ranking/RankingScreen.tsx
import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import {ratingService} from '../../services/firebase/rating.service';
import {mangaService} from '../../services/mangadex/manga.service';
import {Manga} from '../../types/mangadex.types';
import {RankingItem} from '../../types/firebase.types';
import {EmptyState} from '../../components/ui';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {RankingStackParamList} from '../../types/navigation.types';
import {getTitle} from '../../utils/locale';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Period = 'weekly' | 'monthly' | 'alltime';

const PERIODS: {key: Period; label: string}[] = [
  {key: 'alltime', label: 'Tout temps'},
  {key: 'monthly', label: 'Ce mois'},
  {key: 'weekly',  label: 'Cette semaine'},
];

const MAIN_GENRES: {id: string; label: string}[] = [
  {id: 'action',   label: 'Action'},
  {id: 'romance',  label: 'Romance'},
  {id: 'fantasy',  label: 'Fantaisie'},
  {id: 'horror',   label: 'Horreur'},
  {id: 'comedy',   label: 'Comédie'},
  {id: 'sci-fi',   label: 'Sci-Fi'},
  {id: 'drama',    label: 'Drame'},
  {id: 'adventure',label: 'Aventure'},
];

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = [colors.mango, '#9CA3AF', '#CD7F32'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = ({style}: {style: any}) => (
  <View style={[{backgroundColor: colors.bgElevated, borderRadius: radius.sm}, style]} />
);

// ─── Podium ───────────────────────────────────────────────────────────────────

interface PodiumItemProps {
  rank: 1 | 2 | 3;
  item: RankingItem;
  manga: Manga | undefined;
}

const PODIUM_SIZES = {
  1: {cover: 80, coverH: 116, base: 60, border: colors.mango, shadow: 'rgba(255,209,102,0.4)'},
  2: {cover: 64, coverH: 92,  base: 44, border: '#9CA3AF',    shadow: 'rgba(156,163,175,0.2)'},
  3: {cover: 56, coverH: 80,  base: 32, border: '#CD7F32',    shadow: 'rgba(205,127,50,0.2)'},
};

const PodiumItem = ({rank, item, manga}: PodiumItemProps) => {
  const s = PODIUM_SIZES[rank];
  const title = manga ? getTitle(manga.title) : '...';

  return (
    <View style={styles.podiumItem}>
      <Text style={[styles.podiumMedal, rank === 1 && styles.podiumMedalBig]}>
        {MEDALS[rank - 1]}
      </Text>
      <View style={[
        styles.podiumCover,
        {width: s.cover, height: s.coverH, borderColor: s.border},
        rank === 1 && styles.podiumCoverGlow,
      ]}>
        {manga?.coverUrl ? (
          <Image source={{uri: manga.coverUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <SkeletonBox style={StyleSheet.absoluteFill} />
        )}
      </View>
      <Text style={styles.podiumName} numberOfLines={2}>{title}</Text>
      <Text style={[styles.podiumScore, {color: MEDAL_COLORS[rank - 1]}]}>
        ★ {item.averageRating.toFixed(1)}
      </Text>
      <View style={[
        styles.podiumBase,
        {height: s.base, borderColor: s.border + '50'},
      ]} />
    </View>
  );
};

// ─── Ligne classement ─────────────────────────────────────────────────────────

interface RankEntryProps {
  item: RankingItem;
  manga: Manga | undefined;
  onPress: () => void;
}

const RankEntry = ({item, manga, onPress}: RankEntryProps) => {
  const title = manga ? getTitle(manga.title) : item.mangaId;
  const author = manga?.authors[0]?.name ?? '';
  const genre = manga?.tags.find(t => t.group === 'genre');
  const genreLabel = genre ? (genre.name.fr ?? genre.name.en ?? '') : '';
  const status = manga?.status === 'ongoing' ? 'En cours' : manga?.status === 'completed' ? 'Terminé' : '';
  const meta = [author.split(' ').pop(), genreLabel, status].filter(Boolean).join(' · ');
  const isTop5 = item.rank <= 5;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.rankEntry}>
      <Text style={[styles.rankNum, isTop5 && styles.rankNumTop]}>{item.rank}</Text>
      {manga?.coverUrl ? (
        <Image source={{uri: manga.coverUrl}} style={styles.rankCover} resizeMode="cover" />
      ) : (
        <SkeletonBox style={styles.rankCover} />
      )}
      <View style={styles.rankInfo}>
        <Text style={styles.rankTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rankMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={styles.rankRight}>
        <View style={styles.rankScoreBadge}>
          <Text style={styles.rankScoreText}>★ {item.averageRating.toFixed(1)}</Text>
        </View>
        <Text style={styles.rankVotes}>{item.totalVotes} votes</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Écran principal ──────────────────────────────────────────────────────────

const RankingScreen = () => {
  const [period, setPeriod] = useState<Period>('alltime');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [mangaMap, setMangaMap] = useState<Record<string, Manga>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [genreModalVisible, setGenreModalVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ranking = await ratingService.getRanking(period);
        setItems(ranking);
        if (ranking.length > 0) {
          const ids = ranking.map(r => r.mangaId);
          const mangas = await mangaService.getMangaByIds(ids);
          const map: Record<string, Manga> = {};
          mangas.forEach(m => (map[m.id] = m));
          setMangaMap(map);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  // Filtre genre côté client : si mangaMap contient les données, filtrer
  const filteredItems = useMemo(() => {
    if (!selectedGenre) {
      return items;
    }
    const hasMangaData = Object.keys(mangaMap).length > 0;
    if (!hasMangaData) {
      return items;
    }
    return items.filter(item => {
      const manga = mangaMap[item.mangaId];
      if (!manga) {
        return true; // manga non chargé, inclure par défaut
      }
      return manga.tags.some(
        tag =>
          tag.group === 'genre' &&
          (tag.name.en?.toLowerCase() === selectedGenre ||
            tag.name.fr?.toLowerCase() === selectedGenre),
      );
    });
  }, [items, mangaMap, selectedGenre]);

  const handleSelectGenre = useCallback((genreId: string | null) => {
    setSelectedGenre(genreId);
    setGenreModalVisible(false);
  }, []);

  const activeGenreLabel = selectedGenre
    ? MAIN_GENRES.find(g => g.id === selectedGenre)?.label ?? selectedGenre
    : null;

  const top3 = filteredItems.slice(0, 3);
  const rest = filteredItems.slice(3);

  // Ordre podium visuel : 2, 1, 3
  const podiumOrder: Array<{rank: 1|2|3; item: RankingItem} | null> = [
    top3[1] ? {rank: 2, item: top3[1]} : null,
    top3[0] ? {rank: 1, item: top3[0]} : null,
    top3[2] ? {rank: 3, item: top3[2]} : null,
  ];

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Tablo Dònen 🏆</Text>
            <Text style={styles.subtitle}>Classement par la communauté MangaLakay</Text>
          </View>
          {/* Bouton filtre genre */}
          <TouchableOpacity
            style={[styles.genreButton, selectedGenre && styles.genreButtonActive]}
            onPress={() => setGenreModalVisible(true)}
            activeOpacity={0.75}>
            <Text style={[styles.genreButtonText, selectedGenre && styles.genreButtonTextActive]}>
              {activeGenreLabel ?? 'Genre'} ▼
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sélecteur période */}
        <View style={styles.periodTabs}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={[styles.periodTab, period === p.key && styles.periodTabActive]}>
              <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Modal filtre genre */}
      <Modal
        visible={genreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGenreModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setGenreModalVisible(false)}>
          <Pressable style={styles.genreModal} onPress={e => e.stopPropagation()}>
            <Text style={styles.genreModalTitle}>Filtrer par genre</Text>
            <TouchableOpacity
              style={[styles.genreOption, !selectedGenre && styles.genreOptionActive]}
              onPress={() => handleSelectGenre(null)}>
              <Text style={[styles.genreOptionText, !selectedGenre && styles.genreOptionTextActive]}>
                Tous les genres
              </Text>
            </TouchableOpacity>
            {MAIN_GENRES.map(genre => (
              <TouchableOpacity
                key={genre.id}
                style={[styles.genreOption, selectedGenre === genre.id && styles.genreOptionActive]}
                onPress={() => handleSelectGenre(genre.id)}>
                <Text
                  style={[
                    styles.genreOptionText,
                    selectedGenre === genre.id && styles.genreOptionTextActive,
                  ]}>
                  {genre.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? (
        <ScrollView contentContainerStyle={styles.skeletonContainer}>
          {/* Skeleton podium */}
          <View style={styles.podium}>
            {[64, 80, 56].map((w, i) => (
              <View key={`pod-skel-${i}`} style={styles.podiumItem}>
                <SkeletonBox style={{width: 28, height: 28, borderRadius: radius.full}} />
                <SkeletonBox style={{width: w, height: w * 1.45, borderRadius: radius.md}} />
                <SkeletonBox style={{width: w, height: 12, marginTop: 4}} />
              </View>
            ))}
          </View>
          {/* Skeleton rows */}
          {Array.from({length: 6}).map((_, i) => (
            <View key={`rank-skel-${i}`} style={styles.rankEntry}>
              <SkeletonBox style={{width: 28, height: 16}} />
              <SkeletonBox style={styles.rankCover} />
              <View style={{flex: 1, gap: 6}}>
                <SkeletonBox style={{height: 14, width: '70%'}} />
                <SkeletonBox style={{height: 11, width: '45%'}} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Kominote a ap grandi"
            subtitle="Pa gen ase not pou konpile yon klasman — rete la !"
          />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={item => item.mangaId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {/* Podium top 3 */}
              {top3.length > 0 && (
                <View style={styles.podium}>
                  {podiumOrder.map((entry, i) =>
                    entry ? (
                      <PodiumItem
                        key={entry.item.mangaId}
                        rank={entry.rank}
                        item={entry.item}
                        manga={mangaMap[entry.item.mangaId]}
                      />
                    ) : (
                      <View key={`empty-pod-${i}`} style={styles.podiumPlaceholder} />
                    ),
                  )}
                </View>
              )}

              {/* Titre suite */}
              {rest.length > 0 && (
                <Text style={styles.sectionLabel}>Suite du classement</Text>
              )}
            </>
          }
          renderItem={({item}) => (
            <RankEntry
              item={item}
              manga={mangaMap[item.mangaId]}
              onPress={() => {}}
            />
          )}
        />
      )}
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},

  header: {
    backgroundColor: '#120a1e',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.s4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.text100,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginTop: 2,
  },
  // Bouton genre
  genreButton: {
    marginTop: 6,
    paddingHorizontal: spacing.s3,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  genreButtonActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  genreButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
  },
  genreButtonTextActive: {color: colors.orange},
  // Modal genre
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  genreModal: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s6,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  genreModalTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s3,
  },
  genreOption: {
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.md,
    marginBottom: spacing.s1,
  },
  genreOptionActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
  },
  genreOptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text100,
  },
  genreOptionTextActive: {color: colors.orange},
  periodTabs: {
    flexDirection: 'row',
    gap: spacing.s2,
    marginBottom: spacing.s4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTabActive: {backgroundColor: colors.orange, borderColor: colors.orange},
  periodTabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
  },
  periodTabTextActive: {color: '#fff'},

  // Podium
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: 0,
  },
  podiumItem: {
    alignItems: 'center',
    gap: spacing.s2,
  },
  podiumPlaceholder: {width: 64},
  podiumMedal: {fontSize: 22},
  podiumMedalBig: {fontSize: 28},
  podiumCover: {
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
  },
  podiumCoverGlow: {
    shadowColor: colors.mango,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  podiumName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.text100,
    textAlign: 'center',
    maxWidth: 80,
    lineHeight: 15,
  },
  podiumScore: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  podiumBase: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },

  // Rank rows
  list: {paddingBottom: 90},
  rankEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankNum: {
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text60,
    width: 28,
    textAlign: 'center',
    flexShrink: 0,
  },
  rankNumTop: {color: colors.orange},
  rankCover: {
    width: 44,
    height: 64,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexShrink: 0,
  },
  rankInfo: {flex: 1, minWidth: 0},
  rankTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text100,
  },
  rankMeta: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text60,
    marginTop: 2,
  },
  rankRight: {alignItems: 'flex-end', gap: 4, flexShrink: 0},
  rankScoreBadge: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rankScoreText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: colors.orange,
  },
  rankVotes: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.text30,
  },

  // Skeleton / empty
  skeletonContainer: {paddingBottom: 90},
  emptyWrapper: {flex: 1},
});

export default RankingScreen;
