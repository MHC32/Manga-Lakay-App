import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {Manga, MangaStats, Chapter} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {statisticsService} from '../../services/mangadex/statistics.service';
import {chapterService} from '../../services/mangadex/chapter.service';
import {useLibraryStore} from '../../stores/library.store';
import {useAuthStore} from '../../stores/auth.store';
import {libraryService} from '../../services/firebase/library.service';
import {Badge, EmptyState} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {getTitle, getDescription} from '../../utils/locale';
import {formatRelativeDate} from '../../utils/date';
import {HomeStackParamList} from '../../types/navigation.types';

type Props = StackScreenProps<HomeStackParamList, 'MangaDetail'>;

const statusLabel: Record<string, string> = {
  ongoing: 'En cours',
  completed: 'Terminé',
  hiatus: 'En pause',
  cancelled: 'Annulé',
};

const MangaDetailScreen = ({route, navigation}: Props) => {
  const {mangaId} = route.params;
  const {user} = useAuthStore();
  const {isInLibrary, addToLibrary} = useLibraryStore();

  const [manga, setManga] = useState<Manga | null>(null);
  const [stats, setStats] = useState<MangaStats | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'chapters'>('info');

  const inLibrary = isInLibrary(mangaId);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [m, s, c] = await Promise.all([
        mangaService.getMangaById(mangaId),
        statisticsService.getMangaStats(mangaId),
        chapterService.getChapterFeed(mangaId),
      ]);
      setManga(m);
      setStats(s);
      setChapters(c.chapters);
      setIsLoading(false);
    };
    load();
  }, [mangaId]);

  const handleAddToLibrary = async () => {
    if (!user) {
      return;
    }
    await libraryService.addToLibrary(user.uid, mangaId, 'plan_to_read');
  };

  const handleReadFirst = () => {
    if (chapters.length === 0) {
      return;
    }
    navigation.navigate('Reader', {
      chapterId: chapters[0].id,
      mangaId,
      chapterNum: chapters[0].chapter ?? '1',
    });
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <ActivityIndicator
          color={colors.orange}
          size="large"
          style={styles.loader}
        />
      </ScreenWrapper>
    );
  }

  if (!manga) {
    return (
      <ScreenWrapper>
        <EmptyState
          title="Manga introuvable"
          subtitle="Ce manga n'existe pas ou a été supprimé."
          ctaLabel="Retour"
          onCta={() => navigation.goBack()}
        />
      </ScreenWrapper>
    );
  }

  const title = getTitle(manga.title);
  const description = getDescription(manga.description);

  return (
    <ScreenWrapper edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero cover */}
        <View style={styles.hero}>
          {manga.coverUrl ? (
            <Image
              source={{uri: manga.coverUrl}}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.coverPlaceholder]} />
          )}
          <View style={styles.heroOverlay} />
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>

          {/* Auteurs */}
          {manga.authors.length > 0 && (
            <Text style={styles.author}>
              {manga.authors.map(a => a.name).join(', ')}
            </Text>
          )}

          {/* Badges */}
          <View style={styles.badges}>
            <Badge
              label={statusLabel[manga.status] ?? manga.status}
              variant={manga.status === 'ongoing' ? 'orange' : 'default'}
            />
            {manga.demographic && (
              <Badge
                label={manga.demographic}
                variant="teal"
                style={styles.badgeGap}
              />
            )}
          </View>

          {/* Score MangaDex */}
          {stats?.rating.average && (
            <Text style={styles.score}>
              ★ {stats.rating.average.toFixed(1)} MangaDex
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnRead}
              onPress={handleReadFirst}
              disabled={chapters.length === 0}>
              <Text style={styles.btnReadText}>Lire</Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                style={[
                  styles.btnLibrary,
                  inLibrary && styles.btnLibraryActive,
                ]}
                onPress={handleAddToLibrary}
                disabled={inLibrary}>
                <Text style={styles.btnLibraryText}>
                  {inLibrary ? '✓ Bibliothèque' : '+ Bibliothèque'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['info', 'chapters'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.tabTextActive,
                  ]}>
                  {tab === 'info' ? 'Info' : `Chapitres (${chapters.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {activeTab === 'info' ? (
            <View>
              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : (
                <Text style={styles.noDesc}>Aucune description disponible.</Text>
              )}
              {/* Tags */}
              <View style={styles.tags}>
                {manga.tags.slice(0, 8).map(tag => (
                  <Badge
                    key={tag.id}
                    label={tag.name.fr ?? tag.name.en ?? tag.id}
                    variant="default"
                    style={styles.tagGap}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View>
              {chapters.length === 0 ? (
                <EmptyState title="Aucun chapitre disponible" />
              ) : (
                chapters.map(ch => (
                  <TouchableOpacity
                    key={ch.id}
                    style={styles.chapterRow}
                    onPress={() =>
                      navigation.navigate('Reader', {
                        chapterId: ch.id,
                        mangaId,
                        chapterNum: ch.chapter ?? '?',
                      })
                    }>
                    <Text style={styles.chapterNum}>
                      Chapitre {ch.chapter ?? '?'}
                      {ch.title ? ` — ${ch.title}` : ''}
                    </Text>
                    <Text style={styles.chapterDate}>
                      {formatRelativeDate(ch.publishAt)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loader: {flex: 1, alignSelf: 'center'},
  hero: {height: 280, position: 'relative'},
  heroImage: {width: '100%', height: '100%'},
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.5)',
  },
  coverPlaceholder: {backgroundColor: colors.bgElevated},
  backBtn: {
    position: 'absolute',
    top: spacing.s4,
    left: spacing.s4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {color: colors.text100, fontSize: 20},
  content: {padding: spacing.s4},
  title: {
    color: colors.text100,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  author: {
    color: colors.text60,
    fontSize: 14,
    marginBottom: spacing.s3,
  },
  badges: {flexDirection: 'row', marginBottom: spacing.s3},
  badgeGap: {marginLeft: spacing.s2},
  score: {
    color: colors.mango,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.s4,
  },
  actions: {flexDirection: 'row', gap: spacing.s3, marginBottom: spacing.s5},
  btnRead: {
    flex: 1,
    backgroundColor: colors.orange,
    paddingVertical: spacing.s4,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnReadText: {color: '#fff', fontWeight: '700', fontSize: 16},
  btnLibrary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.text60,
    paddingVertical: spacing.s4,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnLibraryActive: {borderColor: colors.success},
  btnLibraryText: {color: colors.text100, fontWeight: '600', fontSize: 14},
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.s4,
  },
  tab: {
    paddingVertical: spacing.s3,
    marginRight: spacing.s5,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.orange,
  },
  tabText: {color: colors.text60, fontSize: 14, fontWeight: '600'},
  tabTextActive: {color: colors.orange},
  description: {
    color: colors.text60,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.s4,
  },
  noDesc: {color: colors.text30, fontSize: 14, fontStyle: 'italic'},
  tags: {flexDirection: 'row', flexWrap: 'wrap'},
  tagGap: {marginRight: spacing.s2, marginBottom: spacing.s2},
  chapterRow: {
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chapterNum: {color: colors.text100, fontSize: 14, fontWeight: '600'},
  chapterDate: {color: colors.text60, fontSize: 12, marginTop: 2},
});

export default MangaDetailScreen;
