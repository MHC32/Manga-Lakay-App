import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Manga} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {MangaCardVertical} from '../../components/manga';
import {MangaCardSkeleton} from '../../components/ui/Skeleton';
import {EmptyState} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing} from '../../constants/theme';
import {HomeStackParamList} from '../../types/navigation.types';

type NavProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

const HomeScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [trending, setTrending] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const mangas = await mangaService.getTrending(20);
      setTrending(mangas);
    } catch {
      setError('Impossible de charger les tendances.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderSkeleton = () => (
    <FlatList
      horizontal
      data={Array(6).fill(null)}
      keyExtractor={(_, i) => `sk-${i}`}
      renderItem={() => <MangaCardSkeleton />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
    />
  );

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
        <View style={styles.header}>
          <Text style={styles.appName}>MangaLakay</Text>
          <Text style={styles.tagline}>Manga lakay ou</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tendances</Text>
          </View>

          {error ? (
            <EmptyState
              title="Erreur réseau"
              subtitle={error}
              ctaLabel="Réessayer"
              onCta={() => loadData()}
            />
          ) : isLoading ? (
            renderSkeleton()
          ) : trending.length === 0 ? (
            <EmptyState title="Aucun manga disponible" />
          ) : (
            <FlatList
              horizontal
              data={trending}
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <MangaCardVertical
                  manga={item}
                  onPress={() =>
                    navigation.navigate('MangaDetail', {mangaId: item.id})
                  }
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s5,
  },
  appName: {
    color: colors.orange,
    fontSize: 24,
    fontWeight: '900',
  },
  tagline: {
    color: colors.text60,
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.s6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s4,
    marginBottom: spacing.s3,
  },
  sectionTitle: {
    color: colors.text100,
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.s4,
  },
});

export default HomeScreen;
