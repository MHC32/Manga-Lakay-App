// src/screens/explore/ExploreScreen.tsx
import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {ExploreStackParamList} from '../../types/navigation.types';
import {Manga} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {getTitle} from '../../utils/locale';
import {useSearchStore} from '../../stores/search.store';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

// ─── Navigation ───────────────────────────────────────────────────────────────

type NavProp = StackNavigationProp<ExploreStackParamList>;

// ─── IDs de tags MangaDex (stables — UUID du catalogue officiel) ──────────────

const GENRE_TAG_IDS: Record<string, string> = {
  action:   '391b0423-d847-456f-aff4-f6ece7742fe4',
  romance:  '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
  fantasy:  'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
  horreur:  'cdad7e68-1419-41dd-bdce-27753074a640',
  sport:    '69964a64-2f90-4d33-beeb-e3bddffd4803',
  'sci-fi': 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75',
};

// IDs MangaDex des mangas légendaires pour la Collection MangaLakay
const COLLECTION_IDS = [
  '01df4a7a-3a44-4571-8c41-a8a0c1eb49a2', // Bleach
  'e78a489b-6632-4d61-b00b-5206f5b8b22b', // Hunter x Hunter
  'c0ee660b-f9f2-45c3-8068-5123ff53f84a', // Fullmetal Alchemist
  'c52b2ce3-7f95-469c-96b0-479524fb7a1a', // One Piece
];

interface Category {
  id: string;
  tagId: string;
  label: string;
  emoji: string;
  bg: string;
}

const CATEGORIES: Category[] = [
  {id: 'action',   tagId: GENRE_TAG_IDS.action,   label: 'Action',  emoji: '⚔️', bg: '#3d1515'},
  {id: 'romance',  tagId: GENRE_TAG_IDS.romance,  label: 'Romance', emoji: '💕', bg: '#3d1535'},
  {id: 'fantasy',  tagId: GENRE_TAG_IDS.fantasy,  label: 'Fantasy', emoji: '🧙', bg: '#1a1a5c'},
  {id: 'horreur',  tagId: GENRE_TAG_IDS.horreur,  label: 'Horreur', emoji: '👻', bg: '#1a0a2e'},
  {id: 'sport',    tagId: GENRE_TAG_IDS.sport,    label: 'Sport',   emoji: '⚽', bg: '#1a3510'},
  {id: 'sci-fi',   tagId: GENRE_TAG_IDS['sci-fi'], label: 'Sci-Fi',  emoji: '🚀', bg: '#0d2d35'},
];

// Tags populaires avec leurs IDs MangaDex pour navigation
const POPULAR_TAGS = [
  {label: 'Isekai',         id: 'ace04997-f6bd-436e-b261-779182193d3d'},
  {label: 'Magie',          id: 'a1f53773-c69a-4ce5-8cab-fffcd90b1565'},
  {label: 'Démons',         id: '39730448-9a5f-48a2-85b0-a70db87b1233'},
  {label: 'Tournoi',        id: 'a3c67850-4684-404e-9b7f-c69850ee5da6'},
  {label: 'Slice of life',  id: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9'},
  {label: 'Psychologique',  id: '3b60b75c-a2d7-4860-ab56-05f391bb889c'},
  {label: 'Mecha',          id: '50880a9d-5440-4732-9afb-8f457127e836'},
  {label: 'Historique',     id: 'f8f62932-27da-4fe4-8ee1-6779a8c5edba'},
  {label: 'Survie',         id: '5fff9cde-849c-4d78-aab0-0d52b2ee1d25'},
  {label: 'École',          id: 'caaa44eb-cd40-4177-b930-79d3ef2afe87'},
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SkeletonBox = ({style}: {style: any}) => (
  <View style={[{backgroundColor: colors.bgElevated, borderRadius: radius.sm}, style]} />
);

// ─── Composants ───────────────────────────────────────────────────────────────

const CategoryCard = ({item, onPress}: {item: Category; onPress: () => void}) => (
  <TouchableOpacity
    activeOpacity={0.82}
    onPress={onPress}
    style={[styles.catCard, {backgroundColor: item.bg}]}>
    <Text style={styles.catEmoji}>{item.emoji}</Text>
    <View style={styles.catOverlay} />
    <Text style={styles.catLabel}>{item.label}</Text>
  </TouchableOpacity>
);

const MangaRowItem = ({manga, onPress}: {manga: Manga; onPress: () => void}) => {
  const title = getTitle(manga.title);
  const author = manga.authors[0]?.name ?? '';
  const genre = manga.tags.find(t => t.group === 'genre');
  const genreLabel = genre ? (genre.name.fr ?? genre.name.en ?? '') : '';
  const chapterCount = manga.lastChapter ? `${manga.lastChapter} chap.` : '';
  const meta = [author, genreLabel, chapterCount].filter(Boolean).join(' · ');

  const isOngoing = manga.status === 'ongoing';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.newRow}>
      {manga.coverUrl ? (
        <Image source={{uri: manga.coverUrl}} style={styles.newCover} resizeMode="cover" />
      ) : (
        <View style={[styles.newCover, styles.newCoverFallback]}>
          <Text style={styles.newCoverFallbackText}>
            {title.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.newInfo}>
        <Text style={styles.newTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.newMeta} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={[styles.badge, isOngoing ? styles.badgeOngoing : styles.badgeCompleted]}>
        <Text style={styles.badgeText}>
          {isOngoing ? 'En cours' : 'Terminé'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const MangaRowSkeleton = () => (
  <View style={styles.newRow}>
    <SkeletonBox style={styles.newCover} />
    <View style={styles.newInfo}>
      <SkeletonBox style={{height: 14, width: '70%', marginBottom: 6}} />
      <SkeletonBox style={{height: 12, width: '50%'}} />
    </View>
  </View>
);

const CollectionCoverItem = ({manga}: {manga: Manga}) => (
  manga.coverUrl ? (
    <Image source={{uri: manga.coverUrl}} style={styles.collectionCover} resizeMode="cover" />
  ) : (
    <View style={[styles.collectionCover, styles.collectionCoverFallback]}>
      <Text style={{fontSize: 18}}>{getTitle(manga.title).charAt(0)}</Text>
    </View>
  )
);

// ─── Écran principal ──────────────────────────────────────────────────────────

const LIMIT = 20;

const ExploreScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {setPendingTag, setPendingLanguageFilter} = useSearchStore();

  const [newMangas, setNewMangas] = useState<Manga[]>([]);
  const [loadingNew, setLoadingNew] = useState(true);
  const [newTotal, setNewTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [collectionMangas, setCollectionMangas] = useState<Manga[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(true);

  useEffect(() => {
    mangaService
      .searchManga({order: {updatedAt: 'desc'}, limit: LIMIT, offset: 0})
      .then(r => {
        setNewMangas(r.mangas);
        setNewTotal(r.total);
      })
      .catch(() => {})
      .finally(() => setLoadingNew(false));

    mangaService
      .getMangaByIds(COLLECTION_IDS)
      .then(setCollectionMangas)
      .catch(() => {})
      .finally(() => setLoadingCollection(false));
  }, []);

  const loadMoreNew = useCallback(async () => {
    if (isLoadingMore || newMangas.length >= newTotal || newMangas.length === 0) {
      return;
    }
    setIsLoadingMore(true);
    try {
      const {mangas} = await mangaService.searchManga({
        order: {updatedAt: 'desc'},
        limit: LIMIT,
        offset: newMangas.length,
      });
      setNewMangas(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const unique = mangas.filter(m => !existingIds.has(m.id));
        return [...prev, ...unique];
      });
    } catch {
      // silently ignore
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, newMangas.length, newTotal]);

  const goToManga = useCallback(
    (mangaId: string) => navigation.navigate('MangaDetail', {mangaId}),
    [navigation],
  );

  // Navigation cross-tab : écrit le filtre dans le store, puis bascule sur SearchStack
  const goToSearchWithTag = useCallback(
    (tagId: string, tagLabel: string) => {
      setPendingTag(tagId, tagLabel);
      (navigation as any).getParent()?.navigate('SearchStack');
    },
    [navigation, setPendingTag],
  );

  const goToFrenchSearch = useCallback(() => {
    setPendingLanguageFilter('fr_only');
    (navigation as any).getParent()?.navigate('SearchStack');
  }, [navigation, setPendingLanguageFilter]);

  return (
    <ScreenWrapper edges={['top']}>
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroBg}>🌺</Text>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Explorer</Text>
          <Text style={styles.heroSub}>Des milliers de mangas disponibles</Text>
        </View>
      </View>

      {/* Par genre */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Par genre</Text>
        <TouchableOpacity onPress={() => goToSearchWithTag('', 'Tous')}>
          <Text style={styles.sectionLink}>Tous →</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
        renderItem={({item}) => (
          <CategoryCard
            item={item}
            onPress={() => goToSearchWithTag(item.tagId, item.label)}
          />
        )}
      />

      {/* Tags populaires */}
      <View style={[styles.sectionHeader, {paddingBottom: spacing.s2}]}>
        <Text style={styles.sectionTitle}>Tags populaires</Text>
      </View>
      <View style={styles.tagsCloud}>
        {POPULAR_TAGS.map(tag => (
          <TouchableOpacity
            key={tag.id}
            activeOpacity={0.75}
            onPress={() => goToSearchWithTag(tag.id, tag.label)}
            style={styles.tag}>
            <Text style={styles.tagText}>{tag.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Collection MangaLakay */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Collection MangaLakay</Text>
      </View>
      <View style={styles.collectionCard}>
        <View style={styles.collectionBanner}>
          <Text style={styles.collectionBannerEmoji}>🌋</Text>
        </View>
        <View style={styles.collectionBody}>
          <Text style={styles.collectionTitle}>Les Légendes du Shonen</Text>
          <Text style={styles.collectionDesc}>
            Les mangas qui ont défini une génération. Sélectionnés par la communauté MangaLakay.
          </Text>
          <View style={styles.collectionCovers}>
            {loadingCollection
              ? Array.from({length: 4}).map((_, i) => (
                  <SkeletonBox key={i} style={styles.collectionCover} />
                ))
              : collectionMangas.slice(0, 4).map(m => (
                  <TouchableOpacity key={m.id} onPress={() => goToManga(m.id)}>
                    <CollectionCoverItem manga={m} />
                  </TouchableOpacity>
                ))}
            {!loadingCollection && collectionMangas.length > 4 && (
              <View style={[styles.collectionCover, styles.collectionCoverMore]}>
                <Text style={styles.collectionCoverMoreText}>
                  +{collectionMangas.length - 4}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Disponible en Français */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Disponible en Français 🇫🇷</Text>
      </View>
      <TouchableOpacity
        style={styles.frenchCard}
        onPress={goToFrenchSearch}
        activeOpacity={0.85}>
        <View style={styles.frenchCardLeft}>
          <Text style={styles.frenchFlag}>🇫🇷</Text>
        </View>
        <View style={styles.frenchCardContent}>
          <Text style={styles.frenchCardTitle}>Mangas traduits en français</Text>
          <Text style={styles.frenchCardDesc}>
            Filtre les mangas ayant des chapitres disponibles en français sur MangaDex.
          </Text>
          <View style={styles.frenchCardBtn}>
            <Text style={styles.frenchCardBtnText}>Explorer en FR →</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Nouveaux ajouts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nouveaux ajouts</Text>
        <TouchableOpacity onPress={() => goToSearchWithTag('', 'Tous')}>
          <Text style={styles.sectionLink}>Voir tout →</Text>
        </TouchableOpacity>
      </View>

      {loadingNew
        ? Array.from({length: 4}).map((_, i) => <MangaRowSkeleton key={i} />)
        : (
          <FlatList
            data={newMangas}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({item}) => (
              <MangaRowItem
                manga={item}
                onPress={() => goToManga(item.id)}
              />
            )}
            onEndReached={loadMoreNew}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              isLoadingMore
                ? <ActivityIndicator color={colors.orange} style={{padding: spacing.s4}} />
                : null
            }
          />
        )}
    </ScrollView>
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},
  content: {paddingBottom: 90},

  // Hero
  hero: {
    height: 180,
    backgroundColor: '#0d1422',
    justifyContent: 'flex-end',
    padding: spacing.s4,
    overflow: 'hidden',
  },
  heroBg: {
    position: 'absolute',
    fontSize: 120,
    opacity: 0.08,
    alignSelf: 'center',
    top: 20,
  },
  heroContent: {zIndex: 1},
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: colors.orange,
    lineHeight: 32,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginTop: 4,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text100,
  },
  sectionLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.orange,
  },

  // Category cards
  catScroll: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
    gap: spacing.s3,
  },
  catCard: {
    width: 140,
    height: 88,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 10,
  },
  catEmoji: {
    position: 'absolute',
    fontSize: 48,
    top: 10,
    left: 12,
    opacity: 0.8,
  },
  catOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  catLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    zIndex: 1,
  },

  // Tags
  tagsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
    gap: spacing.s2,
  },
  tag: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.text60,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.s4,
    marginVertical: spacing.s2,
  },

  // Collection
  collectionCard: {
    marginHorizontal: spacing.s4,
    marginBottom: spacing.s4,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  collectionBanner: {
    height: 120,
    backgroundColor: '#2d1b69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionBannerEmoji: {fontSize: 60},
  collectionBody: {padding: spacing.s4},
  collectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text100,
    marginBottom: 4,
  },
  collectionDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    lineHeight: 19,
    marginBottom: spacing.s3,
  },
  collectionCovers: {flexDirection: 'row', gap: 6},
  collectionCover: {
    width: 48,
    height: 70,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  collectionCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCoverMore: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCoverMoreText: {
    fontFamily: fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
  },

  // New manga rows
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newCover: {
    width: 44,
    height: 64,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    flexShrink: 0,
    overflow: 'hidden',
  },
  newCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCoverFallbackText: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text60,
  },
  newInfo: {flex: 1, minWidth: 0},
  newTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text100,
  },
  newMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text60,
    marginTop: 2,
  },

  // Badges
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  badgeText: {fontSize: 11, fontFamily: fonts.bodySemiBold, color: colors.text100},
  badgeOngoing: {
    backgroundColor: 'rgba(0,212,170,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  badgeCompleted: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Section Français
  frenchCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.s4,
    marginBottom: spacing.s4,
    backgroundColor: 'rgba(0,212,170,0.07)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.2)',
    padding: spacing.s4,
    gap: spacing.s3,
    alignItems: 'center',
  },
  frenchCardLeft: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frenchFlag: {fontSize: 36},
  frenchCardContent: {flex: 1},
  frenchCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text100,
    marginBottom: 4,
  },
  frenchCardDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text60,
    marginBottom: spacing.s3,
    lineHeight: 18,
  },
  frenchCardBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
    borderRadius: radius.sm,
  },
  frenchCardBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.bgBase,
  },
});

export default ExploreScreen;
