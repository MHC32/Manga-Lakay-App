import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {ratingService} from '../../services/firebase/rating.service';
import {mangaService} from '../../services/mangadex/manga.service';
import {Manga} from '../../types/mangadex.types';
import {RankingItem} from '../../types/firebase.types';
import {EmptyState} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {RankingStackParamList} from '../../types/navigation.types';
import {getTitle} from '../../utils/locale';

type NavProp = StackNavigationProp<RankingStackParamList, 'RankingMain'>;
type Period = 'weekly' | 'monthly' | 'alltime';

const PERIODS: {key: Period; label: string}[] = [
  {key: 'weekly', label: 'Semaine'},
  {key: 'monthly', label: 'Mois'},
  {key: 'alltime', label: 'Tout temps'},
];

const RankingScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [period, setPeriod] = useState<Period>('alltime');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [mangaMap, setMangaMap] = useState<Record<string, Manga>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const ranking = await ratingService.getRanking(period);
        setItems(ranking);
        if (ranking.length > 0) {
          const ids = ranking.map(r => r.mangaId);
          const mangas = await mangaService.getMangaByIds(ids);
          const map: Record<string, Manga> = {};
          mangas.forEach(m => (map[m.id] = m));
          setMangaMap(map);
        }
      } catch {
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [period]);

  return (
    <ScreenWrapper edges={['top']}>
      <Text style={styles.title}>Top MangaKay</Text>
      <Text style={styles.subtitle}>Noté par la kominote haïtienne</Text>

      {/* Period tabs */}
      <View style={styles.tabs}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[styles.tab, period === p.key && styles.tabActive]}
            onPress={() => setPeriod(p.key)}>
            <Text
              style={[
                styles.tabText,
                period === p.key && styles.tabTextActive,
              ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={colors.orange}
          size="large"
          style={styles.loader}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Kominote a ap grandi"
          subtitle="Pa gen ase not pou konpile yon klasman — rete la !"
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.mangaId}
          contentContainerStyle={styles.list}
          renderItem={({item}) => {
            const manga = mangaMap[item.mangaId];
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate('MangaDetail', {mangaId: item.mangaId})
                }>
                <Text style={styles.rank}>#{item.rank}</Text>
                <View style={styles.info}>
                  <Text style={styles.mangaTitle} numberOfLines={1}>
                    {manga ? getTitle(manga.title) : item.mangaId}
                  </Text>
                  <Text style={styles.votes}>{item.totalVotes} votes</Text>
                </View>
                <View style={styles.scoreBadge}>
                  <Text style={styles.score}>
                    {item.averageRating.toFixed(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
  },
  subtitle: {
    color: colors.text60,
    fontSize: 13,
    paddingHorizontal: spacing.s4,
    marginBottom: spacing.s4,
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
  loader: {marginTop: spacing.s8},
  list: {paddingHorizontal: spacing.s4},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rank: {
    color: colors.mango,
    fontSize: 16,
    fontWeight: '900',
    width: 40,
  },
  info: {flex: 1, marginRight: spacing.s3},
  mangaTitle: {color: colors.text100, fontSize: 15, fontWeight: '700'},
  votes: {color: colors.text60, fontSize: 12, marginTop: 2},
  scoreBadge: {
    backgroundColor: `${colors.orange}20`,
    paddingHorizontal: spacing.s3,
    paddingVertical: spacing.s2,
    borderRadius: radius.md,
  },
  score: {color: colors.orange, fontWeight: '900', fontSize: 16},
});

export default RankingScreen;
