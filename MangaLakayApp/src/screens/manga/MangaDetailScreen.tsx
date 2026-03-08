// src/screens/manga/MangaDetailScreen.tsx
import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Manga, MangaStats, Chapter, LibraryStatus} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {statisticsService} from '../../services/mangadex/statistics.service';
import {chapterService} from '../../services/mangadex/chapter.service';
import {ratingService} from '../../services/firebase/rating.service';
import {useLibraryStore} from '../../stores/library.store';
import {useAuthStore} from '../../stores/auth.store';
import {libraryService} from '../../services/firebase/library.service';
import {EmptyState} from '../../components/ui';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {getTitle, getDescription} from '../../utils/locale';
import {formatRelativeDate} from '../../utils/date';
import {SharedDetailParams} from '../../types/navigation.types';
import {useSearchStore} from '../../stores/search.store';

type Props = StackScreenProps<SharedDetailParams, 'MangaDetail'>;

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ongoing: 'En cours',
  completed: 'Terminé',
  hiatus: 'En pause',
  cancelled: 'Annulé',
};

const STATUS_COLOR: Record<string, string> = {
  ongoing: colors.teal,
  completed: colors.success,
  hiatus: colors.mango,
  cancelled: colors.text60,
};

const DEMO_LABEL: Record<string, string> = {
  shounen: 'Shounen',
  shoujo: 'Shoujo',
  seinen: 'Seinen',
  josei: 'Josei',
};

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
};

const STATUS_LIB_LABEL: Record<string, string> = {
  reading:      'En cours',
  plan_to_read: 'Planifié',
  completed:    'Terminé',
  dropped:      'Abandonné',
};

const STATUS_LIB_EMOJI: Record<string, string> = {
  reading:      '📖',
  plan_to_read: '📌',
  completed:    '✅',
  dropped:      '❌',
};

// ─── Composants utilitaires ───────────────────────────────────────────────────

const StatusBadge = ({label, color}: {label: string; color: string}) => (
  <View style={[styles.badge, {borderColor: color + '55', backgroundColor: color + '22'}]}>
    <Text style={[styles.badgeText, {color}]}>{label}</Text>
  </View>
);

const QuickStat = ({value, label, color}: {value: string; label: string; color: string}) => (
  <View style={styles.quickStat}>
    <Text style={[styles.quickStatValue, {color}]}>{value}</Text>
    <Text style={styles.quickStatLabel}>{label}</Text>
  </View>
);

// ─── Écran ────────────────────────────────────────────────────────────────────

type Tab = 'info' | 'chapitres' | 'similaires';

const MangaDetailScreen = ({route, navigation}: Props) => {
  const {mangaId} = route.params;
  const {user} = useAuthStore();
  const {isInLibrary, getEntry} = useLibraryStore();
  const {setPendingTag} = useSearchStore();
  const insets = useSafeAreaInsets();

  const [manga, setManga] = useState<Manga | null>(null);
  const [stats, setStats] = useState<MangaStats | null>(null);
  const [communityRating, setCommunityRating] = useState<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [similaires, setSimilaires] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [chapterOrder, setChapterOrder] = useState<'asc' | 'desc'>('asc');
  const [descExpanded, setDescExpanded] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [addingToLib, setAddingToLib] = useState(false);
  const [guestModal, setGuestModal] = useState<'library' | 'rating' | null>(null);
  const [statusModal, setStatusModal] = useState(false);
  const [ratingToast, setRatingToast] = useState<string | null>(null);

  const inLibrary = isInLibrary(mangaId);
  const libraryEntry = getEntry(mangaId);

  // ─── Chargement ─────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [m, s, c, cr] = await Promise.all([
        mangaService.getMangaById(mangaId),
        statisticsService.getMangaStats(mangaId),
        chapterService.getChapterFeed(mangaId),
        ratingService.getCommunityRating(mangaId),
      ]);
      setManga(m);
      setStats(s);
      setChapters(c.chapters);
      setCommunityRating(cr?.averageRating ?? null);
      setIsLoading(false);
    };
    load();
  }, [mangaId]);

  // Charger la note perso si connecté + en bibliothèque
  useEffect(() => {
    if (user && libraryEntry) {
      setUserRating(libraryEntry.userRating);
    }
  }, [user, libraryEntry]);

  // Charger similaires quand on clique l'onglet
  const loadSimilaires = useCallback(async () => {
    if (!manga || similaires.length > 0) {
      return;
    }
    const genreTagIds = manga.tags
      .filter(t => t.group === 'genre')
      .slice(0, 2)
      .map(t => t.id);
    if (genreTagIds.length === 0) {
      return;
    }
    try {
      const {mangas} = await mangaService.searchManga({
        includedTags: genreTagIds,
        limit: 6,
      });
      setSimilaires(mangas.filter(m => m.id !== mangaId).slice(0, 5));
    } catch {
      // silencieux
    }
  }, [manga, similaires, mangaId]);

  useEffect(() => {
    if (activeTab === 'similaires') {
      loadSimilaires();
    }
  }, [activeTab, loadSimilaires]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleAddToLibrary = () => {
    if (!user) {
      setGuestModal('library');
      return;
    }
    setStatusModal(true);
  };

  const handleSelectStatus = async (status: LibraryStatus) => {
    setStatusModal(false);
    if (!user) {return;}
    setAddingToLib(true);
    try {
      if (inLibrary) {
        await libraryService.updateStatus(user.uid, mangaId, status);
      } else {
        await libraryService.addToLibrary(user.uid, mangaId, status);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier la bibliothèque.');
    } finally {
      setAddingToLib(false);
    }
  };

  const handleReadFirst = () => {
    const sortedChapters = [...chapters].sort((a, b) =>
      chapterOrder === 'asc'
        ? parseFloat(a.chapter ?? '0') - parseFloat(b.chapter ?? '0')
        : parseFloat(b.chapter ?? '0') - parseFloat(a.chapter ?? '0'),
    );
    const first = sortedChapters[0];
    if (!first) {
      return;
    }
    navigation.navigate('Reader', {
      chapterId: first.id,
      mangaId,
      chapterNum: first.chapter ?? '1',
    });
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      setGuestModal('rating');
      return;
    }
    if (!inLibrary) {
      setGuestModal('library');
      return;
    }
    setRatingLoading(true);
    try {
      const prev = userRating;
      setUserRating(rating); // optimiste
      if (prev === null) {
        await ratingService.submitRating(user.uid, mangaId, rating);
      } else {
        await ratingService.updateRating(user.uid, mangaId, rating);
      }
      setRatingToast(`Note de ${rating}/10 enregistrée !`);
      setTimeout(() => setRatingToast(null), 2500);
    } catch {
      setUserRating(userRating); // rollback
      Alert.alert('Erreur', 'Impossible de soumettre ta note.');
    } finally {
      setRatingLoading(false);
    }
  };

  // ─── Chapitres triés + marqués ────────────────────────────────────────────

  const sortedChapters = [...chapters].sort((a, b) =>
    chapterOrder === 'asc'
      ? parseFloat(a.chapter ?? '0') - parseFloat(b.chapter ?? '0')
      : parseFloat(b.chapter ?? '0') - parseFloat(a.chapter ?? '0'),
  );

  const frChapters = chapters.filter(ch => ch.translatedLanguage === 'fr');
  const isEnglishOnly = chapters.length > 0 && frChapters.length === 0;

  const readChapterIds = new Set(libraryEntry?.chaptersRead ?? []);

  // ─── États de chargement / erreur ─────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (!manga) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Manga introuvable"
          subtitle="Ce manga n'existe pas ou a été supprimé."
          ctaLabel="Retour"
          onCta={() => navigation.goBack()}
        />
      </View>
    );
  }

  const title = getTitle(manga.title);
  const titleOriginal = manga.title['ja-ro'] ?? manga.title.ja ?? null;
  const description = getDescription(manga.description);
  const followsStr = stats?.follows
    ? stats.follows >= 1_000_000
      ? (stats.follows / 1_000_000).toFixed(1) + 'M'
      : stats.follows >= 1_000
      ? (stats.follows / 1_000).toFixed(0) + 'k'
      : String(stats.follows)
    : '—';

  return (
    <View style={styles.screen}>
      {/* ── HERO (scrollable uniquement) ───────────────────────────────── */}
      <View style={styles.hero}>
        {manga.coverUrl ? (
          <Image
            source={{uri: manga.coverUrl}}
            style={styles.heroBg}
            resizeMode="cover"
            blurRadius={8}
          />
        ) : (
          <View style={[styles.heroBg, {backgroundColor: '#1a0533'}]} />
        )}
        <View style={styles.heroGradient} />

        {/* Nav overlay */}
        <View style={[styles.heroNav, {top: insets.top + spacing.s2}]}>
          <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.heroNavIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.heroNavRight}>
            <TouchableOpacity
              style={styles.heroNavBtn}
              onPress={() => {
                Share.share({
                  title: title,
                  message: `Découvre "${title}" sur MangaLakay !\nhttps://mangadex.org/manga/${mangaId}`,
                });
              }}>
              <Text style={styles.heroNavIcon}>🔗</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroNavBtn}
              onPress={handleAddToLibrary}
              activeOpacity={0.7}>
              <Text style={styles.heroNavIcon}>{inLibrary ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cover droite + contenu gauche */}
        <View style={styles.heroBody}>
          <View style={styles.heroLeft}>
            <View style={styles.heroBadges}>
              <StatusBadge
                label={STATUS_LABEL[manga.status] ?? manga.status}
                color={STATUS_COLOR[manga.status] ?? colors.text60}
              />
              {manga.demographic && (
                <StatusBadge
                  label={DEMO_LABEL[manga.demographic] ?? manga.demographic}
                  color={colors.teal}
                />
              )}
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>{title}</Text>
            {titleOriginal && (
              <Text style={styles.heroOriginal} numberOfLines={1}>{titleOriginal}</Text>
            )}
            <Text style={styles.heroAuthor} numberOfLines={1}>
              {manga.authors[0] ? `✍️ ${manga.authors[0].name}` : ''}
              {manga.year ? ` · ${manga.year}` : ''}
            </Text>
            <View style={styles.heroScores}>
              {communityRating !== null && (
                <View style={styles.scoreBadgeML}>
                  <Text style={styles.scoreBadgeMLText}>★ {communityRating.toFixed(1)} ML</Text>
                </View>
              )}
              {stats?.rating.average && (
                <View style={styles.scoreBadgeMD}>
                  <Text style={styles.scoreBadgeMDText}>
                    {stats.rating.average.toFixed(1)} MangaDex
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Cover droite */}
          <View style={styles.heroCoverWrap}>
            {manga.coverUrl ? (
              <Image
                source={{uri: manga.coverUrl}}
                style={styles.heroCover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.heroCover, styles.heroCoverPlaceholder]}>
                <Text style={{fontSize: 40}}>📖</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── TABS (fixe, hors ScrollView) ─────────────────────────────── */}
      <View style={styles.tabs}>
        {(['info', 'chapitres', 'similaires'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'info'
                ? 'Info'
                : tab === 'chapitres'
                ? chapters.length > 0
                  ? `Chapitres (${chapters.length})`
                  : 'Chapitres'
                : 'Similaires'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── CONTENU (scrollable) ─────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>

        {/* ── TAB INFO ──────────────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            {/* Stats rapides */}
            <View style={styles.quickStats}>
              <QuickStat
                value={manga.lastChapter ?? (chapters.length > 0 ? String(chapters.length) : '—')}
                label="Chapitres"
                color={colors.orange}
              />
              <QuickStat
                value={followsStr}
                label="Follows"
                color={colors.mango}
              />
              {stats?.rating.average && (
                <QuickStat
                  value={stats.rating.average.toFixed(1)}
                  label="Score MDex"
                  color={colors.teal}
                />
              )}
            </View>

            {/* Synopsis */}
            <Text style={styles.sectionLabel}>Synopsis</Text>
            {description ? (
              <>
                <Text
                  style={styles.description}
                  numberOfLines={descExpanded ? undefined : 4}>
                  {description}
                </Text>
                <TouchableOpacity onPress={() => setDescExpanded(v => !v)}>
                  <Text style={styles.readMore}>
                    {descExpanded ? 'Réduire ▲' : 'Voir plus ▼'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noDesc}>Aucune description disponible.</Text>
            )}

            {/* Genres / tags */}
            <Text style={styles.sectionLabel}>Genres</Text>
            <View style={styles.tagsWrap}>
              {manga.tags.slice(0, 10).map(tag => (
                <TouchableOpacity
                  key={tag.id}
                  style={styles.tagItem}
                  onPress={() => {
                    const label = tag.name.fr ?? tag.name.en ?? tag.id;
                    setPendingTag(tag.id, label);
                    navigation.getParent()?.navigate('SearchStack');
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.tagText}>
                    {tag.name.fr ?? tag.name.en ?? tag.id}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Infos grille */}
            <Text style={styles.sectionLabel}>Informations</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Statut</Text>
                <Text style={styles.infoValue}>
                  {STATUS_LABEL[manga.status] ?? manga.status}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Publication</Text>
                <Text style={styles.infoValue}>{manga.year ?? '—'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Volumes</Text>
                <Text style={styles.infoValue}>{manga.lastVolume ?? '—'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Langue</Text>
                <Text style={styles.infoValue}>
                  {LANG_FLAGS[manga.originalLanguage] ?? '🌐'}{' '}
                  {manga.originalLanguage.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Auteurs */}
            {manga.authors.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Auteur & Artiste</Text>
                <View style={styles.authorWrap}>
                  {manga.authors.map(a => (
                    <View key={a.id} style={styles.authorChip}>
                      <Text style={styles.authorChipText}>✍️ {a.name}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Notation 1-10 étoiles */}
            <View style={styles.ratingCard}>
              <Text style={styles.ratingTitle}>Ma note</Text>
              <View style={styles.starsRow}>
                {Array.from({length: 10}, (_, i) => i + 1).map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => !ratingLoading && handleRate(n)}
                    activeOpacity={0.7}
                    hitSlop={{top: 8, bottom: 8, left: 2, right: 2}}>
                    <Text
                      style={[
                        styles.star,
                        userRating !== null && n <= userRating
                          ? styles.starActive
                          : styles.starInactive,
                      ]}>
                      ⭐
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingHint}>
                {userRating !== null ? (
                  <>
                    Ta note actuelle :{' '}
                    <Text style={{color: colors.orange, fontWeight: '700'}}>
                      {userRating}/10
                    </Text>
                  </>
                ) : !user ? (
                  'Connecte-toi pour noter'
                ) : !inLibrary ? (
                  'Ajoute ce manga pour noter'
                ) : (
                  'Tape une étoile pour noter'
                )}
              </Text>
            </View>

            <View style={{height: 120}} />
          </View>
        )}

        {/* ── TAB CHAPITRES ─────────────────────────────────────────────── */}
        {activeTab === 'chapitres' && (
          <View style={styles.tabContent}>
            {/* Toolbar langue + ordre */}
            <View style={styles.chapToolbar}>
              <View style={styles.chapLangChips}>
                <View style={[styles.chipLang, styles.chipLangActive]}>
                  <Text style={styles.chipLangActiveText}>🇫🇷 FR</Text>
                </View>
                <View style={styles.chipLang}>
                  <Text style={styles.chipLangText}>🇬🇧 EN</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setChapterOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
                style={styles.orderBtn}>
                <Text style={styles.orderBtnText}>
                  {chapterOrder === 'asc' ? '⬆️ Croissant' : '⬇️ Décroissant'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEnglishOnly && (
              <View style={styles.englishOnlyBanner}>
                <Text style={styles.englishOnlyFlag}>🇬🇧</Text>
                <View style={styles.englishOnlyInfo}>
                  <Text style={styles.englishOnlyTitle}>Disponible en anglais uniquement</Text>
                  <Text style={styles.englishOnlyDesc}>
                    Ce manga n'a pas encore de traduction française sur MangaDex.
                  </Text>
                </View>
              </View>
            )}

            {sortedChapters.length === 0 ? (
              <View style={styles.noChaptersBox}>
                <Text style={styles.noChaptersIcon}>📖</Text>
                <Text style={styles.noChaptersTitle}>
                  {manga.lastChapter
                    ? `${manga.lastChapter} chapitres disponibles`
                    : 'Chapitres non disponibles'}
                </Text>
                <Text style={styles.noChaptersDesc}>
                  {manga.lastChapter
                    ? 'Ce manga est disponible sur MangaPlus ou une autre plateforme officielle. Les chapitres ne peuvent pas être lus directement ici.'
                    : 'Aucun chapitre traduit en français ou en anglais n\'est disponible pour l\'instant.'}
                </Text>
              </View>
            ) : (
              sortedChapters.map(ch => {
                const isRead = readChapterIds.has(ch.id);
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[styles.chapterRow, isRead && styles.chapterRowRead]}
                    onPress={() =>
                      navigation.navigate('Reader', {
                        chapterId: ch.id,
                        mangaId,
                        chapterNum: ch.chapter ?? '?',
                      })
                    }
                    activeOpacity={0.7}>
                    <View style={styles.chLeft}>
                      <Text style={[styles.chNum, isRead && styles.chRead]}>
                        Ch.{ch.chapter ?? '?'}
                      </Text>
                      <View style={styles.chInfo}>
                        {ch.title ? (
                          <Text style={[styles.chTitle, isRead && styles.chRead]} numberOfLines={1}>
                            {ch.title}
                          </Text>
                        ) : null}
                        <Text style={styles.chMeta}>
                          {ch.scanlationGroup ? `${ch.scanlationGroup} · ` : ''}
                          {formatRelativeDate(ch.publishAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.chRight}>
                      {isRead ? (
                        <Text style={styles.chCheck}>✓</Text>
                      ) : (
                        <View style={styles.chRightContent}>
                          <View style={[
                            styles.chLangBadge,
                            ch.translatedLanguage === 'fr' ? styles.chLangBadgeFR : styles.chLangBadgeEN,
                          ]}>
                            <Text style={styles.chLangBadgeText}>
                              {(LANG_FLAGS[ch.translatedLanguage] ?? '🌐') + ' ' + ch.translatedLanguage.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.chPages}>{ch.pageCount}p</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{height: 120}} />
          </View>
        )}

        {/* ── TAB SIMILAIRES ────────────────────────────────────────────── */}
        {activeTab === 'similaires' && (
          <View style={styles.tabContent}>
            <Text style={styles.similairesIntro}>
              Tu as aimé {title} ? Tu vas adorer :
            </Text>
            {similaires.length === 0 ? (
              <ActivityIndicator
                color={colors.orange}
                style={{marginTop: spacing.s6}}
              />
            ) : (
              similaires.map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.simCard}
                  onPress={() => navigation.push('MangaDetail', {mangaId: m.id})}
                  activeOpacity={0.8}>
                  <View style={styles.simCover}>
                    {m.coverUrl ? (
                      <Image
                        source={{uri: m.coverUrl}}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{fontSize: 26}}>📖</Text>
                    )}
                  </View>
                  <View style={styles.simInfo}>
                    <Text style={styles.simTitle} numberOfLines={1}>
                      {getTitle(m.title)}
                    </Text>
                    {m.authors[0] && (
                      <Text style={styles.simAuthor} numberOfLines={1}>
                        {m.authors[0].name}
                      </Text>
                    )}
                    <View style={styles.simTags}>
                      {m.tags.filter(t => t.group === 'genre').slice(0, 2).map(t => (
                        <View key={t.id} style={styles.simTag}>
                          <Text style={styles.simTagText}>
                            {t.name.fr ?? t.name.en ?? t.id}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{height: 120}} />
          </View>
        )}
      </ScrollView>

      {/* ── MODAL GUEST ───────────────────────────────────────────────────── */}
      <Modal
        visible={guestModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setGuestModal(null)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setGuestModal(null)}>
          <View style={styles.guestSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.guestSheetHandle} />
            <Text style={styles.guestSheetIcon}>
              {guestModal === 'library' ? '📚' : '⭐'}
            </Text>
            <Text style={styles.guestSheetTitle}>
              {guestModal === 'library'
                ? 'Connecte-toi pour sauvegarder'
                : 'Connecte-toi pour noter'}
            </Text>
            <Text style={styles.guestSheetDesc}>
              {guestModal === 'library'
                ? 'Crée un compte gratuit pour ajouter ce manga à ta bibliothèque et suivre ta progression.'
                : 'Rejoins la communauté MangaLakay pour noter tes mangas et voir le classement.'}
            </Text>
            <TouchableOpacity
              style={styles.guestSheetBtnPrimary}
              onPress={() => {
                setGuestModal(null);
                navigation.getParent()?.navigate('Auth');
              }}>
              <Text style={styles.guestSheetBtnPrimaryText}>Créer un compte — gratis</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.guestSheetBtnSecondary}
              onPress={() => setGuestModal(null)}>
              <Text style={styles.guestSheetBtnSecondaryText}>Continuer sans compte</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL STATUT BIBLIOTHÈQUE ─────────────────────────────────────── */}
      <Modal
        visible={statusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setStatusModal(false)}>
          <View style={styles.guestSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.guestSheetHandle} />
            <Text style={styles.guestSheetTitle}>
              {inLibrary ? 'Changer le statut' : 'Ajouter à la bibliothèque'}
            </Text>
            <Text style={styles.guestSheetDesc}>
              {inLibrary
                ? `Statut actuel : ${STATUS_LIB_LABEL[libraryEntry?.status ?? 'plan_to_read']}`
                : 'Choisis où ajouter ce manga'}
            </Text>
            {(
              [
                {key: 'reading',      emoji: '📖', label: 'En cours de lecture'},
                {key: 'plan_to_read', emoji: '📌', label: 'Planifié'},
                {key: 'completed',    emoji: '✅', label: 'Terminé'},
                {key: 'dropped',      emoji: '❌', label: 'Abandonné'},
              ] as {key: LibraryStatus; emoji: string; label: string}[]
            ).map(item => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.statusOption,
                  libraryEntry?.status === item.key && styles.statusOptionActive,
                ]}
                onPress={() => handleSelectStatus(item.key)}
                activeOpacity={0.7}>
                <Text style={styles.statusOptionEmoji}>{item.emoji}</Text>
                <Text style={[
                  styles.statusOptionLabel,
                  libraryEntry?.status === item.key && styles.statusOptionLabelActive,
                ]}>
                  {item.label}
                </Text>
                {libraryEntry?.status === item.key && (
                  <Text style={styles.statusOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            {inLibrary && (
              <TouchableOpacity
                style={styles.guestSheetBtnSecondary}
                onPress={async () => {
                  setStatusModal(false);
                  if (!user) {return;}
                  try {
                    await libraryService.removeFromLibrary(user.uid, mangaId);
                  } catch {
                    Alert.alert('Erreur', 'Impossible de retirer de la bibliothèque.');
                  }
                }}>
                <Text style={[styles.guestSheetBtnSecondaryText, {color: colors.text30}]}>
                  Retirer de la bibliothèque
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── TOAST NOTATION ────────────────────────────────────────────────── */}
      {ratingToast && (
        <View style={styles.ratingToast}>
          <Text style={styles.ratingToastText}>⭐ {ratingToast}</Text>
        </View>
      )}

      {/* ── STICKY CTA ────────────────────────────────────────────────────── */}
      <View style={styles.stickyCta}>
        <TouchableOpacity
          style={[styles.btnRead, chapters.length === 0 && {opacity: 0.5}]}
          onPress={handleReadFirst}
          disabled={chapters.length === 0}
          activeOpacity={0.85}>
          <Text style={styles.btnReadText}>
            ▶ Lire{chapters.length > 0 ? ` — Chap. ${sortedChapters[0]?.chapter ?? '1'}` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btnLibrary,
            inLibrary && styles.btnLibraryActive,
          ]}
          onPress={handleAddToLibrary}
          disabled={addingToLib}
          activeOpacity={0.85}>
          {addingToLib ? (
            <ActivityIndicator color={colors.success} size="small" />
          ) : (
            <Text style={[styles.btnLibraryText, inLibrary && styles.btnLibraryActiveText]}>
              {inLibrary
                ? STATUS_LIB_EMOJI[libraryEntry?.status ?? 'plan_to_read'] + ' ' + STATUS_LIB_LABEL[libraryEntry?.status ?? 'plan_to_read']
                : '+ Biblio'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},
  contentScroll: {flex: 1},
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  hero: {
    height: 300,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.75)',
  },
  heroNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    zIndex: 10,
  },
  heroNavRight: {flexDirection: 'row', gap: spacing.s2},
  heroNavBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavIcon: {color: '#fff', fontSize: 18, fontFamily: fonts.bodySemiBold},
  heroBody: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.s4,
    paddingBottom: spacing.s4,
    gap: spacing.s3,
    zIndex: 4,
  },
  heroLeft: {flex: 1, gap: 4},
  heroBadges: {flexDirection: 'row', gap: spacing.s2, flexWrap: 'wrap'},
  badge: {
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeText: {fontSize: 10, fontWeight: '700'},
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 21,
    fontWeight: '900',
    color: colors.text100,
    lineHeight: 26,
  },
  heroOriginal: {
    fontSize: 12,
    color: colors.text30,
  },
  heroAuthor: {
    fontSize: 13,
    color: colors.text60,
  },
  heroScores: {flexDirection: 'row', gap: spacing.s2, flexWrap: 'wrap', marginTop: 2},
  scoreBadgeML: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
  },
  scoreBadgeMLText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.orange,
  },
  scoreBadgeMD: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.s2,
    paddingVertical: 2,
  },
  scoreBadgeMDText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text60,
  },
  heroCoverWrap: {
    width: 130,
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    flexShrink: 0,
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroCoverPlaceholder: {
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    backgroundColor: colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.s3,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: colors.orange},
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text30,
  },
  tabTextActive: {color: colors.orange},

  // Tab content
  tabContent: {padding: spacing.s4},

  // Stats rapides
  quickStats: {
    flexDirection: 'row',
    gap: spacing.s3,
    marginBottom: spacing.s5,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.s3,
  },
  quickStatValue: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 10,
    color: colors.text30,
    fontWeight: '600',
    marginTop: 2,
  },

  // Synopsis
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text30,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.s2,
    marginTop: spacing.s5,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    lineHeight: 24,
  },
  readMore: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.orange,
    fontWeight: '600',
    marginTop: 4,
  },
  noDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text30,
    fontStyle: 'italic',
  },

  // Tags
  tagsWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2},
  tagItem: {
    paddingHorizontal: spacing.s3,
    paddingVertical: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {fontSize: 12, fontWeight: '500', color: colors.text60},

  // Info grille
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s3,
  },
  infoItem: {
    flex: 1,
    minWidth: '42%',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.s3,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text30,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {fontSize: 14, fontWeight: '600', color: colors.text100},

  // Auteurs
  authorWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2},
  authorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authorChipText: {fontSize: 13, fontWeight: '600', color: colors.text100},

  // Rating
  ratingCard: {
    marginTop: spacing.s5,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.s4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text100,
    marginBottom: spacing.s4,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginBottom: spacing.s3,
  },
  star: {fontSize: 26},
  starActive: {opacity: 1},
  starInactive: {opacity: 0.3},
  ratingHint: {
    fontFamily: fonts.body,
    textAlign: 'center',
    fontSize: 12,
    color: colors.text30,
  },

  // Chapitres toolbar
  chapToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s3,
  },
  chapLangChips: {flexDirection: 'row', gap: spacing.s2},
  chipLang: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLangActive: {
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderColor: colors.teal,
  },
  chipLangText: {fontSize: 11, color: colors.text60, fontWeight: '600'},
  chipLangActiveText: {fontSize: 11, color: colors.teal, fontWeight: '700'},
  orderBtn: {paddingVertical: 4},
  orderBtnText: {fontSize: 12, color: colors.text60},

  // Ligne chapitre
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chapterRowRead: {opacity: 0.55},
  chLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.s3, flex: 1},
  chNum: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: colors.orange,
    minWidth: 40,
  },
  chInfo: {flex: 1},
  chTitle: {fontSize: 13, fontWeight: '600', color: colors.text100},
  chRead: {color: colors.text30},
  chMeta: {fontSize: 11, color: colors.text60, marginTop: 2},
  chRight: {alignItems: 'center'},
  chCheck: {fontSize: 14, color: colors.success},
  chRightContent: {
    alignItems: 'flex-end',
    gap: 4,
  },
  chLangBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chLangBadgeFR: {
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.3)',
  },
  chLangBadgeEN: {
    backgroundColor: 'rgba(255,209,102,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.3)',
  },
  chLangBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text60,
  },
  chPages: {fontSize: 10, color: colors.text60},

  // Similaires
  similairesIntro: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    marginBottom: spacing.s4,
  },
  simCard: {
    flexDirection: 'row',
    gap: spacing.s3,
    marginBottom: spacing.s3,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  simCover: {
    width: 64,
    height: 92,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  simInfo: {flex: 1, padding: spacing.s3, justifyContent: 'center'},
  simTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text100,
    marginBottom: 2,
  },
  simAuthor: {fontSize: 12, color: colors.text60, marginBottom: spacing.s2},
  simTags: {flexDirection: 'row', gap: spacing.s2},
  simTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
  },
  simTagText: {fontSize: 10, color: colors.text60},

  // Sticky CTA
  stickyCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.s2,
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s8,
    backgroundColor: 'rgba(10,14,26,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btnRead: {
    flex: 3,
    backgroundColor: colors.orange,
    paddingVertical: spacing.s4,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnReadText: {
    fontFamily: fonts.bodySemiBold,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  btnLibrary: {
    flex: 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.s4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLibraryActive: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  btnLibraryText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text100,
    fontWeight: '600',
    fontSize: 14,
  },
  btnLibraryActiveText: {color: colors.success},

  // Chapitres indisponibles
  noChaptersBox: {
    alignItems: 'center',
    paddingVertical: spacing.s7,
    paddingHorizontal: spacing.s5,
    gap: spacing.s3,
  },
  noChaptersIcon: {fontSize: 48},
  noChaptersTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text100,
    textAlign: 'center',
  },
  noChaptersDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal guest
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  guestSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.s5,
    paddingBottom: spacing.s8,
    paddingTop: spacing.s4,
    alignItems: 'center',
    gap: spacing.s3,
  },
  guestSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.s2,
  },
  guestSheetIcon: {fontSize: 40},
  guestSheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    fontWeight: '900',
    color: colors.text100,
    textAlign: 'center',
  },
  guestSheetDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.s2,
  },
  guestSheetBtnPrimary: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radius.lg,
    width: '100%',
    alignItems: 'center',
  },
  guestSheetBtnPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 15},
  guestSheetBtnSecondary: {
    paddingVertical: spacing.s3,
    width: '100%',
    alignItems: 'center',
  },
  guestSheetBtnSecondaryText: {
    fontSize: 13,
    color: colors.text30,
    fontWeight: '600',
  },

  // Modal statut bibliothèque
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingVertical: spacing.s3,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.md,
    marginBottom: spacing.s2,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    borderColor: colors.orange,
    backgroundColor: 'rgba(255,107,53,0.1)',
  },
  statusOptionEmoji: {fontSize: 20},
  statusOptionLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text60,
  },
  statusOptionLabelActive: {color: colors.orange},
  statusOptionCheck: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.orange,
    fontWeight: '700',
  },

  // Toast notation
  ratingToast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: colors.teal,
    borderRadius: radius.full,
    paddingHorizontal: spacing.s5,
    paddingVertical: spacing.s3,
    zIndex: 100,
  },
  ratingToastText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  englishOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    marginHorizontal: spacing.s4,
    marginBottom: spacing.s3,
    borderRadius: radius.sm,
  },
  englishOnlyFlag: {fontSize: 22},
  englishOnlyInfo: {flex: 1},
  englishOnlyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text100,
    marginBottom: 2,
  },
  englishOnlyDesc: {
    fontSize: 12,
    color: colors.text60,
  },
});

export default MangaDetailScreen;
