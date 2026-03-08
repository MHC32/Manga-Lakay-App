// src/screens/profile/ProfileScreen.tsx
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {EmptyState} from '../../components/ui';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {ProfileStackParamList} from '../../types/navigation.types';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

type NavProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;
type ProfileTab = 'badges' | 'activity' | 'favorites';

// ─── Mapping genres → labels affichables ──────────────────────────────────────

const GENRE_LABELS: Record<string, string> = {
  action: 'Action', romance: 'Romance', fantasy: 'Fantaisie',
  horror: 'Horreur', comedy: 'Comédie', 'sci-fi': 'Sci-Fi',
  drama: 'Drame', adventure: 'Aventure', mystery: 'Mystère',
  'slice-of-life': 'Tranche de vie', sports: 'Sports', psychological: 'Psychologique',
  // Alias compatibles avec les clés de EditProfileScreen
  horreur: 'Horreur', comedie: 'Comédie', drame: 'Drame',
  sport: 'Sports', scifi: 'Sci-Fi', 'tranche-de-vie': 'Tranche de vie',
  mystere: 'Mystère', aventure: 'Aventure', shoujo: 'Shoujo',
};

// ─── Badges statiques (hors scope MVP mais affichés visuellement) ─────────────

const BADGES = [
  {id: 'champion',    emoji: '🏆', label: 'Champion',      unlocked: true,  isNew: true},
  {id: 'mangas100',   emoji: '📚', label: '100 Mangas',    unlocked: true,  isNew: false},
  {id: 'notes50',     emoji: '⭐', label: '50 Notes',      unlocked: true,  isNew: false},
  {id: 'haiti',       emoji: '🌺', label: 'Haïtien Fier',  unlocked: true,  isNew: false},
  {id: 'streak30',    emoji: '🔥', label: 'Streak 30j',    unlocked: false, isNew: false},
  {id: 'onepiece',    emoji: '🌊', label: 'One Piece Fan', unlocked: false, isNew: false},
  {id: 'chap500',     emoji: '💎', label: '500 Chap.',     unlocked: false, isNew: false},
  {id: 'top100',      emoji: '🌟', label: 'Top 100',       unlocked: false, isNew: false},
];

// ─── Composant Badge ──────────────────────────────────────────────────────────

const BadgeItem = ({badge}: {badge: typeof BADGES[number]}) => (
  <View style={styles.badgeItem}>
    <View style={[
      styles.badgeIcon,
      badge.unlocked ? styles.badgeUnlocked : styles.badgeLocked,
    ]}>
      <Text style={[styles.badgeEmoji, !badge.unlocked && styles.badgeEmojiLocked]}>
        {badge.emoji}
      </Text>
      {badge.isNew && (
        <View style={styles.badgeNewPill}>
          <Text style={styles.badgeNewText}>NEW</Text>
        </View>
      )}
    </View>
    <Text style={styles.badgeName}>{badge.label}</Text>
  </View>
);

// ─── Écran ────────────────────────────────────────────────────────────────────

const ProfileScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {user, signOut} = useAuthStore();
  const {entries} = useLibraryStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('badges');

  // Stats calculées depuis la bibliothèque Firebase
  const stats = useMemo(() => {
    const reading   = entries.filter(e => e.status === 'reading').length;
    const completed = entries.filter(e => e.status === 'completed').length;
    const totalMangas = entries.length;
    const totalChapters = entries.reduce((acc, e) => acc + e.chaptersRead.length, 0);
    const rated = entries.filter(e => e.userRating !== null).length;
    const unlockedBadges = BADGES.filter(b => b.unlocked).length;
    return {reading, completed, totalMangas, totalChapters, rated, unlockedBadges};
  }, [entries]);

  // ─── Mode guest ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <ScreenWrapper edges={['top']}>
        <View style={styles.guestHeader}>
          <Text style={styles.guestTitle}>Profil</Text>
        </View>
        <View style={styles.guestBody}>
          <EmptyState
            title="Conecte-toi"
            subtitle="Kreye yon kont pou jwenn kominote MangaLakay a ak sove tout pwogrè ou."
            ctaLabel="Se connecter"
            onCta={() => (navigation as any).getParent()?.navigate('Auth')}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // XP simulé basé sur l'activité réelle
  const xpCurrent = stats.totalChapters * 4 + stats.completed * 50;
  const xpLevel = Math.floor(xpCurrent / 1000) + 1;
  const xpForNextLevel = xpLevel * 1000;
  const xpPct = Math.min((xpCurrent % 1000) / 1000, 1);

  const TABS: {key: ProfileTab; label: string}[] = [
    {key: 'badges',   label: 'Badges'},
    {key: 'activity', label: 'Activité'},
    {key: 'favorites', label: 'Favoris'},
  ];

  return (
    <ScreenWrapper edges={['top']}>

      {/* ── Header + XP (scrollable dans un premier ScrollView) ─────── */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.topScroll} scrollEnabled={false} nestedScrollEnabled>
        {/* ── Header avec gradient simulé ──────────────────────────── */}
        <View style={styles.profileHeader}>
          {/* Actions haut droite */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}>
              <Text style={styles.iconBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={signOut}
              activeOpacity={0.7}>
              <Text style={styles.iconBtnText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar + info */}
          <View style={styles.profileMain}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{user.avatarEmoji ?? '🌺'}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Niv.{xpLevel}</Text>
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.displayName}</Text>
              <Text style={styles.profileHandle}>
                @{user.username}
                {user.country === 'HT' ? ' · Haïti 🇭🇹' : ''}
              </Text>
              {user.bio ? (
                <Text style={styles.profileBio} numberOfLines={2}>{user.bio}</Text>
              ) : null}
            </View>
          </View>

          {/* Genres favoris */}
          {(user.favoriteGenres?.length ?? 0) > 0 && (
            <View style={styles.genresSection}>
              <Text style={styles.genresSectionTitle}>Genres favoris</Text>
              <View style={styles.genreChips}>
                {user.favoriteGenres!.map(g => (
                  <View key={g} style={styles.genreChip}>
                    <Text style={styles.genreChipText}>{GENRE_LABELS[g] ?? g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalMangas}</Text>
              <Text style={styles.statLabel}>MANGAS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalChapters}</Text>
              <Text style={styles.statLabel}>CHAPITRES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rated}</Text>
              <Text style={styles.statLabel}>NOTES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.unlockedBadges}</Text>
              <Text style={styles.statLabel}>BADGES</Text>
            </View>
          </View>
        </View>

        {/* ── Barre XP ─────────────────────────────────────────────── */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLabel}>Niveau {xpLevel} → {xpLevel + 1}</Text>
            <Text style={styles.xpValue}>
              {xpCurrent % 1000} / 1 000 XP
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, {width: `${Math.round(xpPct * 100)}%` as any}]} />
          </View>
        </View>
      </ScrollView>

      {/* ── Tabs (fixe, hors ScrollView) ─────────────────────────── */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabBtn}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Contenu des tabs (scrollable séparément) ─────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
        {/* ── Contenu des tabs ─────────────────────────────────────── */}

        {activeTab === 'badges' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSubtitle}>
              {stats.unlockedBadges} badges débloqués sur {BADGES.length}
            </Text>
            <View style={styles.badgesGrid}>
              {BADGES.map(b => <BadgeItem key={b.id} badge={b} />)}
            </View>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>Voir tous les badges →</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.tabContent}>
            {entries.length === 0 ? (
              <Text style={styles.emptyTab}>Pa gen aktivite encore. Kòmanse li !</Text>
            ) : (
              entries.slice(0, 10).map(entry => (
                <View key={entry.mangaId} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    <Text style={styles.activityIconText}>
                      {entry.status === 'completed' ? '✅'
                        : entry.status === 'dropped' ? '❌'
                        : entry.chaptersRead.length > 0 ? '📖'
                        : '➕'}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.activityText} numberOfLines={1}>
                      {entry.status === 'completed'
                        ? `A terminé un manga`
                        : entry.chaptersRead.length > 0
                        ? `A lu ${entry.chaptersRead.length} chapitre(s)`
                        : `A ajouté à sa bibliothèque`}
                    </Text>
                    {entry.userRating ? (
                      <Text style={styles.activitySub}>
                        Note : {entry.userRating}/10
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'favorites' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabSubtitle}>
              Top mangas — {user.displayName}
            </Text>
            {entries.filter(e => e.userRating && e.userRating >= 8).length === 0 ? (
              <Text style={styles.emptyTab}>
                Note des mangas 8/10 ou plus pou yo parèt la.
              </Text>
            ) : (
              <View style={styles.favGrid}>
                {entries
                  .filter(e => e.userRating && e.userRating >= 8)
                  .sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0))
                  .slice(0, 6)
                  .map(entry => (
                    <TouchableOpacity
                      key={entry.mangaId}
                      style={styles.favCard}
                      onPress={() => navigation.navigate('MangaDetail', {mangaId: entry.mangaId})}
                      activeOpacity={0.8}>
                      <Text style={styles.favCardEmoji}>⭐</Text>
                      <Text style={styles.favCardRating}>{entry.userRating}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* ── Bouton Bibliothèque ───────────────────────────────────── */}
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => navigation.navigate('LibraryMain')}
          activeOpacity={0.8}>
          <Text style={styles.libraryBtnEmoji}>📚</Text>
          <View style={styles.libraryBtnInfo}>
            <Text style={styles.libraryBtnLabel}>Ma Bibliothèque</Text>
            <Text style={styles.libraryBtnSub}>
              {stats.reading} en cours · {stats.completed} terminés
            </Text>
          </View>
          <Text style={styles.libraryBtnArrow}>›</Text>
        </TouchableOpacity>

        <View style={{height: 100}} />
      </ScrollView>

    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},
  topScroll: {flexGrow: 0},
  contentScroll: {flex: 1},

  // Guest
  guestHeader: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s3,
    backgroundColor: '#1a0f2e',
  },
  guestTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.text100,
  },
  guestBody: {flex: 1},

  // Profile header (gradient simulé)
  profileHeader: {
    backgroundColor: '#1a0f2e',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s4,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s2,
    marginBottom: spacing.s4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBtnText: {fontSize: 16},

  profileMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.s4,
    marginBottom: spacing.s4,
  },
  avatarWrap: {position: 'relative'},
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orangeDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bgBase,
  },
  avatarEmoji: {fontSize: 36},
  levelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.teal,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.bgBase,
  },
  levelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfo: {flex: 1, minWidth: 0},
  profileName: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text100,
  },
  profileHandle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginTop: 2,
  },
  profileBio: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginTop: spacing.s2,
    lineHeight: 18,
  },

  // Genres favoris
  genresSection: {
    marginBottom: spacing.s4,
  },
  genresSectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text30,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.s2,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s1,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  genreChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.orange,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    paddingVertical: spacing.s3,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text100,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.text60,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  statDivider: {width: 1, backgroundColor: colors.border},

  // XP
  xpSection: {
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.s2,
  },
  xpLabel: {fontFamily: fonts.body, fontSize: 12, color: colors.text60},
  xpValue: {fontFamily: fonts.mono, fontSize: 12, color: colors.teal, fontWeight: '700'},
  xpTrack: {
    height: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.teal,
    borderRadius: radius.full,
  },

  // Tabs (sticky)
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgBase,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.s3,
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text60,
  },
  tabLabelActive: {color: colors.orange},
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.orange,
    borderRadius: 1,
  },

  // Tab content
  tabContent: {padding: spacing.s4},
  tabSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    marginBottom: spacing.s4,
  },
  emptyTab: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text30,
    textAlign: 'center',
    paddingVertical: spacing.s6,
  },

  // Badges
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
    marginBottom: spacing.s4,
  },
  badgeItem: {
    width: '21%',
    alignItems: 'center',
    gap: 4,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeUnlocked: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeLocked: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.4,
  },
  badgeEmoji: {fontSize: 26},
  badgeEmojiLocked: {opacity: 0.6},
  badgeNewPill: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeNewText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  badgeName: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 12,
  },
  seeAll: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.orange,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Activity
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityIconText: {fontSize: 18},
  activityText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    lineHeight: 18,
  },
  activitySub: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mango,
    marginTop: 2,
  },

  // Favorites
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  favCard: {
    width: '30.5%',
    aspectRatio: 2 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  favCardEmoji: {fontSize: 28},
  favCardRating: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },

  // Bibliothèque
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    marginHorizontal: spacing.s4,
    marginTop: spacing.s2,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.s4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  libraryBtnEmoji: {fontSize: 28},
  libraryBtnInfo: {flex: 1},
  libraryBtnLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text100,
    fontWeight: '700',
  },
  libraryBtnSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text60,
    marginTop: 2,
  },
  libraryBtnArrow: {
    fontFamily: fonts.body,
    fontSize: 24,
    color: colors.text30,
    fontWeight: '300',
  },
});

export default ProfileScreen;
