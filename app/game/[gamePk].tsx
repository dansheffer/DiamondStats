import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchGameBoxScore, type BoxScoreSummary } from '../src/api/mlb';
import { theme } from '../src/theme/colors';
import { useResponsive } from '../src/utils/useResponsive';

export default function GameBoxScoreScreen() {
  const { gamePk } = useLocalSearchParams<{ gamePk: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<BoxScoreSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!gamePk) {
        setError('Missing game id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchGameBoxScore(Number(gamePk));
        if (mounted) {
          setBox(data);
        }
      } catch (_error) {
        if (mounted) {
          setError('Could not load box score.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    const interval = setInterval(() => {
      void load();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [gamePk]);

  const innings = useMemo(() => box?.inningLines ?? [], [box?.inningLines]);
  const { isTablet, maxContentWidth, outerPadding } = useResponsive();

  return (
    <ScrollView contentContainerStyle={[styles.container, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}>
      <View style={maxContentWidth ? { maxWidth: maxContentWidth, width: '100%', gap: 12 } : { gap: 12 }}>
      <View style={styles.digitalCard}>
        {loading ? <ActivityIndicator color="#67e8f9" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {box ? (
          <>
            <Text style={styles.stateText}>{box.detailedState}</Text>
            <View style={styles.scoreRow}>
              <Text style={[styles.team, isTablet && { fontSize: 20 }]}>{box.awayTeam}</Text>
              <Text style={[styles.score, isTablet && { fontSize: 36 }]}>{box.awayRuns}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={[styles.team, isTablet && { fontSize: 20 }]}>{box.homeTeam}</Text>
              <Text style={[styles.score, isTablet && { fontSize: 36 }]}>{box.homeRuns}</Text>
            </View>
            <Text style={styles.inningText}>
              {box.inning ? `${box.inningState} ${box.inning}` : 'Pregame'}
            </Text>
          </>
        ) : null}
      </View>

      {box ? (
        <View style={[styles.infoCard, isTablet && { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }]}>
          <Text style={[styles.infoTitle, isTablet && { width: '100%' }]}>R / H / E</Text>
          <View style={[styles.rheRow, isTablet && { flex: 1 }]}>
            <Text style={styles.rheTeam}>{box.awayTeam}</Text>
            <Text style={styles.rheValue}>
              {box.awayRuns} / {box.awayHits} / {box.awayErrors}
            </Text>
          </View>
          <View style={[styles.rheRow, isTablet && { flex: 1 }]}>
            <Text style={styles.rheTeam}>{box.homeTeam}</Text>
            <Text style={styles.rheValue}>
              {box.homeRuns} / {box.homeHits} / {box.homeErrors}
            </Text>
          </View>
        </View>
      ) : null}

      {innings.length > 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Inning Lines</Text>
          <View style={isTablet ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } : undefined}>
            {innings.map((line) => (
              <View key={line.inning} style={[styles.inningRow, isTablet && { width: '48%' as unknown as number }]}>
                <Text style={styles.inningNumber}>#{line.inning}</Text>
                <Text style={styles.inningRuns}>Away {line.awayRuns ?? '-'}</Text>
                <Text style={styles.inningRuns}>Home {line.homeRuns ?? '-'}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      </View>{/* end maxContentWidth wrapper */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.background,
    padding: 14,
    gap: 12,
  },
  digitalCard: {
    backgroundColor: '#0b1020',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    gap: 8,
  },
  stateText: {
    color: '#67e8f9',
    textTransform: 'uppercase',
    fontWeight: '800',
    fontSize: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  team: {
    color: '#e5e7eb',
    fontWeight: '700',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  score: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 28,
  },
  inningText: {
    color: '#9ca3af',
    fontWeight: '700',
    fontSize: 12,
  },
  error: {
    color: '#fca5a5',
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoTitle: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  rheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rheTeam: {
    color: theme.text,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  rheValue: {
    color: theme.mutedText,
    fontWeight: '700',
  },
  inningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingTop: 8,
  },
  inningNumber: {
    color: theme.primary,
    fontWeight: '800',
    width: 42,
  },
  inningRuns: {
    color: theme.text,
    fontWeight: '700',
    flex: 1,
  },
});
