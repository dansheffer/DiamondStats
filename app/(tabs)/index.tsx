import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { PLAYERS, Player } from '../src/data/players';
import { theme } from '../src/theme/colors';
import PlayerAvatar from '../src/components/PlayerAvatar';
import { useFavorites } from '../src/storage/favorites';

SplashScreen.preventAutoHideAsync().catch(() => {});

const trendColor = (t: Player['trend']) => {
  switch (t) {
    case 'Rising':
      return '#34c759';
    case 'Declining':
      return '#ff3b30';
    default:
      return '#8e8e93';
  }
};

const trendSymbol = (t: Player['trend']) => {
  switch (t) {
    case 'Rising':
      return 'arrow.up.right.circle.fill';
    case 'Declining':
      return 'arrow.down.right.circle.fill';
    default:
      return 'minus.circle.fill';
  }
};

type FilterId = 'all' | 'war' | 'rising' | 'favorites';
interface FilterChip { id: FilterId; label: string; icon: any }
const CHIPS: FilterChip[] = [
  { id: 'all',       label: 'All',        icon: 'square.grid.2x2' },
  { id: 'war',       label: 'By WAR',     icon: 'chart.bar.fill' },
  { id: 'rising',    label: 'Rising',     icon: 'arrow.up.right' },
  { id: 'favorites', label: 'Favorites',  icon: 'star.fill' },
];

export default function PlayersScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const { isFavorite, favs } = useFavorites();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const numColumns = width >= 700 ? 2 : 1;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list: Player[] = PLAYERS.slice();
    if (filter === 'favorites') list = list.filter((p) => isFavorite(p.id));
    else if (filter === 'rising') list = list.filter((p) => p.trend === 'Rising');

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q),
      );
    }

    if (filter === 'war') {
      list.sort((a, b) => b.seasonWAR - a.seasonWAR);
    }
    return list;
  }, [query, filter, isFavorite, favs]);

  const onPickChip = useCallback((id: FilterId) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    setFilter(id);
  }, []);

  const onRefresh = useCallback(() => {
    if (Platform.OS === 'ios')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const openPlayer = useCallback((id: string) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    router.push(`/player/${id}`);
  }, []);

  const renderItem = ({ item }: { item: Player }) => (
    <Pressable
      onPress={() => openPlayer(item.id)}
      style={({ pressed }) => [
        styles.row,
        numColumns > 1 && styles.rowGrid,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name} details`}
    >
      <PlayerAvatar mlbId={item.mlbId} size={56} />
      <View style={styles.rowText}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {isFavorite(item.id) && Platform.OS === 'ios' && (
            <SymbolView name="star.fill" tintColor="#f5a623" size={12} />
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.position} • {item.team}
        </Text>
        <View style={styles.rowStats}>
          <Text style={styles.rowStatLabel}>Season WAR</Text>
          <Text style={styles.rowStatValue}>{item.seasonWAR.toFixed(1)}</Text>
          {Platform.OS === 'ios' ? (
            <SymbolView
              name={trendSymbol(item.trend)}
              tintColor={trendColor(item.trend)}
              size={16}
            />
          ) : (
            <View
              style={[styles.trendDot, { backgroundColor: trendColor(item.trend) }]}
            />
          )}
          <Text style={[styles.trendLabel, { color: trendColor(item.trend) }]}>
            {item.trend}
          </Text>
        </View>
      </View>
      {Platform.OS === 'ios' && (
        <SymbolView name="chevron.right" tintColor="#c7c7cc" size={14} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Top Players</Text>
        <Text style={styles.headerSub}>{filtered.length} of {PLAYERS.length}</Text>
      </View>
      <Text style={styles.headerCaption}>
        Curated elite — the top WAR leaders this season. Use Search for any active MLB player.
      </Text>

      <View style={styles.searchWrap}>
        {Platform.OS === 'ios' && (
          <SymbolView name="magnifyingglass" tintColor="#8e8e93" size={18} />
        )}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search players, teams, positions"
          placeholderTextColor="#8e8e93"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.searchInput}
          accessibilityLabel="Search players"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {CHIPS.map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => onPickChip(chip.id)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={chip.label}
            >
              {Platform.OS === 'ios' && (
                <SymbolView
                  name={chip.icon}
                  tintColor={active ? '#fff' : theme.primary}
                  size={13}
                />
              )}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        key={`cols-${numColumns}`}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        ItemSeparatorComponent={
          numColumns === 1 ? () => <View style={styles.sep} /> : undefined
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {filter === 'favorites'
                ? 'No favorites yet.'
                : 'No players match.'}
            </Text>
            <Text style={styles.emptyHint}>
              {filter === 'favorites'
                ? 'Tap the ☆ on any player to add a favorite.'
                : 'Try a name like "Soto" or clear the search.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: theme.text },
  headerSub: { fontSize: 13, color: theme.mutedText, fontVariant: ['tabular-nums'] },
  headerCaption: { fontSize: 13, color: theme.mutedText, paddingHorizontal: 16, paddingBottom: 12, lineHeight: 18 },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  searchInput: { flex: 1, fontSize: 16, color: theme.text, paddingVertical: 0 },
  chipRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  chipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.primary },
  chipTextActive: { color: '#fff' },
  list: { backgroundColor: '#f2f2f7' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  columnWrapper: { gap: 12 },
  sep: { height: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  rowGrid: { flex: 1, marginBottom: 12 },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 17, fontWeight: '700', color: theme.primary },
  rowMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  rowStats: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  rowStatLabel: { fontSize: 12, color: '#6b7280' },
  rowStatValue: { fontSize: 14, fontWeight: '700', color: theme.text, marginRight: 4 },
  trendDot: { width: 8, height: 8, borderRadius: 4 },
  trendLabel: { fontSize: 12, fontWeight: '600' },
  empty: { paddingVertical: 64, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptyHint: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
