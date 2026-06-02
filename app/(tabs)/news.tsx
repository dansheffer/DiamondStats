import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { fetchNews, NewsItem } from '../src/api/mlb';
import { theme } from '../src/theme/colors';

function relativeTime(iso: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(t).toLocaleDateString();
}

export default function NewsScreen() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const rows = await fetchNews();
      setItems(rows);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    if (Platform.OS === 'ios')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRefreshing(true);
    load(true);
  }, [load]);

  const open = useCallback((url: string) => {
    if (Platform.OS === 'ios') Haptics.selectionAsync().catch(() => {});
    Linking.openURL(url).catch(() => {});
  }, []);

  const renderItem = ({ item }: { item: NewsItem }) => (
    <Pressable
      onPress={() => open(item.link)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="link"
      accessibilityLabel={item.title}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
        <Text style={styles.meta}>MLB.com · {relativeTime(item.pubDate)}</Text>
      </View>
      {Platform.OS === 'ios' && (
        <SymbolView name="arrow.up.right.square" tintColor={theme.accent} size={20} />
      )}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>News</Text>
        <Text style={styles.headerSub}>Latest from MLB.com</Text>
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>Couldn&apos;t load news</Text>
          <Text style={styles.errHint}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: theme.text },
  headerSub: { fontSize: 14, color: theme.mutedText, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  sep: { height: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  cardPressed: { opacity: 0.6 },
  title: { fontSize: 16, fontWeight: '700', color: theme.text, lineHeight: 21 },
  meta: { fontSize: 12, color: theme.mutedText, marginTop: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  errTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  errHint: { fontSize: 13, color: theme.mutedText, textAlign: 'center' },
});
