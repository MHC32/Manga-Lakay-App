// src/screens/manga/ReaderScreen.tsx
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
  Animated,
  GestureResponderEvent,
  Modal,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ChapterPages, Chapter} from '../../types/mangadex.types';
import {chapterService} from '../../services/mangadex/chapter.service';
import {useReaderStore} from '../../stores/reader.store';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {libraryService} from '../../services/firebase/library.service';
import {getPageUrl, getPageUrlDataSaver} from '../../utils/image';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {SharedDetailParams} from '../../types/navigation.types';
import {mmkv} from '../../services/cache/mmkv';

type Props = StackScreenProps<SharedDetailParams, 'Reader'>;

const {width: W, height: H} = Dimensions.get('window');

// ─── Slider simple ────────────────────────────────────────────────────────────

const ProgressSlider = ({
  value,
  total,
  onChange,
}: {
  value: number;
  total: number;
  onChange: (index: number) => void;
}) => {
  const trackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(1);

  const handlePress = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    const index = Math.round(ratio * (total - 1));
    onChange(index);
  };

  const progress = total > 1 ? value / (total - 1) : 0;

  return (
    <View
      ref={trackRef}
      style={styles.sliderTrack}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handlePress}
      onResponderMove={handlePress}>
      <View style={[styles.sliderFill, {width: `${progress * 100}%`}]} />
      <View style={[styles.sliderThumb, {left: `${progress * 100}%`}]} />
    </View>
  );
};

// ─── Écran ────────────────────────────────────────────────────────────────────

const ReaderScreen = ({route, navigation}: Props) => {
  const {chapterId, mangaId, chapterNum, originalLanguage} = route.params;
  const {user} = useAuthStore();
  const {markChapterRead, getEntry, updateStatus} = useLibraryStore();
  const {settings, showControls, setShowControls, openChapter, updateSettings} = useReaderStore();
  const insets = useSafeAreaInsets();

  const WEBTOON_LANGUAGES = ['ko', 'zh', 'zh-hk'];
  const isWebtoon =
    WEBTOON_LANGUAGES.includes(originalLanguage ?? '') ||
    settings.direction === 'webtoon';

  const [pages, setPages] = useState<ChapterPages | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showEnd, setShowEnd] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [webtoonToast, setWebtoonToast] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const controlsOpacity = useRef(new Animated.Value(0)).current;

  // ─── Chargement ─────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setShowEnd(false);
      setCurrentPage(0);

      const [p, feed] = await Promise.all([
        chapterService.getChapterPages(chapterId),
        chapterService.getChapterFeed(mangaId),
      ]);

      if (p) {
        setPages(p);
        openChapter(chapterId, mangaId, p.data.length);
        if (user) {
          markChapterRead(user.uid, mangaId, chapterId);
        }
      }

      // Trier les chapitres par numéro croissant
      const sorted = [...feed.chapters].sort(
        (a, b) => parseFloat(a.chapter ?? '0') - parseFloat(b.chapter ?? '0'),
      );
      setAllChapters(sorted);

      setIsLoading(false);
    };
    load();
  }, [chapterId, mangaId, user, markChapterRead, openChapter]);

  // ─── Proposition "Terminé" au dernier chapitre ───────────────────────────

  useEffect(() => {
    if (!showEnd || allChapters.length === 0 || !user) {
      return;
    }
    const currentChIdx = allChapters.findIndex(c => c.id === chapterId);
    const isLastChapter = currentChIdx === allChapters.length - 1;
    if (!isLastChapter) {
      return;
    }
    const entry = getEntry(mangaId);
    if (entry && entry.status !== 'completed') {
      setShowCompletedModal(true);
    }
  }, [showEnd, allChapters, chapterId, mangaId, user, getEntry]);

  // ─── Contrôles (fade in/out) ──────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showControls, controlsOpacity]);

  // ─── Toast webtoon (une seule fois) ──────────────────────────────────────

  useEffect(() => {
    if (!isWebtoon) {return;}
    const alreadyShown = mmkv.getString('user:webtoonToastShown');
    if (!alreadyShown) {
      setWebtoonToast(true);
      mmkv.setString('user:webtoonToastShown', '1');
      const t = setTimeout(() => setWebtoonToast(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isWebtoon]);

  const toggleControls = useCallback(() => {
    if (!showEnd) {
      setShowControls(!showControls);
    }
  }, [showControls, showEnd, setShowControls]);

  // ─── Navigation chapitre ──────────────────────────────────────────────────

  const currentChapterIndex = allChapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentChapterIndex > 0 ? allChapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < allChapters.length - 1
      ? allChapters[currentChapterIndex + 1]
      : null;

  const goToChapter = (ch: Chapter) => {
    navigation.replace('Reader', {
      chapterId: ch.id,
      mangaId,
      chapterNum: ch.chapter ?? '?',
    });
  };

  // ─── Pages ────────────────────────────────────────────────────────────────

  const buildPageUrls = (): string[] => {
    if (!pages) {
      return [];
    }
    const fileList =
      settings.quality === 'dataSaver' ? pages.dataSaver : pages.data;
    return fileList.map(filename =>
      settings.quality === 'dataSaver'
        ? getPageUrlDataSaver(pages.baseUrl, pages.hash, filename)
        : getPageUrl(pages.baseUrl, pages.hash, filename),
    );
  };

  const pageUrls = buildPageUrls();
  const totalPages = pageUrls.length;

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      setCurrentPage(idx);
      if (idx >= totalPages - 1 && totalPages > 0) {
        setShowEnd(true);
      }
    }
  });

  const scrollToPage = (index: number) => {
    flatListRef.current?.scrollToIndex({index, animated: true});
    setCurrentPage(index);
  };

  // ─── États ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color={colors.orange} size="large" />
        <Text style={styles.loaderText}>Chargement du chapitre...</Text>
      </View>
    );
  }

  if (!pages || totalPages === 0) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>Impossible de charger ce chapitre.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Pages ─────────────────────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={pageUrls}
        keyExtractor={(_, i) => `page-${i}`}
        horizontal={!isWebtoon && settings.direction === 'rtl'}
        inverted={!isWebtoon && settings.direction === 'rtl'}
        pagingEnabled={!isWebtoon}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{itemVisiblePercentThreshold: 50}}
        renderItem={({item}) => (
          <TouchableOpacity
            activeOpacity={1}
            onPress={toggleControls}
            style={isWebtoon ? styles.webtoonPageContainer : styles.pageContainer}>
            <Image
              source={{uri: item}}
              style={isWebtoon ? styles.webtoonPage : styles.page}
              resizeMode={isWebtoon ? 'cover' : 'contain'}
            />
          </TouchableOpacity>
        )}
      />

      {/* ── Contrôles overlay (fade) ──────────────────────────────────────── */}
      {!showEnd && (
        <Animated.View
          style={[styles.controlsOverlay, {opacity: controlsOpacity}]}
          pointerEvents={showControls ? 'box-none' : 'none'}>
          {/* Header */}
          <View style={[styles.controlsTop, {paddingTop: insets.top + spacing.s3}]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>←</Text>
            </TouchableOpacity>
            <View style={styles.titleWrap}>
              <Text style={styles.mangaTitleText} numberOfLines={1}>
                {/* Le titre vient du mangaId — simplifié ici */}
                Chapitre {chapterNum}
              </Text>
            </View>
            <TouchableOpacity style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.controlsBottom}>
            {/* Slider + compteur */}
            <View style={styles.progressRow}>
              <ProgressSlider
                value={currentPage}
                total={totalPages}
                onChange={scrollToPage}
              />
              <Text style={styles.pageCount}>
                {currentPage + 1} / {totalPages}
              </Text>
            </View>

            {/* Dots de progression */}
            <View style={styles.dotsRow}>
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
                const segment = Math.floor(
                  (currentPage / (totalPages - 1)) * (Math.min(5, totalPages) - 1),
                );
                return (
                  <View
                    key={i}
                    style={[styles.dot, i === segment && styles.dotActive]}
                  />
                );
              })}
            </View>

            {/* Boutons chap précédent / suivant */}
            <View style={styles.chapNav}>
              <TouchableOpacity
                style={[styles.chapNavBtn, !prevChapter && styles.chapNavBtnDisabled]}
                onPress={() => prevChapter && goToChapter(prevChapter)}
                disabled={!prevChapter}
                activeOpacity={0.7}>
                <Text style={styles.chapNavBtnText}>← Chap. précédent</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modeBtn}>
                <Text style={styles.modeBtnText}>
                  {settings.direction === 'rtl' ? '🔃 D→G' : '🔃 G→D'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  updateSettings({direction: isWebtoon ? 'rtl' : 'webtoon'})
                }
                style={styles.modeBtn}>
                <Text style={styles.modeBtnText}>
                  {isWebtoon ? '📖 Manga' : '📜 Webtoon'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chapNavBtn, !nextChapter && styles.chapNavBtnDisabled]}
                onPress={() => nextChapter && goToChapter(nextChapter)}
                disabled={!nextChapter}
                activeOpacity={0.7}>
                <Text style={styles.chapNavBtnText}>Chap. suivant →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── Overlay fin de chapitre ───────────────────────────────────────── */}
      {showEnd && (
        <View style={styles.chapterEnd}>
          <Text style={styles.endEmoji}>🎉</Text>
          <Text style={styles.endTitle}>Chapitre terminé !</Text>
          <Text style={styles.endSub}>Chapitre {chapterNum}</Text>
          <View style={styles.endButtons}>
            {nextChapter ? (
              <TouchableOpacity
                style={styles.endBtnPrimary}
                onPress={() => goToChapter(nextChapter)}
                activeOpacity={0.85}>
                <Text style={styles.endBtnPrimaryText}>
                  ▶ Chapitre {nextChapter.chapter} — Suivant
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.endBtnPrimary, {opacity: 0.4}]}>
                <Text style={styles.endBtnPrimaryText}>Dernier chapitre disponible</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.endBtnOutline}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}>
              <Text style={styles.endBtnOutlineText}>↩ Retour à la fiche</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Toast Mode Webtoon ────────────────────────────────────────────── */}
      {webtoonToast && (
        <View style={styles.webtoonToast} pointerEvents="none">
          <Text style={styles.webtoonToastText}>
            📜 Mode Webtoon activé — scroll vers le bas
          </Text>
        </View>
      )}

      {/* ── Modal proposition "Terminé" ───────────────────────────────────── */}
      <Modal
        visible={showCompletedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletedModal(false)}>
        <View style={styles.completedOverlay}>
          <View style={styles.completedSheet}>
            <Text style={styles.completedEmoji}>🎉</Text>
            <Text style={styles.completedTitle}>Fini !</Text>
            <Text style={styles.completedDesc}>
              Tu as lu le dernier chapitre. Marquer ce manga comme "Terminé" ?
            </Text>
            <TouchableOpacity
              style={styles.completedBtnYes}
              onPress={async () => {
                if (user) {
                  await libraryService.updateStatus(user.uid, mangaId, 'completed');
                  updateStatus(user.uid, mangaId, 'completed');
                }
                setShowCompletedModal(false);
              }}
              activeOpacity={0.85}>
              <Text style={styles.completedBtnYesText}>Oui, c'est terminé ! ✅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.completedBtnNo}
              onPress={() => setShowCompletedModal(false)}
              activeOpacity={0.85}>
              <Text style={styles.completedBtnNoText}>Non, pas encore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {color: colors.text60, marginTop: spacing.s3, fontSize: 14},
  errorText: {color: colors.error, fontSize: 14, marginBottom: spacing.s4},
  backLink: {color: colors.orange, fontSize: 14},

  // Pages
  pageContainer: {
    width: W,
    height: H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {width: W, height: H},

  // Pages webtoon (scroll vertical)
  webtoonPageContainer: {
    width: W,
  },
  webtoonPage: {
    width: W,
    height: undefined,
    aspectRatio: 0.7,
  },

  // Toast webtoon
  webtoonToast: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderRadius: radius.full,
  },
  webtoonToastText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },

  // Controls overlay
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  controlsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s3,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {color: '#fff', fontSize: 18, fontFamily: fonts.bodySemiBold},
  titleWrap: {flex: 1, alignItems: 'center'},
  mangaTitleText: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  controlsBottom: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s8,
  },

  // Slider
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    marginBottom: spacing.s2,
  },
  sliderTrack: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
  },
  sliderThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.orange,
    marginLeft: -8,
    top: 2,
    elevation: 4,
  } as any,
  pageCount: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.text60,
    minWidth: 40,
    textAlign: 'right',
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: spacing.s3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 14,
    backgroundColor: colors.orange,
    borderRadius: radius.full,
  },

  // Chap nav
  chapNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chapNavBtnDisabled: {opacity: 0.3},
  chapNavBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  modeBtn: {
    paddingHorizontal: spacing.s3,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  modeBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    fontWeight: '700',
    color: colors.orange,
  },

  // Chapter end overlay
  chapterEnd: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s4,
    paddingHorizontal: spacing.s8,
  },
  endEmoji: {fontSize: 60},
  endTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    fontWeight: '900',
    color: colors.text100,
    textAlign: 'center',
  },
  endSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    textAlign: 'center',
  },
  endButtons: {
    width: '100%',
    gap: spacing.s3,
    marginTop: spacing.s2,
  },
  endBtnPrimary: {
    backgroundColor: colors.orange,
    paddingVertical: spacing.s4,
    borderRadius: radius.xxl,
    alignItems: 'center',
  },
  endBtnPrimaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  endBtnOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.s4,
    borderRadius: radius.xxl,
    alignItems: 'center',
  },
  endBtnOutlineText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text100,
  },

  // Modal proposition "Terminé"
  completedOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  completedSheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.s6,
    alignItems: 'center',
    gap: spacing.s3,
  },
  completedEmoji: {
    fontSize: 48,
    marginBottom: spacing.s2,
  },
  completedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    fontWeight: '900',
    color: colors.text100,
  },
  completedDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    textAlign: 'center',
    marginBottom: spacing.s2,
  },
  completedBtnYes: {
    width: '100%',
    backgroundColor: colors.orange,
    paddingVertical: spacing.s4,
    borderRadius: radius.xxl,
    alignItems: 'center',
  },
  completedBtnYesText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  completedBtnNo: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.s4,
    borderRadius: radius.xxl,
    alignItems: 'center',
  },
  completedBtnNoText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text100,
  },
});

export default ReaderScreen;
