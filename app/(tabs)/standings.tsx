import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Map MLB API abbreviations to ESPN CDN slugs (only overrides needed) */
const ESPN_ABBREV: Record<string, string> = { AZ: 'ari', CWS: 'chw', WSH: 'wsh' };
function espnLogoUrl(abbrev: string): string {
  const slug = ESPN_ABBREV[abbrev.toUpperCase()] ?? abbrev.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/mlb/500/${slug}.png`;
}

/** Tiny component that shows team logo with abbreviation fallback */
const TeamLogo: React.FC<{ teamId: number; abbrev: string; size: number }> = ({
  abbrev,
  size,
}) => {
  const [failed, setFailed] = useState(false);
  const radius = size / 2;

  if (failed || !abbrev) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.background,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Text style={{ color: theme.mutedText, fontSize: size * 0.38, fontWeight: '800' }}>
          {(abbrev ?? '').slice(0, 3)}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: espnLogoUrl(abbrev) }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        marginRight: 8,
        backgroundColor: theme.background,
      }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
};
import {
  fetchStandings,
  type StandingRow,
} from '../../src/api/mlb';
import { getCached, invalidateCache } from '../../src/utils/cache';
import { theme, shadows, radii } from '../../src/theme/colors';
import { useResponsive } from '../../src/utils/useResponsive';

const STANDINGS_TTL = 15 * 60 * 1000; // 15 min

export default function StandingsTab() {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (skipCache = false) => {
    try {
      if (skipCache) await invalidateCache('standings');
      const data = await getCached('standings', fetchStandings, STANDINGS_TTL);
      setStandings(data);
    } catch {
      /* keep whatever we have */
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadData().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  /** true if every team is 0-0 (pre-season / spring training) */
  const isPreSeason = useMemo(
    () => standings.length > 0 && standings.every((r) => r.wins === 0 && r.losses === 0),
    [standings],
  );

  /* Group standings: league → division */
  const standingsByLeague = useMemo(() => {
    const grouped = standings.reduce<Record<string, Record<string, StandingRow[]>>>(
      (acc, row) => {
        if (!acc[row.leagueName]) acc[row.leagueName] = {};
        if (!acc[row.leagueName][row.divisionName])
          acc[row.leagueName][row.divisionName] = [];
        acc[row.leagueName][row.divisionName].push(row);
        return acc;
      },
      {},
    );

    const divOrder = (name: string) => {
      if (name.includes('East')) return 0;
      if (name.includes('Central')) return 1;
      if (name.includes('West')) return 2;
      return 3;
    };

    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a.includes('National')) return -1;
        if (b.includes('National')) return 1;
        return a.localeCompare(b);
      })
      .map(([league, divisions]) => ({
        league,
        divisions: Object.entries(divisions)
          .sort(([a], [b]) => divOrder(a) - divOrder(b))
          .map(([division, rows]) => ({ division, rows })),
      }));
  }, [standings]);

  /* ---- Render --------------------------------------------------- */

  const { isTablet, maxContentWidth, outerPadding, fontScale } = useResponsive();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { padding: outerPadding, alignItems: isTablet ? 'center' : undefined }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={[styles.surface, maxContentWidth ? { maxWidth: maxContentWidth, width: '100%' } : undefined]}>
        {/* Tab header */}
        <View style={styles.topTabs}>
          <View style={[styles.topTab, styles.topTabActive]}>
            <Text style={[styles.topTabText, styles.topTabTextActive]}>Divisional</Text>
          </View>
          <View style={styles.topTab}>
            <Text style={styles.topTabText}>Wild Card</Text>
          </View>
        </View>

        {isPreSeason && (
          <View style={styles.preSeasonBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="leaf" size={14} color="#16A34A" />
              <Text style={styles.preSeasonText}>
                Spring Training — Regular season standings will update once the season begins
              </Text>
            </View>
          </View>
        )}

        {standingsByLeague.map((leagueBlock) => (
          <View key={leagueBlock.league}>
            <View style={styles.leagueHeaderRow}>
              <Text style={[styles.leagueHeaderText, isTablet && { fontSize: 24 * fontScale }]}>{leagueBlock.league}</Text>
            </View>

            {leagueBlock.divisions.map((divisionBlock) => (
              <View key={`${leagueBlock.league}-${divisionBlock.division}`}>
                {isTablet ? (
                  /* iPad: no horizontal scroll needed — table fits */
                  <View style={styles.table}>
                    <View style={styles.divHeaderRow}>
                      <View style={[styles.teamCol, isTablet && { width: 160 }]}>
                        <Text style={styles.divLabel}>{divisionBlock.division}</Text>
                      </View>
                      <Text style={[styles.colLabel, styles.colW, isTablet && { width: 48 }]}>W</Text>
                      <Text style={[styles.colLabel, styles.colL, isTablet && { width: 48 }]}>L</Text>
                      <Text style={[styles.colLabel, styles.colPct, isTablet && { width: 60 }]}>PCT</Text>
                      <Text style={[styles.colLabel, styles.colGb, isTablet && { width: 52 }]}>GB</Text>
                      <Text style={[styles.colLabel, styles.colL10, isTablet && { width: 52 }]}>L10</Text>
                      <Text style={[styles.colLabel, styles.colStrk, isTablet && { width: 56 }]}>STRK</Text>
                      <Text style={[styles.colLabel, styles.colRs, isTablet && { width: 56 }]}>RS</Text>
                    </View>
                    {divisionBlock.rows
                      .slice()
                      .sort((a, b) => a.divisionRank - b.divisionRank)
                      .map((row) => (
                        <View key={row.id} style={styles.teamRow}>
                          <View style={[styles.teamCol, isTablet && { width: 160 }]}>
                            <TeamLogo teamId={row.teamId} abbrev={row.teamAbbrev} size={isTablet ? 36 : 30} />
                            <Text style={[styles.teamAbbrev, isTablet && { fontSize: 16 }]}>{row.teamAbbrev}</Text>
                          </View>
                          <Text style={[styles.stat, styles.colW, isTablet && { width: 48, fontSize: 15 }]}>{row.wins}</Text>
                          <Text style={[styles.stat, styles.colL, isTablet && { width: 48, fontSize: 15 }]}>{row.losses}</Text>
                          <Text style={[styles.statBold, styles.colPct, isTablet && { width: 60, fontSize: 15 }]}>{row.winPct}</Text>
                          <Text style={[styles.stat, styles.colGb, isTablet && { width: 52, fontSize: 15 }]}>{row.gamesBack}</Text>
                          <Text style={[styles.stat, styles.colL10, isTablet && { width: 52, fontSize: 15 }]}>{row.lastTenRecord}</Text>
                          <Text style={[styles.stat, styles.colStrk, isTablet && { width: 56, fontSize: 15 }]}>{row.streak}</Text>
                          <Text style={[styles.stat, styles.colRs, isTablet && { width: 56, fontSize: 15 }]}>{row.runsScored}</Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  /* Phone: horizontal scroll for table */
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.table}>
                    {/* Column headers */}
                    <View style={styles.divHeaderRow}>
                      <View style={styles.teamCol}>
                        <Text style={styles.divLabel}>{divisionBlock.division}</Text>
                      </View>
                      <Text style={[styles.colLabel, styles.colW]}>W</Text>
                      <Text style={[styles.colLabel, styles.colL]}>L</Text>
                      <Text style={[styles.colLabel, styles.colPct]}>PCT</Text>
                      <Text style={[styles.colLabel, styles.colGb]}>GB</Text>
                      <Text style={[styles.colLabel, styles.colL10]}>L10</Text>
                      <Text style={[styles.colLabel, styles.colStrk]}>STRK</Text>
                      <Text style={[styles.colLabel, styles.colRs]}>RS</Text>
                    </View>

                    {/* Team rows */}
                    {divisionBlock.rows
                      .slice()
                      .sort((a, b) => a.divisionRank - b.divisionRank)
                      .map((row) => (
                        <View key={row.id} style={styles.teamRow}>
                          <View style={styles.teamCol}>
                            <TeamLogo teamId={row.teamId} abbrev={row.teamAbbrev} size={30} />
                            <Text style={styles.teamAbbrev}>{row.teamAbbrev}</Text>
                          </View>
                          <Text style={[styles.stat, styles.colW]}>{row.wins}</Text>
                          <Text style={[styles.stat, styles.colL]}>{row.losses}</Text>
                          <Text style={[styles.statBold, styles.colPct]}>{row.winPct}</Text>
                          <Text style={[styles.stat, styles.colGb]}>{row.gamesBack}</Text>
                          <Text style={[styles.stat, styles.colL10]}>{row.lastTenRecord}</Text>
                          <Text style={[styles.stat, styles.colStrk]}>{row.streak}</Text>
                          <Text style={[styles.stat, styles.colRs]}>{row.runsScored}</Text>
                        </View>
                      ))}
                  </View>
                </ScrollView>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.background },
  content: { padding: 12, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  surface: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },

  topTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  topTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  topTabActive: { borderBottomColor: theme.accent },
  topTabText: { color: theme.mutedText, fontSize: 15, fontWeight: '600' },
  topTabTextActive: { color: theme.text },

  leagueHeaderRow: { paddingHorizontal: 14, paddingTop: 20, paddingBottom: 10 },
  leagueHeaderText: { color: theme.primary, fontSize: 21, fontWeight: '800' },

  table: { minWidth: 420 },
  divHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10, 42, 102, 0.03)',
  },
  teamCol: { width: 115, flexDirection: 'row', alignItems: 'center' },
  divLabel: {
    color: theme.mutedText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  colLabel: { color: theme.mutedText, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  colW: { width: 36 },
  colL: { width: 36 },
  colPct: { width: 46 },
  colGb: { width: 40 },
  colL10: { width: 38 },
  colStrk: { width: 44 },
  colRs: { width: 46 },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  teamAbbrev: { color: theme.text, fontSize: 14, fontWeight: '700' },
  stat: { color: theme.textSecondary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  statBold: { color: theme.primary, fontSize: 13, fontWeight: '800', textAlign: 'center' },

  preSeasonBanner: {
    backgroundColor: 'rgba(240, 253, 244, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  preSeasonText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
