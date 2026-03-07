import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {ChapterPages} from '../../types/mangadex.types';
import {chapterService} from '../../services/mangadex/chapter.service';
import {useReaderStore} from '../../stores/reader.store';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {getPageUrl, getPageUrlDataSaver} from '../../utils/image';
import {colors, spacing} from '../../constants/theme';
import {HomeStackParamList} from '../../types/navigation.types';

type Props = StackScreenProps<HomeStackParamList, 'Reader'>;

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const ReaderScreen = ({route, navigation}: Props) => {
  const {chapterId, mangaId, chapterNum} = route.params;
  const {user} = useAuthStore();
  const {markChapterRead} = useLibraryStore();
  const {settings, showControls, setShowControls, openChapter} = useReaderStore();

  const [pages, setPages] = useState<ChapterPages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const p = await chapterService.getChapterPages(chapterId);
      if (p) {
        setPages(p);
        openChapter(chapterId, mangaId, p.data.length);
        // Marquer comme lu si connecté
        if (user) {
          markChapterRead(user.uid, mangaId, chapterId);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [chapterId, mangaId, user, markChapterRead, openChapter]);

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

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color={colors.orange} size="large" />
        <Text style={styles.loaderText}>Chargement du chapitre...</Text>
      </View>
    );
  }

  if (!pages) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>Impossible de charger ce chapitre.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pageUrls = buildPageUrls();

  return (
    <View style={styles.container}>
      <FlatList
        data={pageUrls}
        keyExtractor={(_, i) => `page-${i}`}
        horizontal={settings.direction === 'rtl'}
        inverted={settings.direction === 'rtl'}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={({viewableItems}) => {
          if (viewableItems.length > 0) {
            setCurrentPage(viewableItems[0].index ?? 0);
          }
        }}
        viewabilityConfig={{itemVisiblePercentThreshold: 50}}
        renderItem={({item}) => (
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowControls(!showControls)}
            style={styles.pageContainer}>
            <Image
              source={{uri: item}}
              style={styles.page}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      />

      {/* Controles superposés */}
      {showControls && (
        <>
          {/* Header */}
          <View style={styles.controlsTop}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.controlBtn}>
              <Text style={styles.controlBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.chapterTitle}>Chapitre {chapterNum}</Text>
            <View style={styles.controlBtn} />
          </View>

          {/* Footer */}
          <View style={styles.controlsBottom}>
            <Text style={styles.pageCounter}>
              {currentPage + 1} / {pageUrls.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

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
  pageContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  page: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  controlsTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  controlBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnText: {color: '#fff', fontSize: 22},
  chapterTitle: {color: '#fff', fontSize: 15, fontWeight: '700'},
  controlsBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: spacing.s3,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  pageCounter: {color: colors.text60, fontSize: 13},
});

export default ReaderScreen;
