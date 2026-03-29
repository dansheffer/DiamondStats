import AsyncStorage from '@react-native-async-storage/async-storage';

/* ── Product IDs (must match App Store Connect) ─────────────────── */
export const TIP_PRODUCTS = [
  'com.dsheffer.diamondstats1.tip.small',    // $0.99
  'com.dsheffer.diamondstats1.tip.medium',   // $2.99
  'com.dsheffer.diamondstats1.tip.large',    // $4.99
] as const;

export const REMOVE_ADS_PRODUCT = 'com.dsheffer.diamondstats1.removeads';

const ADS_REMOVED_KEY = '@diamond_stats_ads_removed';

/* ── Ad-free state ──────────────────────────────────────────────── */

export async function getAdsRemoved(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ADS_REMOVED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setAdsRemoved(removed: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ADS_REMOVED_KEY, removed ? 'true' : 'false');
  } catch {
    /* best-effort */
  }
}

/* ── Session counter for review prompt ──────────────────────────── */

const SESSION_COUNT_KEY = '@diamond_stats_session_count';
const REVIEW_PROMPTED_KEY = '@diamond_stats_review_prompted';

export async function trackSession(): Promise<{ count: number; shouldPromptReview: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
    const count = (parseInt(raw ?? '0', 10) || 0) + 1;
    await AsyncStorage.setItem(SESSION_COUNT_KEY, String(count));

    const prompted = await AsyncStorage.getItem(REVIEW_PROMPTED_KEY);
    // Prompt after 5 sessions, only once
    const shouldPromptReview = count >= 5 && prompted !== 'true';
    return { count, shouldPromptReview };
  } catch {
    return { count: 0, shouldPromptReview: false };
  }
}

export async function markReviewPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_PROMPTED_KEY, 'true');
  } catch {
    /* best-effort */
  }
}

/* ── Tip label helper ───────────────────────────────────────────── */

export function tipLabel(productId: string): { emoji: string; title: string; subtitle: string } {
  if (productId.endsWith('.small')) return { emoji: '⚾', title: 'Single', subtitle: 'A small tip' };
  if (productId.endsWith('.medium')) return { emoji: '🏟️', title: 'Double', subtitle: 'A generous tip' };
  if (productId.endsWith('.large')) return { emoji: '🏆', title: 'Home Run', subtitle: 'An amazing tip' };
  return { emoji: '💎', title: 'Tip', subtitle: '' };
}
