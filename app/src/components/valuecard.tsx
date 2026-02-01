// Utility functions to convert WAR to dollars and determine trend

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock player data
const playerData = {
  name: 'Shohei Ohtani',
  position: 'DH/SP',
  team: 'Los Angeles Dodgers',
  careerWAR: 32.4,
  seasonWAR: 9.2,
  gamesPlayed: 100, // Current games played in the season
  trend: 'Rising' as 'Rising' | 'Stable' | 'Declining',
};

// Convert WAR to dollar value
const WAR_TO_DOLLARS = 9_000_000;
// Full MLB season length
const FULL_SEASON_GAMES = 162;

const ValueCard: React.FC = () => {
  // Calculate dollar values from WAR
  const careerValue = playerData.careerWAR * WAR_TO_DOLLARS;
  const seasonValue = playerData.seasonWAR * WAR_TO_DOLLARS;

  // Projection calculations
  // Assumption: Linear projection based on current pace through the season
  // Formula: (seasonWAR / gamesPlayed) * FULL_SEASON_GAMES
  const projectedSeasonWAR =
    (playerData.seasonWAR / playerData.gamesPlayed) * FULL_SEASON_GAMES;
  const projectedSeasonValue = projectedSeasonWAR * WAR_TO_DOLLARS;

  // Format large numbers to millions (e.g., $291.6M)
  const formatValue = (value: number): string => {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  };

  // Determine trend color
  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'Rising':
        return '#10b981';
      case 'Declining':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Player Header */}
        <View style={styles.header}>
          <Text style={styles.playerName}>{playerData.name}</Text>
          <Text style={styles.playerInfo}>
            {playerData.position} • {playerData.team}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* WAR Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Career WAR</Text>
            <Text style={styles.statValue}>{playerData.careerWAR}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Season WAR</Text>
            <Text style={styles.statValue}>{playerData.seasonWAR}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Value Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Career Value</Text>
            <Text style={styles.valueText}>{formatValue(careerValue)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Season Value</Text>
            <Text style={styles.valueText}>{formatValue(seasonValue)}</Text>
          </View>
        </View>

        {/* Trend Badge */}
        <View style={styles.trendContainer}>
          <View

      {/* Projection Section */}
      <View style={styles.projectionCard}>
        <Text style={styles.projectionTitle}>If this pace continues…</Text>
        <View style={styles.projectionContent}>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>Projected Season WAR</Text>
            <Text style={styles.projectionValue}>
              {projectedSeasonWAR.toFixed(1)}
            </Text>
          </View>
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>Projected Season Value</Text>
            <Text style={styles.projectionValueMoney}>
              {formatValue(projectedSeasonValue)}
            </Text>
          </View>
        </View>
        <Text style={styles.projectionNote}>
          Based on {playerData.gamesPlayed} of {FULL_SEASON_GAMES} games
        </Text>
      </View>
            style={[
              styles.trendBadge,
              { backgroundColor: getTrendColor(playerData.trend) },
            ]}
          >
            <Text style={styles.trendText}>{playerData.trend}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  playerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  playerInfo: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
  projectionCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginTop: 16,
    width: '100%',
    maxWidth: 400,
  },
  projectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  projectionContent: {
    gap: 8,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  projectionValueMoney: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    opacity: 0.8,
  },
  projectionNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 10,
    fontStyle: 'italic',
  },
    fontWeight: '600',
    color: '#111827',
  },
  valueText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  trendContainer: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  trendBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  trendText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ValueCard;