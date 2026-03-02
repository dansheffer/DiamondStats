import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { searchPlayersByName, type PlayerSearchResult } from '../src/api/mlb';
import { theme } from '../src/theme/colors';
import { useResponsive } from '../src/utils/useResponsive';

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Type at least 2 letters.');
      setResults([]);
      return;
    }

    setError(null);
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await searchPlayersByName(trimmed);
      setResults(data.slice(0, 10));
      if (data.length === 0) {
        setError('No players found.');
      }
    } catch {
      setError('Could not search right now. Try again later.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const { isTablet, gridCols, maxContentWidth, outerPadding } = useResponsive();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={maxContentWidth ? { width: '100%', maxWidth: maxContentWidth } : undefined}>
      <Text style={[styles.heading, isTablet && { fontSize: 30 }]}>Find a Player</Text>
      <Text style={[styles.sub, isTablet && { fontSize: 16 }]}>
        Search any MLB player to see their baseball-card-style profile.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="e.g. Francisco Lindor"
          placeholderTextColor={theme.mutedText}
          value={query}
          onChangeText={setQuery}
          style={[styles.input, isTablet && { fontSize: 17, paddingVertical: 14 }]}
          autoCapitalize="words"
          returnKeyType="search"
          onSubmitEditing={() => void handleSearch()}
        />
        <Pressable
          style={({ pressed }) => [styles.searchBtn, isTablet && { paddingHorizontal: 24, paddingVertical: 14 }, pressed && styles.pressed]}
          onPress={() => void handleSearch()}
        >
          <Text style={[styles.searchBtnText, isTablet && { fontSize: 17 }]}>Search</Text>
        </Pressable>
      </View>

      {loading && <ActivityIndicator color={theme.primary} style={styles.loader} />}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } : undefined}>
        {results.map((player) => (
          <Pressable
            key={player.id}
            style={({ pressed }) => [
              styles.resultRow,
              isTablet && { width: `${Math.floor(100 / gridCols) - 2}%` as unknown as number },
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push({
                pathname: '/player/[playerId]',
                params: {
                  playerId: String(player.id),
                  name: player.fullName,
                  team: player.teamName,
                  position: player.position,
                },
              })
            }
          >
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{player.fullName}</Text>
              <Text style={styles.resultMeta}>
                {player.position} • {player.teamName}
              </Text>
            </View>
            <Text style={styles.openLabel}>View →</Text>
          </Pressable>
        ))}
      </View>

      {!loading && !error && hasSearched && results.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      )}

      {!hasSearched && (
        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>💡 Tips</Text>
          <Text style={[styles.hintText, isTablet && { fontSize: 15 }]}>
            • Try full names: "Shohei Ohtani"{'\n'}
            • Or last names: "Judge"{'\n'}
            • Tap any result to see their full stats card
          </Text>
        </View>
      )}
      </View>{/* end maxContentWidth wrapper */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  heading: { fontSize: 26, fontWeight: '800', color: theme.text },
  sub: { fontSize: 14, color: theme.mutedText, marginBottom: 4 },

  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBtnText: { color: '#111827', fontWeight: '800', fontSize: 15 },

  loader: { marginVertical: 8 },
  errorText: { color: '#b91c1c', fontWeight: '700' },

  resultRow: {
    backgroundColor: '#ffffff',
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultName: { color: theme.text, fontWeight: '800', fontSize: 16 },
  resultMeta: { color: theme.mutedText, fontSize: 13, marginTop: 2 },
  openLabel: { color: theme.primary, fontWeight: '800', fontSize: 14 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: theme.mutedText, fontWeight: '600' },

  hintCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginTop: 4,
  },
  hintTitle: { color: theme.primary, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  hintText: { color: '#1e40af', fontSize: 13, fontWeight: '600', lineHeight: 20 },

  pressed: { opacity: 0.85 },
});
