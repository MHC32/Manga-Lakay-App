import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Manga} from '../../types/mangadex.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {MangaCardVertical} from '../../components/manga';
import {EmptyState} from '../../components/ui';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import {colors, spacing, radius} from '../../constants/theme';
import {SearchStackParamList} from '../../types/navigation.types';

type NavProp = StackNavigationProp<SearchStackParamList, 'SearchMain'>;

const SearchScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Manga[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const {mangas, total: t} = await mangaService.searchManga({title: text.trim()});
      setResults(mangas);
      setTotal(t);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      search(text);
    }, 400);
  };

  const renderEmpty = () => {
    if (!hasSearched) {
      return (
        <EmptyState
          title="Cherche un manga"
          subtitle="Tape le titre, l'auteur ou un genre..."
        />
      );
    }
    return (
      <EmptyState
        title="Aucun résultat"
        subtitle={`Aucun manga trouvé pour "${query}"`}
      />
    );
  };

  return (
    <ScreenWrapper edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Titre, auteur, genre..."
          placeholderTextColor={colors.text60}
          value={query}
          onChangeText={onChangeText}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => search(query)}
        />
        {isLoading && (
          <ActivityIndicator
            color={colors.orange}
            size="small"
            style={styles.loader}
          />
        )}
        {query.length > 0 && !isLoading && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasSearched && results.length > 0 && (
        <Text style={styles.resultCount}>{total} résultat(s)</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        renderItem={({item}) => (
          <MangaCardVertical
            manga={item}
            onPress={() =>
              navigation.navigate('MangaDetail', {mangaId: item.id})
            }
            width={110}
          />
        )}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.s4,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.s4,
  },
  input: {
    flex: 1,
    color: colors.text100,
    fontSize: 15,
    paddingVertical: spacing.s3,
  },
  loader: {
    marginLeft: spacing.s2,
  },
  clearBtn: {
    padding: spacing.s2,
  },
  clearText: {
    color: colors.text60,
    fontSize: 18,
  },
  resultCount: {
    color: colors.text60,
    fontSize: 13,
    paddingHorizontal: spacing.s4,
    marginBottom: spacing.s2,
  },
  grid: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s8,
  },
});

export default SearchScreen;
