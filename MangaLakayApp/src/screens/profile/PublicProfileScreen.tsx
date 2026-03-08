// src/screens/profile/PublicProfileScreen.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Alert,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {ProfileStackParamList} from '../../types/navigation.types';
import {userService} from '../../services/firebase/user.service';
import {libraryService} from '../../services/firebase/library.service';
import {mangaService} from '../../services/mangadex/manga.service';
import {UserProfile, LibraryEntry} from '../../types/firebase.types';
import {Manga} from '../../types/mangadex.types';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type Props = StackScreenProps<ProfileStackParamList, 'PublicProfile'>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const GENRE_LABELS: Record<string, string> = {
  action: 'Action ⚔️',
  romance: 'Romance 💕',
  horreur: 'Horreur 👻',
  fantasy: 'Fantasy 🧙',
  comedie: 'Comédie 😂',
  drame: 'Drame 🎭',
  sport: 'Sport ⚽',
  scifi: 'Sci-Fi 🚀',
  'tranche-de-vie': 'Tranche de vie ☕',
  mystere: 'Mystère 🔍',
  aventure: 'Aventure 🗺️',
  shoujo: 'Shoujo 🌸',
};

const COUNTRY_LABELS: Record<string, string> = {
  HT: '🌺 Haïti',
  FR: '🇫🇷 France',
  US: '🇺🇸 États-Unis',
  DO: '🇩🇴 RD',
  BR: '🇧🇷 Brésil',
  CL: '🇨🇱 Chili',
  CA: '🇨🇦 Canada',
};

const SAMPLE_BADGES = ['🏆', '📚', '🌺', '🔥', '⭐'];

// ─── Composants utilitaires ───────────────────────────────────────────────────

const StatItem = ({value, label}: {value: string; label: string}) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ReadingStatItem = ({value, label}: {value: string; label: string}) => (
  <View style={styles.rsItem}>
    <Text style={styles.rsValue}>{value}</Text>
    <Text style={styles.rsLabel}>{label}</Text>
  </View>
);

// ─── Écran ────────────────────────────────────────────────────────────────────

const PublicProfileScreen = ({route, navigation}: Props) => {
  const {username} = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [topMangas, setTopMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ─── Chargement des données ──────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const prof = await userService.getProfileByUsername(username);
      if (!prof) {
        setNotFound(true);
        return;
      }
      setProfile(prof);

      // Charger la bibliothèque publique (si isLibraryPublic)
      if (prof.isLibraryPublic) {
        const lib = await libraryService.getLibrary(prof.uid);
        setEntries(lib);

        // Top mangas : entrées avec userRating != null, triées par rating desc
        const rated = lib
          .filter(e => e.userRating !== null)
          .sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0))
          .slice(0, 5);

        if (rated.length > 0) {
          const ids = rated.map(e => e.mangaId);
          try {
            const mangas = await mangaService.getMangaByIds(ids);
            // Respecter l'ordre rating
            const sorted = ids
              .map(id => mangas.find(m => m.id === id))
              .filter((m): m is Manga => m !== undefined);
            setTopMangas(sorted);
          } catch {
            // Si MangaDex injoignable, on affiche sans covers
          }
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleShare = async () => {
    try {
      await Share.share({
        title: `${profile?.displayName ?? username} — MangaLakay`,
        message: `Regarde le profil de ${profile?.displayName ?? username} sur MangaLakay ! @${username}`,
      });
    } catch {
      // ignoré
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Signaler ce profil',
      'Veux-tu signaler @' + username + ' ?',
      [
        {text: 'Annuler', style: 'cancel'},
        {text: 'Signaler', style: 'destructive', onPress: () => {}},
      ],
    );
  };

  // ─── Calculs stats ────────────────────────────────────────────────────────

  const totalMangas = entries.length;
  const totalChapters = entries.reduce(
    (acc, e) => acc + e.chaptersRead.length,
    0,
  );
  const completed = entries.filter(e => e.status === 'completed').length;
  const reading = entries.filter(e => e.status === 'reading').length;
  const rated = entries.filter(e => e.userRating !== null);
  const avgRating =
    rated.length > 0
      ? (
          rated.reduce((acc, e) => acc + (e.userRating ?? 0), 0) / rated.length
        ).toFixed(1)
      : '—';

  const xp = totalChapters * 4 + completed * 50;
  const level = Math.floor(xp / 1000) + 1;

  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt.toMillis()).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  // ─── Rendu états ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={styles.centered}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.notFoundEmoji}>👤</Text>
        <Text style={styles.notFoundTitle}>Profil introuvable</Text>
        <Text style={styles.notFoundSub}>@{username} n'existe pas.</Text>
      </View>
    );
  }

  if (!profile.isPublic) {
    return (
      <View style={styles.centered}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.notFoundEmoji}>🔒</Text>
        <Text style={styles.notFoundTitle}>Profil privé</Text>
        <Text style={styles.notFoundSub}>
          {profile.displayName} a rendu son profil privé.
        </Text>
      </View>
    );
  }

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <ScreenWrapper edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* Banner + Nav overlay */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <View style={styles.bannerOverlayOrange} />
            <View style={styles.bannerOverlayTeal} />
          </View>
          <View style={styles.navOverlay}>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.navBtnIcon}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={handleReport}>
              <Text style={styles.navBtnIcon}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Zone profil */}
        <View style={styles.profileArea}>

          {/* Avatar + action Partager */}
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Text style={styles.shareBtnText}>↑ Partager</Text>
            </TouchableOpacity>
          </View>

          {/* Nom + badges inline */}
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle}>@{profile.username}</Text>
            {profile.country && COUNTRY_LABELS[profile.country] && (
              <View style={styles.chipTeal}>
                <Text style={styles.chipTealText}>
                  {COUNTRY_LABELS[profile.country]}
                </Text>
              </View>
            )}
            <View style={styles.chipMango}>
              <Text style={styles.chipMangoText}>Niv. {level}</Text>
            </View>
          </View>

          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {joinedDate && (
            <Text style={styles.joined}>Membre depuis {joinedDate}</Text>
          )}

          {/* Stats 4 colonnes */}
          <View style={styles.statsRow}>
            <StatItem value={String(totalMangas)} label="Mangas" />
            <StatItem
              value={totalChapters >= 1000
                ? (totalChapters / 1000).toFixed(1) + 'k'
                : String(totalChapters)}
              label="Chapitres"
            />
            <StatItem value={String(SAMPLE_BADGES.length)} label="Badges" />
            <StatItem value={'#—'} label="Classement" />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Stats de lecture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats de lecture</Text>
          <View style={styles.readingCard}>
            <Text style={styles.readingCardLabel}>Genres préférés</Text>
            <View style={styles.genreChips}>
              {profile.favoriteGenres.slice(0, 3).map(g => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreChipText}>
                    {GENRE_LABELS[g] ?? g}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.readingGrid}>
              <ReadingStatItem value={String(completed)} label="Terminés" />
              <ReadingStatItem value={String(reading)} label="En cours" />
              <ReadingStatItem value={avgRating} label="Note moy." />
              <ReadingStatItem value="🔥 —" label="Streak" />
            </View>
          </View>
        </View>

        {/* Top mangas (visible si bibliothèque publique et rated entries) */}
        {profile.isLibraryPublic && topMangas.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top mangas</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.topMangaScroll}>
                {topMangas.map((manga, index) => (
                  <TouchableOpacity
                    key={manga.id}
                    style={styles.topMangaCard}
                    onPress={() =>
                      navigation.push('MangaDetail', {mangaId: manga.id})
                    }
                    activeOpacity={0.8}>
                    <View style={styles.topMangaCover}>
                      {manga.coverUrl ? (
                        <Image
                          source={{uri: manga.coverUrl}}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.topMangaFallback}>📖</Text>
                      )}
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankBadgeText}>{index + 1}</Text>
                      </View>
                    </View>
                    <Text style={styles.topMangaTitle} numberOfLines={2}>
                      {manga.titleFr ?? manga.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Badges récents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges récents</Text>
          <View style={styles.badgesRow}>
            {SAMPLE_BADGES.map((badge, i) => (
              <View key={i} style={styles.badgeItem}>
                <Text style={styles.badgeEmoji}>{badge}</Text>
              </View>
            ))}
            <View style={styles.badgeMore}>
              <Text style={styles.badgeMoreText}>+{Math.max(0, (completed > 5 ? completed : 3))}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Activité récente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activité récente</Text>
          {entries.slice(0, 3).map(entry => (
            <ActivityRow key={entry.mangaId} entry={entry} />
          ))}
          {entries.length === 0 && (
            <Text style={styles.emptyActivity}>Aucune activité récente.</Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
};

// ─── Ligne d'activité ─────────────────────────────────────────────────────────

const ActivityRow = ({entry}: {entry: LibraryEntry}) => {
  const getIcon = () => {
    if (entry.status === 'completed') return '✅';
    if (entry.userRating !== null) return '⭐';
    return '📖';
  };

  const getText = () => {
    if (entry.status === 'completed') return `A terminé un manga`;
    if (entry.userRating !== null) return `A noté un manga · ${entry.userRating}/10`;
    if (entry.lastChapterRead) return `A lu un chapitre`;
    return `A ajouté un manga`;
  };

  const getTime = () => {
    if (!entry.updatedAt) return '';
    const diff = Date.now() - entry.updatedAt.toMillis();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return 'Récent';
    if (h < 24) return `${h}h`;
    return `${d}j`;
  };

  return (
    <View style={styles.activityRow}>
      <View style={styles.actIcon}>
        <Text style={styles.actIconEmoji}>{getIcon()}</Text>
      </View>
      <Text style={styles.actText}>{getText()}</Text>
      <Text style={styles.actTime}>{getTime()}</Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },

  // Banner
  bannerContainer: {
    height: 120,
    position: 'relative',
  },
  banner: {
    flex: 1,
    backgroundColor: '#1a0a2e',
    overflow: 'hidden',
  },
  bannerOverlayOrange: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,107,53,0.25)',
    borderRadius: 9999,
    width: '60%',
    height: '200%',
    left: '-10%',
    top: '-50%',
  },
  bannerOverlayTeal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderRadius: 9999,
    width: '60%',
    height: '200%',
    right: '-10%',
    top: '-50%',
    left: undefined,
  },
  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnIcon: {
    color: colors.text100,
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
  },

  // Zone profil
  profileArea: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -40,
    marginBottom: spacing.s3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bgBase,
  },
  avatarEmoji: {
    fontSize: 36,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s2,
    marginBottom: 8,
  },
  shareBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text100,
  },

  // Identité
  displayName: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text100,
    fontWeight: '900',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginTop: 2,
  },
  handle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
  },
  chipTeal: {
    backgroundColor: 'rgba(0,212,170,0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
  },
  chipTealText: {
    fontSize: 11,
    color: colors.teal,
    fontFamily: fonts.bodySemiBold,
  },
  chipMango: {
    backgroundColor: 'rgba(255,209,102,0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
  },
  chipMangoText: {
    fontSize: 11,
    color: colors.mango,
    fontFamily: fonts.bodySemiBold,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    lineHeight: 20,
    marginTop: spacing.s2,
  },
  joined: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text30,
    marginTop: spacing.s2,
  },

  // Stats 4 colonnes
  statsRow: {
    flexDirection: 'row',
    gap: spacing.s5,
    marginTop: spacing.s3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text100,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text60,
    fontFamily: fonts.body,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.s4,
  },

  // Sections
  section: {
    padding: spacing.s4,
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text60,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s3,
  },

  // Reading stats
  readingCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.s4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readingCardLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
    marginTop: spacing.s2,
  },
  genreChip: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.s3,
    paddingVertical: 4,
  },
  genreChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.text100,
  },
  readingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
    marginTop: spacing.s3,
  },
  rsItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.s3,
    alignItems: 'center',
  },
  rsValue: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: '700',
    color: colors.orange,
  },
  rsLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.text60,
    marginTop: 2,
  },

  // Top mangas
  topMangaScroll: {
    gap: spacing.s2,
    paddingBottom: spacing.s2,
  },
  topMangaCard: {
    width: 80,
    flexShrink: 0,
  },
  topMangaCover: {
    width: 80,
    height: 114,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  topMangaFallback: {
    fontSize: 32,
  },
  rankBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  topMangaTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    fontWeight: '600',
    color: colors.text100,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 13,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
  },
  badgeItem: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeMore: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMoreText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.orange,
    fontWeight: '700',
  },

  // Activité
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actIconEmoji: {
    fontSize: 16,
  },
  actText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    lineHeight: 19,
  },
  actTime: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text30,
    whiteSpace: 'nowrap',
  } as any,
  emptyActivity: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text30,
    textAlign: 'center',
    paddingVertical: spacing.s4,
  },

  // Not found
  backBtn: {
    position: 'absolute',
    top: spacing.s6,
    left: spacing.s4,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text100,
    fontSize: 18,
    fontFamily: fonts.bodySemiBold,
  },
  notFoundEmoji: {
    fontSize: 48,
    marginBottom: spacing.s3,
  },
  notFoundTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text100,
    fontWeight: '900',
  },
  notFoundSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    marginTop: spacing.s2,
  },

  bottomSpacer: {height: 40},
});

export default PublicProfileScreen;
