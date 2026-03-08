// src/screens/search/SearchScreen.tsx
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {Manga, MangaStatus, SearchFilters} from '../../types/mangadex.types';
import {SearchStackParamList} from '../../types/navigation.types';
import {mangaService} from '../../services/mangadex/manga.service';
import {mmkv} from '../../services/cache/mmkv';
import {CacheKeys} from '../../services/cache/cache.service';
import {colors, spacing, radius, fonts} from '../../constants/theme';
import {getTitle} from '../../utils/locale';
import {useSearchStore} from '../../stores/search.store';
import ScreenWrapper from '../../components/layout/ScreenWrapper';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing.s4 * 2 - spacing.s3) / 2;

// ─── Filtres rapides (prototype 08) ──────────────────────────────────────────

interface QuickFilter {
  id: string;
  tagId: string;
  label: string;
  emoji: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  {id: 'action',  tagId: '391b0423-d847-456f-aff4-f6ece7742fe4', label: 'Action',  emoji: '⚔️'},
  {id: 'romance', tagId: '423e2eae-a7a2-4a8b-ac03-a8351462d71d', label: 'Romance', emoji: '💕'},
  {id: 'fantasy', tagId: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc', label: 'Fantasy', emoji: '🧙'},
  {id: 'horreur', tagId: 'cdad7e68-1419-41dd-bdce-27753074a640', label: 'Horreur', emoji: '👻'},
  {id: 'sci-fi',  tagId: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75', label: 'Sci-Fi',  emoji: '🚀'},
];

// ─── Helpers historique (US-007 : 10 dernières recherches) ───────────────────

function loadHistory(): string[] {
  const raw = mmkv.getString(CacheKeys.searchHistory());
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveHistory(items: string[]): void {
  mmkv.setString(CacheKeys.searchHistory(), JSON.stringify(items));
}

function addToHistory(query: string, current: string[]): string[] {
  const cleaned = current.filter(h => h.toLowerCase() !== query.toLowerCase());
  return [query, ...cleaned].slice(0, 10);
}

// ─── Composant carte résultats (grille 2 colonnes — prototype 09) ─────────────

const ResultCard = ({manga, onPress}: {manga: Manga; onPress: () => void}) => {
  const title = getTitle(manga.title);
  const author = manga.authors[0]?.name ?? '';
  const year = manga.year ?? '';
  const authorYear = [author ? author.split(' ').pop() : '', year].filter(Boolean).join(' · ');
  const demog = manga.demographic;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, {width: CARD_WIDTH}]}>
      <View style={styles.cardCover}>
        {manga.coverUrl ? (
          <Image source={{uri: manga.coverUrl}} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.cardCoverFallback}>
            <Text style={styles.cardCoverFallbackText}>{title.charAt(0)}</Text>
          </View>
        )}
        {/* Badge statut */}
        <View style={styles.cardStatusBadge}>
          <Text style={[
            styles.cardStatusText,
            {color: manga.status === 'ongoing' ? colors.teal : colors.text60},
          ]}>
            {manga.status === 'ongoing' ? 'En cours' : 'Terminé'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.cardMeta} numberOfLines={1}>{authorYear}</Text>
        <View style={styles.cardScores}>
          {demog && (
            <View style={styles.demogBadge}>
              <Text style={styles.demogText}>{demog}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ResultCardSkeleton = () => (
  <View style={[styles.card, {width: CARD_WIDTH}]}>
    <View style={[styles.cardCover, {backgroundColor: colors.bgElevated}]} />
    <View style={styles.cardBody}>
      <View style={{height: 12, width: '80%', backgroundColor: colors.bgElevated, borderRadius: 4, marginBottom: 5}} />
      <View style={{height: 10, width: '50%', backgroundColor: colors.bgElevated, borderRadius: 4}} />
    </View>
  </View>
);

// ─── Composant item populaire (état vide — prototype 08) ──────────────────────

const PopularItem = ({
  rank,
  manga,
  onPress,
}: {rank: number; manga: Manga; onPress: () => void}) => {
  const title = getTitle(manga.title);
  const author = manga.authors[0]?.name ?? '';
  const statusLabel = manga.status === 'ongoing' ? 'En cours' : 'Terminé';

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.popItem}>
      <Text style={styles.popRank}>{rank}</Text>
      {manga.coverUrl ? (
        <Image source={{uri: manga.coverUrl}} style={styles.popCover} resizeMode="cover" />
      ) : (
        <View style={[styles.popCover, styles.popCoverFallback]}>
          <Text style={{fontSize: 18}}>{title.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.popInfo}>
        <Text style={styles.popTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.popMeta}>{[author, statusLabel].filter(Boolean).join(' · ')}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ─── Écran principal ──────────────────────────────────────────────────────────

const SearchScreen = () => {
  const navigation = useNavigation<StackNavigationProp<SearchStackParamList>>();
  const {pendingTagId, pendingTagLabel, clearPendingTag} = useSearchStore();

  const [query, setQuery] = useState('');
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [results, setResults] = useState<Manga[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [history, setHistory] = useState<string[]>(loadHistory);
  const [popularMangas, setPopularMangas] = useState<Manga[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // ─── Filtres avancés (US-008) ────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    status: null as string | null,
    demographic: null as string | null,
    sortBy: 'relevance' as 'relevance' | 'rating' | 'follows' | 'updatedAt',
  });
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const activeFilterCount = [filters.status, filters.demographic].filter(Boolean).length;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Chargement des populaires au montage
  useEffect(() => {
    mangaService
      .getTrending(5)
      .then(setPopularMangas)
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, []);

  // Lecture du filtre cross-tab venant d'ExploreScreen
  useFocusEffect(
    useCallback(() => {
      if (pendingTagId) {
        setActiveTagId(pendingTagId);
        clearPendingTag();
      }
    }, [pendingTagId, clearPendingTag]),
  );

  // ─── Recherche ──────────────────────────────────────────────────────────────

  // Convertit sortBy en paramètre order compatible MangaListParams
  const buildOrder = (sortBy: 'relevance' | 'rating' | 'follows' | 'updatedAt') => {
    switch (sortBy) {
      case 'rating':     return {rating: 'desc' as const};
      case 'follows':    return {followedCount: 'desc' as const};
      case 'updatedAt':  return {updatedAt: 'desc' as const};
      case 'relevance':
      default:           return {followedCount: 'desc' as const};
    }
  };

  const doSearch = useCallback(async (
    text: string,
    tagId: string | null,
    reset = true,
    activeFilters = filters,
  ) => {
    const trimmed = text.trim();
    const hasQuery = trimmed.length >= 3;
    const hasTag = tagId !== null;

    if (!hasQuery && !hasTag) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    setHasSearched(true);

    try {
      const params: any = {
        limit: 20,
        offset: currentOffset,
        order: buildOrder(activeFilters.sortBy),
      };
      if (hasQuery) params.title = trimmed;
      if (hasTag) params.includedTags = [tagId];
      if (activeFilters.status) params.status = [activeFilters.status];
      if (activeFilters.demographic) params.publicationDemographic = [activeFilters.demographic];

      const {mangas, total: t} = await mangaService.searchManga(params);

      if (reset) {
        setResults(mangas);
        // Sauvegarder dans l'historique si c'est une recherche textuelle
        if (hasQuery) {
          const newHistory = addToHistory(trimmed, history);
          setHistory(newHistory);
          saveHistory(newHistory);
        }
      } else {
        setResults(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = mangas.filter(m => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
        setOffset(currentOffset + 20);
      }
      setTotal(t);
      setHasMore(currentOffset + 20 < t);
    } catch {
      if (reset) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, history, filters]);

  // Debounce sur la saisie (US-007 : 500ms, 3 chars min)
  const onChangeText = (text: string) => {
    setQuery(text);
    setActiveTagId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text, null), 500);
  };

  const onClear = () => {
    setQuery('');
    setActiveTagId(null);
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const onTagPress = (tagId: string) => {
    const newTagId = activeTagId === tagId ? null : tagId;
    setActiveTagId(newTagId);
    setQuery('');
    doSearch('', newTagId);
  };

  const onHistoryPress = (item: string) => {
    setQuery(item);
    setActiveTagId(null);
    doSearch(item, null);
  };

  const onRemoveHistory = (item: string) => {
    const newHistory = history.filter(h => h !== item);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const onClearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // Infinite scroll (BR-012 : chargement à 80%)
  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      doSearch(query, activeTagId, false);
    }
  };

  const isEmptyState = !hasSearched;
  const isSearching = loading;

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chèche 🔍</Text>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, {flex: 1}]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Titre, auteur, genre..."
              placeholderTextColor={colors.text60}
              value={query}
              onChangeText={onChangeText}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                doSearch(query, activeTagId);
              }}
            />
            {isSearching && (
              <ActivityIndicator color={colors.orange} size="small" style={{marginRight: 8}} />
            )}
            {(query.length > 0 || activeTagId) && !isSearching && (
              <TouchableOpacity onPress={onClear} style={styles.clearBtn}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowFilterSheet(true)} style={styles.filterBtn}>
            <Text style={styles.filterBtnText}>Filtres</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres rapides */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}>
        {QUICK_FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => onTagPress(f.tagId)}
            style={[
              styles.filterChip,
              activeTagId === f.tagId && styles.filterChipActive,
            ]}>
            <Text style={[
              styles.filterChipText,
              activeTagId === f.tagId && styles.filterChipTextActive,
            ]}>
              {f.emoji} {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Corps */}
      {isEmptyState ? (
        <ScrollView showsVerticalScrollIndicator={false} style={{flex: 1}}>
          {/* Historique */}
          {history.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>RÉCENTS</Text>
                <TouchableOpacity onPress={onClearHistory}>
                  <Text style={styles.sectionAction}>Effacer</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyChips}>
                {history.map(item => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => onHistoryPress(item)}
                    style={styles.historyChip}>
                    <Text style={styles.historyChipText}>{item}</Text>
                    <TouchableOpacity
                      onPress={() => onRemoveHistory(item)}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Text style={styles.historyRemove}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Populaires */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>POPULAIRES EN CE MOMENT</Text>
          </View>
          {loadingPopular
            ? Array.from({length: 5}).map((_, i) => (
                <View key={`pop-skel-${i}`} style={styles.popItem}>
                  <View style={{width: 24, height: 14, backgroundColor: colors.bgElevated, borderRadius: 4}} />
                  <View style={[styles.popCover, {backgroundColor: colors.bgElevated}]} />
                  <View style={{flex: 1}}>
                    <View style={{height: 14, width: '70%', backgroundColor: colors.bgElevated, borderRadius: 4, marginBottom: 6}} />
                    <View style={{height: 12, width: '40%', backgroundColor: colors.bgElevated, borderRadius: 4}} />
                  </View>
                </View>
              ))
            : popularMangas.map((manga, i) => (
                <PopularItem
                  key={manga.id}
                  rank={i + 1}
                  manga={manga}
                  onPress={() => navigation.navigate('MangaDetail', {mangaId: manga.id})}
                />
              ))}
        </ScrollView>
      ) : (
        <>
          {/* Compteur résultats + chips filtres actifs */}
          {!loading && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                <Text style={styles.resultsCountNum}>{total}</Text>
                {' '}manga{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
              </Text>
              {(query.length > 0 || activeTagId) && (
                <TouchableOpacity onPress={onClear} style={styles.resetChip}>
                  <Text style={styles.resetChipText}>Réinitialiser</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Grille résultats 2 colonnes */}
          <FlatList
            data={loading ? [] : results}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.2}
            ListHeaderComponent={
              loading ? (
                <View style={styles.row}>
                  {Array.from({length: 4}).map((_, i) => (
                    <ResultCardSkeleton key={`skel-${i}`} />
                  ))}
                </View>
              ) : null
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>Aucun résultat</Text>
                  <Text style={styles.emptySubtitle}>
                    Aucun manga trouvé{query ? ` pour "${query}"` : ''}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadMore}>
                  <ActivityIndicator color={colors.text60} size="small" />
                  <Text style={styles.loadMoreText}>Chargement...</Text>
                </View>
              ) : null
            }
            renderItem={({item}) => (
              <ResultCard
                manga={item}
                onPress={() => navigation.navigate('MangaDetail', {mangaId: item.id})}
              />
            )}
          />
        </>
      )}

      {/* Bottom sheet filtres avancés (US-008) */}
      <Modal visible={showFilterSheet} transparent animationType="slide">
        <TouchableOpacity
          style={styles.filterOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterSheet(false)}
        />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHandle} />
          <Text style={styles.filterSheetTitle}>Filtres</Text>

          {/* Statut */}
          <Text style={styles.filterLabel}>Statut</Text>
          <View style={styles.filterChips}>
            {[
              {value: 'ongoing',   label: 'En cours'},
              {value: 'completed', label: 'Terminé'},
              {value: 'hiatus',    label: 'En pause'},
              {value: 'cancelled', label: 'Annulé'},
            ].map(({value, label}) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, filters.status === value && styles.chipActive]}
                onPress={() => setFilters(f => ({...f, status: f.status === value ? null : value}))}>
                <Text style={[styles.chipText, filters.status === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Démographie */}
          <Text style={styles.filterLabel}>Public</Text>
          <View style={styles.filterChips}>
            {[
              {value: 'shounen', label: 'Shounen'},
              {value: 'shoujo',  label: 'Shoujo'},
              {value: 'seinen',  label: 'Seinen'},
              {value: 'josei',   label: 'Josei'},
            ].map(({value, label}) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, filters.demographic === value && styles.chipActive]}
                onPress={() => setFilters(f => ({...f, demographic: f.demographic === value ? null : value}))}>
                <Text style={[styles.chipText, filters.demographic === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tri */}
          <Text style={styles.filterLabel}>Trier par</Text>
          <View style={styles.filterChips}>
            {[
              {value: 'relevance', label: 'Pertinence'},
              {value: 'rating',    label: 'Note'},
              {value: 'follows',   label: 'Popularité'},
              {value: 'updatedAt', label: 'Récent'},
            ].map(({value, label}) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, filters.sortBy === value && styles.chipActive]}
                onPress={() => setFilters(f => ({...f, sortBy: value as 'relevance' | 'rating' | 'follows' | 'updatedAt'}))}>
                <Text style={[styles.chipText, filters.sortBy === value && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Boutons actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterReset}
              onPress={() => setFilters({status: null, demographic: null, sortBy: 'relevance'})}>
              <Text style={styles.filterResetText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApply}
              onPress={() => {
                setShowFilterSheet(false);
                // Relancer la recherche si query active ou tag actif
                const trimmed = query.trim();
                if (trimmed.length >= 3 || activeTagId) {
                  doSearch(trimmed, activeTagId, true, filters);
                }
              }}>
              <Text style={styles.filterApplyText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bgBase},

  header: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s5,
    paddingBottom: spacing.s3,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.text100,
    marginBottom: spacing.s4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.s3,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Bouton filtres
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.s3,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
    flexShrink: 0,
  },
  filterBtnText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text60,
  },
  filterBadge: {
    backgroundColor: colors.orange,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.text100,
  },

  // Bottom sheet filtres
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  filterSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s8,
    paddingTop: spacing.s3,
  },
  filterSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: spacing.s4,
  },
  filterSheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text100,
    marginBottom: spacing.s4,
  },
  filterLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
    letterSpacing: 0.5,
    marginBottom: spacing.s2,
    marginTop: spacing.s3,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  chip: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text60,
  },
  chipTextActive: {
    color: colors.orange,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: spacing.s3,
    marginTop: spacing.s5,
  },
  filterReset: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterResetText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text60,
  },
  filterApply: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
  },
  filterApplyText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text100,
  },
  searchIcon: {fontSize: 16, marginRight: 8},
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text100,
  },
  clearBtn: {padding: spacing.s2},
  clearText: {
    color: colors.text60,
    fontSize: 14,
    fontWeight: '700',
  },

  // Filtres rapides
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s3,
    gap: spacing.s2,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderColor: colors.orange,
  },
  filterChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.text60,
  },
  filterChipTextActive: {
    color: colors.orange,
    fontWeight: '600',
  },

  // Section (état vide)
  section: {
    paddingHorizontal: spacing.s4,
    paddingTop: spacing.s4,
    paddingBottom: spacing.s2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s3,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text60,
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.orange,
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s2,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyChipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
  },
  historyRemove: {
    fontSize: 10,
    color: colors.text30,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Populaires
  popItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s3,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  popRank: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text30,
    width: 24,
    textAlign: 'center',
  },
  popCover: {
    width: 40,
    height: 54,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexShrink: 0,
  },
  popCoverFallback: {
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popInfo: {flex: 1, minWidth: 0},
  popTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text100,
  },
  popMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text30,
    marginTop: 2,
  },

  // Header résultats
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s4,
    paddingBottom: spacing.s3,
  },
  resultsCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text60,
  },
  resultsCountNum: {
    fontFamily: fonts.mono,
    fontWeight: '700',
    color: colors.orange,
  },
  resetChip: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.text60,
  },

  // Grille résultats
  grid: {
    paddingHorizontal: spacing.s4,
    paddingBottom: 90,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.s3,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  cardCoverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  cardCoverFallbackText: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: colors.text60,
  },
  cardStatusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(10,14,26,0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardStatusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
  },
  cardBody: {padding: 8},
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.text100,
    lineHeight: 17,
    marginBottom: 4,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.text30,
    marginBottom: 4,
  },
  cardScores: {flexDirection: 'row', gap: 4, flexWrap: 'wrap'},
  demogBadge: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demogText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
    color: colors.text60,
  },

  // États vides / chargement
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.s3,
  },
  emptyIcon: {fontSize: 48},
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text100,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text60,
    textAlign: 'center',
    paddingHorizontal: spacing.s6,
  },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s6,
    gap: spacing.s2,
  },
  loadMoreText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text30,
  },
});

export default SearchScreen;
