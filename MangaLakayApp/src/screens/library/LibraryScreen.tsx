import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {LibraryStatus} from '../../types/mangadex.types';
import {useAuthStore} from '../../stores/auth.store';
import {useLibraryStore} from '../../stores/library.store';
import {MangaCardVertical} from '../../components/manga';
import {EmptyState, Button} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {mangaService} from '../../services/mangadex/manga.service';
import {colors, spacing, radius} from '../../constants/theme';
import {LibraryStackParamList} from '../../types/navigation.types';

type NavProp = StackNavigationProp<LibraryStackParamList, 'LibraryMain'>;

const TABS: {key: LibraryStatus; label: string}[] = [
  {key: 'reading', label: 'En cours'},
  {key: 'completed', label: 'Terminé'},
  {key: 'plan_to_read', label: 'Planifié'},
  {key: 'dropped', label: 'Abandonné'},
];

const LibraryScreen = () => {
  const navigation = useNavigation<NavProp>();
  const {user} = useAuthStore();
  const {entries, getByStatus, subscribeToLibrary, unsubscribeFromLibrary} =
    useLibraryStore();
  const [activeTab, setActiveTab] = useState<LibraryStatus>('reading');
  const [mangaTitles, setMangaTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      subscribeToLibrary(user.uid);
    }
    return () => unsubscribeFromLibrary();
  }, [user, subscribeToLibrary, unsubscribeFromLibrary]);

  // Charger les titres des mangas de la bibliothèque
  useEffect(() => {
    const ids = entries.map(e => e.mangaId);
    if (ids.length === 0) {
      return;
    }
    mangaService.getMangaByIds(ids).then(mangas => {
      const map: Record<string, string> = {};
      mangas.forEach(m => {
        map[m.id] = m.title.fr ?? m.title.en ?? m.id;
      });
      setMangaTitles(map);
    });
  }, [entries]);

  if (!user) {
    return (
      <ScreenWrapper>
        <EmptyState
          title="Connecte-toi"
          subtitle="Kreye yon kont pou sove bibliothèque ou."
          ctaLabel="Se connecter"
          onCta={() => (navigation as any).navigate('Auth')}
        />
      </ScreenWrapper>
    );
  }

  const currentEntries = getByStatus(activeTab);

  return (
    <ScreenWrapper edges={['top']}>
      <Text style={styles.title}>Ma Bibliothèque</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentEntries.length === 0 ? (
        <EmptyState
          title="Pa gen anyen la encore"
          subtitle="Kòmanse ajoute manga ou yo !"
        />
      ) : (
        <FlatList
          data={currentEntries}
          keyExtractor={item => item.mangaId}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({item}) => (
            <MangaCardVertical
              manga={{
                id: item.mangaId,
                title: {fr: mangaTitles[item.mangaId] ?? item.mangaId},
                altTitles: [],
                description: {},
                status: 'ongoing',
                contentRating: 'safe',
                tags: [],
                authors: [],
                artists: [],
                coverUrl: null,
                year: null,
                lastChapter: null,
                lastVolume: null,
                demographic: null,
                originalLanguage: 'ja',
              }}
              onPress={() =>
                navigation.navigate('MangaDetail', {mangaId: item.mangaId})
              }
              width={110}
            />
          )}
        />
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.text100,
    fontSize: 22,
    fontWeight: '900',
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s3,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s4,
    marginBottom: spacing.s4,
    gap: spacing.s2,
  },
  tab: {
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
    borderRadius: radius.xxl,
    backgroundColor: colors.bgElevated,
  },
  tabActive: {backgroundColor: colors.orange},
  tabText: {color: colors.text60, fontSize: 12, fontWeight: '600'},
  tabTextActive: {color: '#fff'},
  grid: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s8,
  },
});

export default LibraryScreen;
