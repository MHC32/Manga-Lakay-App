// src/screens/library/LibraryScreen.tsx
import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {LibraryStatus, Manga} from '../../types/mangadex.types';
import {LibraryEntry} from '../../types/firebase.types';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {EmptyState} from '../../components/ui';
import {mangaService} from '../../services/mangadex/manga.service';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {ProfileStackParamList} from '../../types/navigation.types';
import {getTitle} from '../../utils/locale';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type NavProp = StackNavigationProp<ProfileStackParamList, 'LibraryMain'>;

type ViewMode = 'list' | 'grid';

const TABS: {key: LibraryStatus; label: string; emptyTitle: string; emptyBody: string; emptyEmoji: string; ctaLabel?: string}[] = [
  {
    key: 'reading',
    label: 'En cours',
    emptyEmoji: '📖',
    emptyTitle: 'Kòmanse li kounye a !',
    emptyBody: "Tu n'as aucun manga en cours de lecture. Lance-toi, il y a des milliers d'histoires qui t'attendent !",
    ctaLabel: 'Découvrir des mangas',
  },
  {
    key: 'completed',
    label: 'Terminé',
    emptyEmoji: '🏁',
    emptyTitle: 'Aucun manga terminé',
    emptyBody: 'Quand tu finiras un manga, il apparaîtra ici. Continue la lecture !',
  },
  {
    key: 'plan_to_read',
    label: 'Planifié',
    emptyEmoji: '🔖',
    emptyTitle: 'Ta liste de souhaits est vide',
    emptyBody: 'Ajoute des mangas à ta liste "Planifié" pour ne rien oublier de lire.',
    ctaLabel: 'Parcourir le catalogue',
  },
  {
    key: 'dropped',
    label: 'Abandonné',
    emptyEmoji: '🎉',
    emptyTitle: 'Aucun abandon !',
    emptyBody: "Félicitations, tu n'as abandonné aucun manga. Continue comme ça !",
  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = ({style}: {style: any}) => (
  <View style={[{backgroundColor: colors.bgElevated, borderRadius: radius.sm}, style]} />
);

// ─── List Item ────────────────────────────────────────────────────────────────

interface ListItemProps {
  entry: LibraryEntry;
  manga: Manga | undefined;
  onPress: () => void;
  onPlayPress: () => void;
}

const ListItem = ({entry, manga, onPress, onPlayPress}: ListItemProps) => {
  const title = manga ? getTitle(manga.title) : entry.mangaId;
  const totalChapters = manga?.lastChapter ? parseInt(manga.lastChapter, 10) : null;
  const readCount = entry.chaptersRead.length;
  const progress = totalChapters && totalChapters > 0 ? Math.min(readCount / totalChapters, 1) : 0;
  const progressPct = Math.round(progress * 100);

  const genre = manga?.tags.find(t => t.group === 'genre');
  const genreLabel = genre ? (genre.name.fr ?? genre.name.en ?? '') : '';
  const status = manga?.status === 'ongoing' ? 'En cours' : manga?.status === 'completed' ? 'Terminé' : '';
  const meta = [genreLabel, status].filter(Boolean).join(' · ');

  const isDropped = entry.status === 'dropped';
  const isCompleted = entry.status === 'completed';

  let progressText = '';
  if (isDropped) {
    progressText = `✗ Abandonné — Ch. ${readCount}`;
  } else if (isCompleted) {
    progressText = `✓ Terminé${totalChapters ? ` · ${totalChapters} ch.` : ''}`;
  } else if (totalChapters) {
    progressText = `Ch. ${readCount} / ${totalChapters} — ${progressPct}%`;
  } else if (readCount > 0) {
    progressText = `Ch. ${readCount} lus`;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.listItem, isDropped && styles.listItemDropped]}>
      <View style={styles.listCover}>
        {manga?.coverUrl ? (
          <Image
            source={{uri: manga.coverUrl}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <SkeletonBox style={StyleSheet.absoluteFill} />
        )}
        {/* Barre de progression sur la cover */}
        {progress > 0 && (
          <View style={styles.coverProgressTrack}>
            <View style={[styles.coverProgressFill, {width: `${progressPct}%` as any}]} />
          </View>
        )}
      </View>

      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={2}>{title}</Text>
        {meta ? <Text style={styles.listMeta} numberOfLines={1}>{meta}</Text> : null}
        {progressText ? (
          <Text
            style={[
              styles.listProgress,
              isCompleted && styles.listProgressDone,
              isDropped && styles.listProgressDropped,
            ]}>
            {progressText}
          </Text>
        ) : null}
      </View>

      {/* Bouton play — seulement pour "En cours" */}
      {entry.status === 'reading' && (
        <TouchableOpacity
          style={styles.playBtn}
          onPress={e => {
            e.stopPropagation();
            onPlayPress();
          }}
          activeOpacity={0.7}>
          <Text style={styles.playIcon}>▶</Text>
        </TouchableOpacity>
      )}

      {/* Badge score pour "Terminé" */}
      {isCompleted && entry.userRating ? (
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>★ {entry.userRating}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

// ─── Grid Item ────────────────────────────────────────────────────────────────

interface GridItemProps {
  entry: LibraryEntry;
  manga: Manga | undefined;
  onPress: () => void;
}

const GridItem = ({entry, manga, onPress}: GridItemProps) => {
  const title = manga ? getTitle(manga.title) : entry.mangaId;
  const totalChapters = manga?.lastChapter ? parseInt(manga.lastChapter, 10) : null;
  const readCount = entry.chaptersRead.length;
  const progress = totalChapters && totalChapters > 0
    ? Math.min(readCount / totalChapters, 1)
    : 0;
  const progressPct = Math.round(progress * 100);

  return (
    <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.gridCover}>
        {manga?.coverUrl ? (
          <Image
            source={{uri: manga.coverUrl}}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <SkeletonBox style={StyleSheet.absoluteFill} />
        )}
        {/* Barre progression en bas de la cover */}
        {progress > 0 && (
          <View style={styles.gridProgressTrack}>
            <View style={[styles.gridProgressFill, {width: `${progressPct}%` as any}]} />
          </View>
        )}
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );
};

// ─── Empty state par tab ───────────────────────────────────────────────────────

interface TabEmptyProps {
  tab: typeof TABS[number];
  onCta: () => void;
}

const TabEmpty = ({tab, onCta}: TabEmptyProps) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>{tab.emptyEmoji}</Text>
    <Text style={styles.emptyTitle}>{tab.emptyTitle}</Text>
    <Text style={styles.emptyBody}>{tab.emptyBody}</Text>
    {tab.ctaLabel && (
      <TouchableOpacity style={styles.emptyCta} onPress={onCta} activeOpacity={0.8}>
        <Text style={styles.emptyCtaText}>{tab.ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Écran principal ──────────────────────────────────────────────────────────

const LibraryScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {user} = useAuthStore();
  const {entries, getByStatus, subscribeToLibrary, unsubscribeFromLibrary, isLoading} =
    useLibraryStore();

  const [activeTab, setActiveTab] = useState<LibraryStatus>('reading');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mangaMap, setMangaMap] = useState<Record<string, Manga>>({});
  const [loadingMangas, setLoadingMangas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastActivity' | 'title' | 'rating'>('lastActivity');

  // Subscription Firebase
  useEffect(() => {
    if (user) {
      subscribeToLibrary(user.uid);
    }
    return () => unsubscribeFromLibrary();
  }, [user, subscribeToLibrary, unsubscribeFromLibrary]);

  // Enrichissement covers + metadata MangaDex
  useEffect(() => {
    const ids = entries.map(e => e.mangaId);
    if (ids.length === 0) {
      setMangaMap({});
      return;
    }
    setLoadingMangas(true);
    mangaService
      .getMangaByIds(ids)
      .then(mangas => {
        const map: Record<string, Manga> = {};
        mangas.forEach(m => (map[m.id] = m));
        setMangaMap(map);
      })
      .catch(() => {})
      .finally(() => setLoadingMangas(false));
  }, [entries]);

  const counts = useMemo(
    () =>
      TABS.reduce((acc, tab) => {
        acc[tab.key] = getByStatus(tab.key).length;
        return acc;
      }, {} as Record<LibraryStatus, number>),
    [getByStatus],
  );

  const filteredEntries = useMemo(() => {
    let list = entries.filter(e => e.status === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => {
        const manga = mangaMap[e.mangaId];
        if (manga) {
          const title = getTitle(manga.title).toLowerCase();
          return title.includes(q) || e.mangaId.toLowerCase().includes(q);
        }
        return e.mangaId.toLowerCase().includes(q);
      });
    }
    return list.sort((a, b) => {
      if (sortBy === 'lastActivity') {
        return (
          (b.lastReadAt?.seconds ?? b.updatedAt?.seconds ?? 0) -
          (a.lastReadAt?.seconds ?? a.updatedAt?.seconds ?? 0)
        );
      }
      if (sortBy === 'rating') {
        return (b.userRating ?? 0) - (a.userRating ?? 0);
      }
      if (sortBy === 'title') {
        const mangaA = mangaMap[a.mangaId];
        const mangaB = mangaMap[b.mangaId];
        const titleA = mangaA ? getTitle(mangaA.title) : a.mangaId;
        const titleB = mangaB ? getTitle(mangaB.title) : b.mangaId;
        return titleA.localeCompare(titleB);
      }
      return 0;
    });
  }, [entries, activeTab, searchQuery, sortBy, mangaMap]);

  const navigateToManga = useCallback(
    (mangaId: string) => navigation.navigate('MangaDetail', {mangaId}),
    [navigation],
  );

  const navigateToExplore = useCallback(
    () => (navigation as any).getParent()?.navigate('ExploreStack'),
    [navigation],
  );

  // ─── Mode guest (BR-004) ───────────────────────────────────────────────────
  if (!user) {
    return (
      <ScreenWrapper edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bibliothèque</Text>
        </View>
        <View style={styles.guestWrapper}>
          <EmptyState
            title="Conecte-toi"
            subtitle="Kreye yon kont pou sove e retrouve tout tes mangas favori !"
            ctaLabel="Se connecter"
            onCta={() => (navigation as any).navigate('Auth')}
          />
        </View>
      </ScreenWrapper>
    );
  }

  const isBusy = isLoading || loadingMangas;

  return (
    <ScreenWrapper edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bibliothèque</Text>
      </View>

      {/* Tabs avec compteurs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>
                  {counts[tab.key]}
                </Text>
              </View>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Chercher dans ma bibliothèque..."
          placeholderTextColor={colors.text30}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tri + toggle vue */}
      <View style={styles.sortRow}>
        <View style={styles.sortChips}>
          {[
            {value: 'lastActivity', label: 'Récent'},
            {value: 'rating', label: 'Note'},
            {value: 'title', label: 'Titre A-Z'},
          ].map(({value, label}) => (
            <TouchableOpacity
              key={value}
              style={[styles.sortChip, sortBy === value && styles.sortChipActive]}
              onPress={() => setSortBy(value as 'lastActivity' | 'title' | 'rating')}
              activeOpacity={0.7}>
              <Text style={[styles.sortChipText, sortBy === value && styles.sortChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}>
            <Text style={styles.viewBtnIcon}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}>
            <Text style={styles.viewBtnIcon}>⊞</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenu */}
      {isBusy && filteredEntries.length === 0 && !searchQuery ? (
        /* Skeleton de chargement */
        <ScrollView contentContainerStyle={styles.skeletonContainer}>
          {Array.from({length: 5}).map((_, i) => (
            <View key={`lib-skel-${i}`} style={styles.listItem}>
              <SkeletonBox style={styles.listCoverSkeleton} />
              <View style={{flex: 1, gap: 6}}>
                <SkeletonBox style={{height: 14, width: '70%'}} />
                <SkeletonBox style={{height: 11, width: '45%'}} />
                <SkeletonBox style={{height: 10, width: '55%'}} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : filteredEntries.length === 0 ? (
        searchQuery.trim() ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptyBody}>
              Aucun manga ne correspond à "{searchQuery}" dans cet onglet.
            </Text>
          </View>
        ) : (
          <TabEmpty
            tab={TABS.find(t => t.key === activeTab)!}
            onCta={navigateToExplore}
          />
        )
      ) : viewMode === 'list' ? (
        <FlatList
          data={filteredEntries}
          keyExtractor={item => `lib-${item.mangaId}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          renderItem={({item}) => (
            <ListItem
              entry={item}
              manga={mangaMap[item.mangaId]}
              onPress={() => navigateToManga(item.mangaId)}
              onPlayPress={() => navigateToManga(item.mangaId)}
            />
          )}
        />
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={item => `lib-grid-${item.mangaId}`}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContainer}
          renderItem={({item}) => (
            <GridItem
              entry={item}
              manga={mangaMap[item.mangaId]}
              onPress={() => navigateToManga(item.mangaId)}
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
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s3,
    backgroundColor: '#120a1e',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.text100,
  },

  guestWrapper: {flex: 1},

  // Tabs
  tabsScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: spacing.s4,
    gap: spacing.s2,
    flexDirection: 'row',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s3,
    paddingHorizontal: 2,
    gap: 5,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text60,
  },
  tabLabelActive: {color: colors.orange},
  tabCount: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 22,
    alignItems: 'center',
  },
  tabCountActive: {backgroundColor: 'rgba(255,107,53,0.15)'},
  tabCountText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.text60,
  },
  tabCountTextActive: {color: colors.orange},
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.orange,
    borderRadius: 1,
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.s4,
    marginTop: spacing.s3,
    marginBottom: spacing.s2,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.s3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text100,
    paddingVertical: spacing.s2,
  },
  searchClear: {
    fontSize: 14,
    color: colors.text60,
    paddingLeft: spacing.s2,
    paddingVertical: spacing.s2,
  },

  // Sort row
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
  },
  sortChips: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  sortChipText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text60,
  },
  sortChipTextActive: {
    color: colors.orange,
    fontFamily: fonts.bodySemiBold,
  },
  viewToggle: {flexDirection: 'row', gap: 4},
  viewBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {backgroundColor: 'rgba(255,107,53,0.15)'},
  viewBtnIcon: {fontSize: 14, color: colors.text100},

  // List view
  listContainer: {paddingBottom: 90},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemDropped: {opacity: 0.6},
  listCover: {
    width: 56,
    height: 80,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    flexShrink: 0,
    position: 'relative',
  },
  listCoverSkeleton: {
    width: 56,
    height: 80,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  coverProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  coverProgressFill: {
    height: '100%',
    backgroundColor: colors.orange,
    borderRadius: 1,
  },
  listInfo: {flex: 1, minWidth: 0},
  listTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text100,
    lineHeight: 20,
  },
  listMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text60,
    marginTop: 3,
  },
  listProgress: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text30,
    marginTop: 3,
  },
  listProgressDone: {color: colors.success},
  listProgressDropped: {color: colors.error},

  // Bouton play
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playIcon: {fontSize: 12, color: colors.orange, marginLeft: 2},

  // Badge score
  scoreBadge: {
    backgroundColor: 'rgba(255,209,102,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.4)',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexShrink: 0,
  },
  scoreText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: colors.mango,
  },

  // Grid view
  gridContainer: {
    padding: spacing.s3,
    paddingBottom: 90,
  },
  gridItem: {
    flex: 1,
    margin: 4,
    maxWidth: '33.33%' as any,
  },
  gridCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  gridProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: colors.orange,
  },
  gridTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.text100,
    marginTop: 4,
    lineHeight: 13,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s6,
    paddingVertical: spacing.s8,
  },
  emptyEmoji: {fontSize: 64, marginBottom: spacing.s4, textAlign: 'center'},
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text100,
    textAlign: 'center',
    marginBottom: spacing.s2,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.s6,
  },
  emptyCta: {
    backgroundColor: colors.orange,
    borderRadius: radius.xxl,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s6,
    alignSelf: 'center',
  },
  emptyCtaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: '#fff',
  },

  // Skeleton
  skeletonContainer: {paddingBottom: 90},
});

export default LibraryScreen;
