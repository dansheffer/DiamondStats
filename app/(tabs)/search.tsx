import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { searchPlayers, MlbPersonLite } from '../src/api/mlb';
import PlayerAvatar from '../src/components/PlayerAvatar';
import { theme } from '../src/theme/colors';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MlbPersonLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }
    const myToken = ++tokenRef.current;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchPlayers(q)
        .then((rows) => {
          if (tokenRef.current !== myToken) return;
          setResults(rows);
        })
        .catch((e) => {
          if (tokenRef.current !== myToken) return;
          setError(e?.message ?? 'Search failed');
          setResults([]);
        })
        .finally(() => {
          if (tokenRef.current !== myToken) return;
          setLoading(false);
        });
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const openPlayer = useCallback((id: number) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    router.push(`/player/mlb-${id}`);
  }, []);

  const renderItem = ({ item }: { item: MlbPersonLite }) => (
    <Pressable
      onPress={() => openPlayer(item.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.fullName}`}
    >
      <PlayerAvatar mlbId={item.id} size={48} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.fullName}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {(item.primaryPosition?.abbreviation ?? '—') +
            ' • ' +
            (item.currentTeam?.name ?? 'Free Agent')}
        </Text>
      </View>
      {Platform.OS === 'ios' && (
        <SymbolView name="chevron.right" tintColor="#c7c7cc" size={14} />
      )}
    </Pressable>
  );

  const empty = () => {
    if (loading) {
      return (
        <View style={styles.empty}>
          <ActivityIndicator />
          <Text style={styles.emptyHint}>Searching…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn&apos;t reach the stats service</Text>
          <Text style={styles.emptyHint}>{error}</Text>
        </View>
      );
    }
    if (query.trim().length < 2) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Search any active pro player</Text>
          <Text style={styles.emptyHint}>
            Live data from a public stats service. Try &quot;Soto&quot;, &quot;Skenes&quot;,
            or &quot;Yamamoto&quot;.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No players found.</Text>
        <Text style={styles.emptyHint}>Try a different spelling.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Players</Text>
        <View style={styles.searchBar}>
          {Platform.OS === 'ios' && (
            <SymbolView name="magnifyingglass" tintColor="#8e8e93" size={18} />
          )}
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Any active pro player"
            placeholderTextColor="#8e8e93"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.searchInput}
            accessibilityLabel="Search players"
          />
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={empty}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#f2f2f7',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(118,118,128,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: theme.text,
    padding: 0,
  },
  list: { backgroundColor: '#f2f2f7' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  sep: { height: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  rowPressed: { opacity: 0.6 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 16, fontWeight: '700', color: theme.primary },
  rowMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  empty: { paddingVertical: 80, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptyHint: { fontSize: 13, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 },
});
