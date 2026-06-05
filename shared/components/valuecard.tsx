// ValueCard component: Displays player WAR stats, dollar values, and projections

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';
import PlayerAvatar from './PlayerAvatar';

// Component props
interface ValueCardProps {
  playerName: string;
  position?: string;
  team?: string;
  careerWAR?: number;
  seasonWAR?: number;
  gamesPlayed?: number;
  trend?: 'Rising' | 'Stable' | 'Declining';
  mlbId?: number;
}

// Convert WAR to dollar value
// Assumption: $9M per WAR (market standard)
const WAR_TO_DOLLARS = 9_000_000;
// Full season length
const FULL_SEASON_GAMES = 162;

const ValueCard: React.FC<ValueCardProps> = ({
  playerName,
  position = 'Unknown',
  team = 'Unknown',
  careerWAR = 0,
  seasonWAR = 0,
  gamesPlayed = 0,
  trend = 'Stable',
  mlbId,
}) => {
  // Calculate dollar values from WAR
  const careerValue = careerWAR * WAR_TO_DOLLARS;
  const seasonValue = seasonWAR * WAR_TO_DOLLARS;

  // Projection calculations
  // Assumption: Linear projection based on current pace through the season
  // Formula: (seasonWAR / gamesPlayed) * FULL_SEASON_GAMES
  const projectedSeasonWAR =
    gamesPlayed > 0 ? (seasonWAR / gamesPlayed) * FULL_SEASON_GAMES : 0;
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
        return theme.accent;
      case 'Declining':
        return '#ef4444';
      default:
        return theme.mutedText;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Player Header with Avatar */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <PlayerAvatar mlbId={mlbId} size={64} />
            <View style={styles.headerText}>
              <Text style={styles.playerName}>{playerName}</Text>
              <Text style={styles.playerInfo}>
                {position} • {team}
              </Text>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* WAR Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Career WAR</Text>
            <Text style={styles.statValue}>{careerWAR.toFixed(1)}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Season WAR</Text>
            <Text style={styles.statValue}>{seasonWAR.toFixed(1)}</Text>
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
            style={[
              styles.trendBadge,
              { backgroundColor: getTrendColor(trend) },
            ]}
          >
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        </View>
      </View>

      {/* Projection Section - Only show if games have been played */}
      {gamesPlayed > 0 && (
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
            Based on {gamesPlayed} of {FULL_SEASON_GAMES} games
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
    marginBottom: 4,
  },
  playerInfo: {
    fontSize: 14,
    color: theme.mutedText,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
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
    color: theme.primary,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.text,
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
  projectionCard: {
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginTop: 16,
    width: '100%',
    maxWidth: 400,
  },
  projectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.mutedText,
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
    color: theme.mutedText,
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
});

export default ValueCard;
