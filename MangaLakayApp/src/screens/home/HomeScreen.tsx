// src/screens/home/HomeScreen.tsx
import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Manga, Chapter} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {chapterService} from '../../services/mangadex/chapter.service';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {MangaCardVertical} from '../../components/manga';
import {MangaCardSkeleton} from '../../components/ui/Skeleton';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {HomeStackParamList} from '../../types/navigation.types';
import {getTitle} from '../../utils/locale';
import {formatRelativeDate} from '../../utils/date';

type NavProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

// ─── Hero Card ───────────────────────────────────────────────────────────────
const HeroCard = ({manga, onPress}: {manga: Manga; onPress: () => void}) => {
  const title = getTitle(manga.title);
  const authorName = manga.authors[0]?.name ?? '';
  const chapterCount = manga.lastChapter ? `${manga.lastChapter} chap.` : '';
  const statusLabels: Record<string, string> = {
    ongoing: 'En cours',
    completed: 'Terminé',
    hiatus: 'En pause',
    cancelled: 'Annulé',
  };
  const meta = [authorName, chapterCount, statusLabels[manga.status ?? '']]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} style={styles.heroCard}>
      <View style={styles.heroBgEmojiWrap}>
        <Text style={styles.heroBgEmoji}>⚔️</Text>
      </View>
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <Text style={styles.heroLabel}>✨ En vedette aujourd'hui</Text>
        <View>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.heroMeta}>{meta}</Text>
        </View>
        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>▶ Lire maintenant</Text>
        </View>
      </View>
    </Pressable>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────
const SectionHeader = ({
  title,
  linkLabel,
  onLink,
}: {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {linkLabel && (
      <TouchableOpacity onPress={onLink} activeOpacity={0.7}>
        <Text style={styles.sectionLink}>{linkLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Community Banner ────────────────────────────────────────────────────────
const CommunityBanner = ({
  mangas,
  onViewRanking,
  onMangaPress,
}: {
  mangas: {manga: Manga; count: number}[];
  onViewRanking: () => void;
  onMangaPress: (id: string) => void;
}) => (
  <View style={styles.communityBanner}>
    <Text style={styles.communityTitle}>🇭🇹 La kominote ap li</Text>
    <View style={styles.communityItems}>
      {mangas.slice(0, 4).map(({manga, count}, index) => (
        <TouchableOpacity
          key={manga.id}
          style={styles.communityItem}
          onPress={() => onMangaPress(manga.id)}
          activeOpacity={0.7}>
          <Text style={styles.communityRank}>{index + 1}</Text>
          <View style={styles.communityCover}>
            <Text style={styles.communityCoverEmoji}>📖</Text>
          </View>
          <View style={styles.communityInfo}>
            <Text style={styles.communityMangaTitle} numberOfLines={1}>
              {getTitle(manga.title)}
            </Text>
            <Text style={styles.communityReading}>{count} otakus lisent</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
    <TouchableOpacity onPress={onViewRanking} style={styles.communityLinkWrap}>
      <Text style={styles.communityLinkText}>Voir le Tablo Dònen →</Text>
    </TouchableOpacity>
  </View>
);

// ─── Locked Section (guest) ───────────────────────────────────────────────────
const LockedSection = ({
  icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
}: {
  icon: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
}) => (
  <View style={styles.lockedSection}>
    <Text style={styles.lockIcon}>{icon}</Text>
    <Text style={styles.lockTitle}>{title}</Text>
    <Text style={styles.lockSubtitle}>{subtitle}</Text>
    <TouchableOpacity style={styles.lockCta} onPress={onCta} activeOpacity={0.8}>
      <Text style={styles.lockCtaText}>{ctaLabel}</Text>
    </TouchableOpacity>
  </View>
);

// ─── Chapter Item ─────────────────────────────────────────────────────────────
const ChapterItem = ({
  mangaTitle,
  chapter,
  isNew,
  onPress,
}: {
  mangaTitle: string;
  chapter: Chapter;
  isNew: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.chapterItem} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.ciCover}>
      <Text style={styles.ciCoverEmoji}>📖</Text>
    </View>
    <View style={styles.ciInfo}>
      <Text style={styles.ciManga} numberOfLines={1}>{mangaTitle}</Text>
      <Text style={styles.ciChap}>
        Chapitre {chapter.chapter ?? '?'}
        {chapter.title ? ` — ${chapter.title}` : ''}
      </Text>
      <Text style={styles.ciDate}>{formatRelativeDate(chapter.publishAt)}</Text>
    </View>
    {isNew && (
      <View style={styles.ciNewBadge}>
        <Text style={styles.ciNewText}>NEW</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ─── HomeScreen ───────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {user} = useAuthStore();
  const {entries} = useLibraryStore();

  const [trending, setTrending] = useState<Manga[]>([]);
  const [featuredManga, setFeaturedManga] = useState<Manga | null>(null);
  const [newChapters, setNewChapters] = useState<{chapter: Chapter; manga: Manga}[]>([]);
  const [communityData, setCommunityData] = useState<{manga: Manga; count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const navigateToManga = (mangaId: string) =>
    navigation.navigate('MangaDetail', {mangaId});

  const navigateToAuth = () => (navigation as any).navigate('Auth');

  const navigateToExplore = () =>
    (navigation as any).getParent()?.navigate('Explore');

  const navigateToRanking = () =>
    (navigation as any).getParent()?.navigate('Ranking');

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const mangas = await mangaService.getTrending(20);
        setTrending(mangas);

        if (mangas.length > 0) {
          setFeaturedManga(mangas[0]);
        }

        // Nouvelles sorties — chapitres récents des mangas en bibliothèque
        if (user && entries.length > 0) {
          const libraryIds = entries.map(e => e.mangaId);
          const libraryMangas = mangas.filter(m => libraryIds.includes(m.id)).slice(0, 5);
          const chaptersData: {chapter: Chapter; manga: Manga}[] = [];
          for (const manga of libraryMangas) {
            try {
              const feed = await chapterService.getChapterFeed(manga.id, 0, 20);
              if (feed.chapters.length > 0) {
                chaptersData.push({chapter: feed.chapters[0], manga});
              }
            } catch {
              // ignorer les erreurs individuelles
            }
          }
          setNewChapters(
            chaptersData.sort(
              (a, b) =>
                new Date(b.chapter.publishAt).getTime() -
                new Date(a.chapter.publishAt).getTime(),
            ),
          );
        }

        // Communauté — simulé avec les tendances (la vraie implémentation = Cloud Function)
        setCommunityData(
          mangas.slice(0, 4).map((m, i) => ({manga: m, count: 34 - i * 7})),
        );
      } catch {
        // erreur silencieuse
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, entries],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isNewChapter = (publishAt: string) =>
    (Date.now() - new Date(publishAt).getTime()) / 36e5 < 24;

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.orange}
            colors={[colors.orange]}
          />
        }
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        {user ? (
          <View style={styles.header}>
            <View>
              <Text style={styles.helloText}>
                Bonjou,{' '}
                <Text style={styles.helloName}>
                  {user.displayName?.split(' ')[0] ?? user.username}
                </Text>{' '}
                👋
              </Text>
              <Text style={styles.helloSub}>
                {newChapters.length > 0
                  ? `${newChapters.length} nouvelles sorties aujourd'hui`
                  : 'Kisa ou ap li jodi a ?'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => (navigation as any).getParent()?.navigate('Profile')}
              activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.displayName ?? user.username).slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestHeader}>
            <Text style={styles.guestLogo}>
              <Text style={styles.logoOrange}>Manga</Text>
              <Text style={styles.logoTeal}>Lakay</Text>
            </Text>
          </View>
        )}

        {/* ── Join Banner (guest) ─────────────────────────────────────────── */}
        {!user && (
          <View style={styles.joinBanner}>
            <Text style={styles.joinTitle}>🌺 Rejoins la kominote !</Text>
            <Text style={styles.joinSub}>
              847 otakus haïtiens t'attendent. Crée un compte gratuit.
            </Text>
            <View style={styles.joinBtns}>
              <TouchableOpacity
                style={styles.joinBtnPrimary}
                onPress={navigateToAuth}
                activeOpacity={0.85}>
                <Text style={styles.joinBtnPrimaryText}>S'inscrire</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.joinBtnOutline}
                onPress={navigateToAuth}
                activeOpacity={0.85}>
                <Text style={styles.joinBtnOutlineText}>Connexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Hero Card (connecté) ────────────────────────────────────────── */}
        {user && featuredManga && (
          <HeroCard
            manga={featuredManga}
            onPress={() => navigateToManga(featuredManga.id)}
          />
        )}

        {/* ── Tendances ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader
            title="🔥 Tendances"
            linkLabel="Voir tout"
            onLink={navigateToExplore}
          />
          {isLoading ? (
            <FlatList
              horizontal
              data={Array(6).fill(null)}
              keyExtractor={(_, i) => `sk-${i}`}
              renderItem={() => <MangaCardSkeleton />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listPadding}
            />
          ) : (
            <FlatList
              horizontal
              data={trending}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <MangaCardVertical
                  manga={item}
                  onPress={() => navigateToManga(item.id)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listPadding}
            />
          )}
        </View>

        {/* ── La kominote ap li ───────────────────────────────────────────── */}
        <View style={styles.sectionPadded}>
          {user ? (
            <CommunityBanner
              mangas={communityData}
              onViewRanking={navigateToRanking}
              onMangaPress={navigateToManga}
            />
          ) : (
            <LockedSection
              icon="🔒"
              title="La kominote ap li"
              subtitle="Crée un compte pour voir ce que les otakus haïtiens lisent en ce moment"
              ctaLabel="Rejoindre gratuitement"
              onCta={navigateToAuth}
            />
          )}
        </View>

        {/* ── Nouvelles sorties ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader title="🔔 Nouvelles sorties" />
          {user ? (
            newChapters.length > 0 ? (
              newChapters.map(({chapter, manga}) => (
                <ChapterItem
                  key={chapter.id}
                  mangaTitle={getTitle(manga.title)}
                  chapter={chapter}
                  isNew={isNewChapter(chapter.publishAt)}
                  onPress={() =>
                    navigation.navigate('Reader', {
                      chapterId: chapter.id,
                      mangaId: manga.id,
                      chapterNum: chapter.chapter ?? '1',
                    })
                  }
                />
              ))
            ) : (
              <View style={styles.emptyChapters}>
                <Text style={styles.emptyChaptersText}>
                  Suis des mangas pour voir tes nouvelles sorties
                </Text>
              </View>
            )
          ) : (
            <View style={styles.lockedPad}>
              <LockedSection
                icon="📬"
                title="Nouvelles sorties"
                subtitle="Suis des mangas pour recevoir les nouvelles sorties dans ton feed"
                ctaLabel="Créer mon compte"
                onCta={navigateToAuth}
              />
            </View>
          )}
        </View>

        <View style={{height: spacing.s8}} />
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  // Header connecté
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },
  helloText: {fontSize: 22, fontWeight: '900', color: colors.text100},
  helloName: {color: colors.orange},
  helloSub: {fontSize: 13, color: colors.text60, marginTop: 2},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.orange}33`,
    borderWidth: 1,
    borderColor: `${colors.orange}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: colors.orange, fontSize: 14, fontWeight: '800'},
  // Header guest
  guestHeader: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },
  guestLogo: {fontSize: 22, fontWeight: '900'},
  logoOrange: {color: colors.orange},
  logoTeal: {color: colors.teal},
  // Join banner
  joinBanner: {
    marginHorizontal: spacing.s4,
    marginBottom: spacing.s4,
    backgroundColor: `${colors.orange}1A`,
    borderWidth: 1,
    borderColor: `${colors.orange}4D`,
    borderRadius: radius.lg,
    padding: spacing.s4,
  },
  joinTitle: {fontSize: 16, fontWeight: '800', color: colors.text100, marginBottom: 4},
  joinSub: {fontSize: 13, color: colors.text60, marginBottom: spacing.s3},
  joinBtns: {flexDirection: 'row', gap: spacing.s2},
  joinBtnPrimary: {
    backgroundColor: colors.orange,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: radius.full,
  },
  joinBtnPrimaryText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  joinBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: radius.full,
  },
  joinBtnOutlineText: {color: colors.text100, fontSize: 13, fontWeight: '600'},
  // Hero card
  heroCard: {
    marginHorizontal: spacing.s4,
    marginBottom: spacing.s6,
    borderRadius: radius.xl,
    overflow: 'hidden',
    height: 180,
    backgroundColor: '#1a0533',
  },
  heroBgEmojiWrap: {position: 'absolute', right: -10, top: -10},
  heroBgEmoji: {fontSize: 120, opacity: 0.25},
  heroOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,14,26,0.7)',
  },
  heroContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    padding: spacing.s5,
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.orange,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text100,
    lineHeight: 26,
    marginTop: spacing.s1,
    marginBottom: spacing.s2,
  },
  heroMeta: {fontSize: 12, color: colors.text60},
  heroCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.orange,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.full,
    elevation: 6,
  },
  heroCtaText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  // Sections
  section: {marginBottom: spacing.s6},
  sectionPadded: {paddingHorizontal: spacing.s4, marginBottom: spacing.s6},
  lockedPad: {paddingHorizontal: spacing.s4},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    marginBottom: spacing.s3,
  },
  sectionTitle: {fontSize: 17, fontWeight: '700', color: colors.text100},
  sectionLink: {fontSize: 13, color: colors.teal, fontWeight: '600'},
  listPadding: {paddingHorizontal: spacing.s4},
  // Community banner
  communityBanner: {
    borderRadius: radius.lg,
    backgroundColor: `${colors.teal}0D`,
    borderWidth: 1,
    borderColor: `${colors.teal}33`,
    padding: spacing.s4,
  },
  communityTitle: {fontSize: 16, fontWeight: '800', color: colors.text100, marginBottom: spacing.s3},
  communityItems: {gap: spacing.s2},
  communityItem: {flexDirection: 'row', alignItems: 'center', gap: spacing.s3},
  communityRank: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text30,
    width: 20,
    textAlign: 'center',
  },
  communityCover: {
    width: 36,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCoverEmoji: {fontSize: 18},
  communityInfo: {flex: 1, minWidth: 0},
  communityMangaTitle: {fontSize: 13, fontWeight: '600', color: colors.text100},
  communityReading: {fontSize: 11, color: colors.teal, marginTop: 2},
  communityLinkWrap: {marginTop: spacing.s3, alignItems: 'center'},
  communityLinkText: {fontSize: 13, color: colors.teal, fontWeight: '600'},
  // Locked section
  lockedSection: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.s6,
    alignItems: 'center',
  },
  lockIcon: {fontSize: 32, marginBottom: spacing.s3},
  lockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text100,
    marginBottom: 4,
    textAlign: 'center',
  },
  lockSubtitle: {
    fontSize: 13,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 18,
  },
  lockCta: {
    marginTop: spacing.s4,
    borderWidth: 1,
    borderColor: colors.orange,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    borderRadius: radius.full,
  },
  lockCtaText: {color: colors.orange, fontSize: 13, fontWeight: '700'},
  // Chapter items
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ciCover: {
    width: 44,
    height: 58,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ciCoverEmoji: {fontSize: 22},
  ciInfo: {flex: 1, minWidth: 0},
  ciManga: {fontSize: 13, fontWeight: '600', color: colors.text100},
  ciChap: {fontSize: 12, color: colors.orange, fontWeight: '700', marginTop: 2},
  ciDate: {fontSize: 11, color: colors.text30, marginTop: 1},
  ciNewBadge: {
    backgroundColor: `${colors.orange}26`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  ciNewText: {color: colors.orange, fontSize: 10, fontWeight: '800'},
  emptyChapters: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s5,
  },
  emptyChaptersText: {fontSize: 14, color: colors.text60, textAlign: 'center'},
});

export default HomeScreen;
