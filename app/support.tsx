import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import { theme, shadows, radii } from '../src/theme/colors';
import { useResponsive } from '../src/utils/useResponsive';
import {
  TIP_PRODUCTS,
  REMOVE_ADS_PRODUCT,
  tipLabel,
  getAdsRemoved,
  setAdsRemoved,
} from '../src/utils/store';

/* ── Tip‑jar buttons with graceful IAP fallback ─────────────────── */

let iapModule: typeof import('react-native-iap') | null = null;
try {
  iapModule = require('react-native-iap');
} catch {
  /* react-native-iap unavailable (e.g. Expo Go / simulator) */
}

export default function SupportScreen() {
  const { isTablet } = useResponsive();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [adsRemoved, setAdsRemovedState] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});

  /* ── Init IAP ───────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const removed = await getAdsRemoved();
      if (!cancelled) setAdsRemovedState(removed);

      if (!iapModule) return;
      try {
        await iapModule.initConnection();
        const allIds = [...TIP_PRODUCTS, REMOVE_ADS_PRODUCT];
        const products = await (iapModule as any).getProducts({ skus: allIds as unknown as string[] });
        const map: Record<string, string> = {};
        products.forEach((p: any) => {
          map[p.productId] = p.localizedPrice;
        });
        if (!cancelled) {
          setPrices(map);
        }
      } catch {
        /* IAP unavailable — buttons will still render with default prices */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Purchase handler ───────────────────────────────────────────── */
  const handlePurchase = useCallback(async (productId: string) => {
    if (!iapModule) {
      Alert.alert(
        'Not Available',
        'In-app purchases are not available in this build. They will work in the App Store version.',
      );
      return;
    }
    setPurchasing(productId);
    try {
      await iapModule.requestPurchase({ sku: productId } as any);
      if (productId === REMOVE_ADS_PRODUCT) {
        await setAdsRemoved(true);
        setAdsRemovedState(true);
      }
      Alert.alert('Thank You! 🎉', 'Your support means the world. Enjoy the game!');
    } catch (err: any) {
      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again later.');
      }
    } finally {
      setPurchasing(null);
    }
  }, []);

  /* ── Restore purchases ──────────────────────────────────────────── */
  const handleRestore = useCallback(async () => {
    if (!iapModule) return;
    try {
      const purchases = await iapModule.getAvailablePurchases();
      const hasRemoveAds = purchases.some((p) => p.productId === REMOVE_ADS_PRODUCT);
      if (hasRemoveAds) {
        await setAdsRemoved(true);
        setAdsRemovedState(true);
        Alert.alert('Restored', 'Your ad-free purchase has been restored!');
      } else {
        Alert.alert('Nothing to Restore', 'No previous purchases found.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    }
  }, []);

  /* ── Rate the app ───────────────────────────────────────────────── */
  const handleRate = useCallback(async () => {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
    } else {
      // Fallback: open App Store page
      void Linking.openURL('https://apps.apple.com/app/id0000000000'); // Replace with real ID after submission
    }
  }, []);

  const defaultPrices: Record<string, string> = {
    [TIP_PRODUCTS[0]]: '$0.99',
    [TIP_PRODUCTS[1]]: '$2.99',
    [TIP_PRODUCTS[2]]: '$4.99',
    [REMOVE_ADS_PRODUCT]: '$1.99',
  };
  const getPrice = (id: string) => prices[id] ?? defaultPrices[id] ?? '';

  return (
    <ScrollView contentContainerStyle={[styles.container, isTablet && { alignItems: 'center' }]}>
      <View style={[styles.inner, isTablet && { maxWidth: 600 }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💎</Text>
          <Text style={styles.heroTitle}>Support Diamond Stats</Text>
          <Text style={styles.heroSubtitle}>
            Diamond Stats is free and always will be. If you enjoy the app, consider
            leaving a tip to support ongoing development!
          </Text>
        </View>

        {/* Tip Jar */}
        <Text style={styles.sectionLabel}>TIP JAR</Text>
        <View style={styles.tipRow}>
          {(TIP_PRODUCTS as readonly string[]).map((id) => {
            const meta = tipLabel(id);
            const isActive = purchasing === id;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.tipCard, pressed && styles.pressed]}
                onPress={() => void handlePurchase(id)}
                disabled={!!purchasing}
              >
                <Text style={styles.tipEmoji}>{meta.emoji}</Text>
                <Text style={styles.tipTitle}>{meta.title}</Text>
                {isActive ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text style={styles.tipPrice}>{getPrice(id)}</Text>
                )}
                <Text style={styles.tipSubtitle}>{meta.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Remove Ads */}
        {!adsRemoved && (
          <>
            <Text style={styles.sectionLabel}>REMOVE ADS</Text>
            <Pressable
              style={({ pressed }) => [styles.removeAdsCard, pressed && styles.pressed]}
              onPress={() => void handlePurchase(REMOVE_ADS_PRODUCT)}
              disabled={!!purchasing}
            >
              <View style={styles.removeAdsInner}>
                <Ionicons name="eye-off-outline" size={24} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.removeAdsTitle}>Remove Ads Forever</Text>
                  <Text style={styles.removeAdsSubtitle}>One-time purchase — no subscription</Text>
                </View>
                {purchasing === REMOVE_ADS_PRODUCT ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text style={styles.removeAdsPrice}>{getPrice(REMOVE_ADS_PRODUCT)}</Text>
                )}
              </View>
            </Pressable>
          </>
        )}

        {adsRemoved && (
          <View style={styles.adsRemovedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={styles.adsRemovedText}>Ads removed — thank you!</Text>
          </View>
        )}

        {/* Actions */}
        <Text style={styles.sectionLabel}>MORE</Text>
        <View style={styles.actionsColumn}>
          <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]} onPress={handleRate}>
            <Ionicons name="star-outline" size={20} color={theme.accent} />
            <Text style={styles.actionText}>Rate Diamond Stats</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.mutedText} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={() => void Linking.openURL('https://dansheffer.github.io/DiamondStats/privacy-policy.html')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.accent} />
            <Text style={styles.actionText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.mutedText} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={() => void Linking.openURL('mailto:dsheffer10@icloud.com?subject=Diamond%20Stats%20Feedback')}
          >
            <Ionicons name="mail-outline" size={20} color={theme.accent} />
            <Text style={styles.actionText}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.mutedText} />
          </Pressable>

          <Pressable style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]} onPress={handleRestore}>
            <Ionicons name="refresh-outline" size={20} color={theme.accent} />
            <Text style={styles.actionText}>Restore Purchases</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.mutedText} />
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Diamond Stats v1.0.0</Text>
          <Text style={styles.footerText}>Made with ❤️ for baseball fans</Text>
          <Text style={styles.footerDisclaimer}>
            Not affiliated with or endorsed by Major League Baseball.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.background,
    padding: 16,
    paddingBottom: 120,
  },
  inner: { width: '100%', gap: 12 },
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  heroEmoji: { fontSize: 48 },
  heroTitle: {
    color: theme.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  sectionLabel: {
    color: theme.mutedText,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 4,
  },

  /* Tip cards */
  tipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  tipEmoji: { fontSize: 32 },
  tipTitle: { color: theme.primary, fontWeight: '800', fontSize: 15 },
  tipPrice: { color: theme.accent, fontWeight: '900', fontSize: 20 },
  tipSubtitle: { color: theme.mutedText, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  /* Remove ads */
  removeAdsCard: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    ...shadows.glass,
  },
  removeAdsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeAdsTitle: { color: theme.text, fontWeight: '800', fontSize: 16 },
  removeAdsSubtitle: { color: theme.mutedText, fontSize: 12, fontWeight: '600' },
  removeAdsPrice: { color: theme.accent, fontWeight: '900', fontSize: 20 },

  adsRemovedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  adsRemovedText: { color: theme.success, fontWeight: '700', fontSize: 14 },

  /* Actions */
  actionsColumn: {
    backgroundColor: theme.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    overflow: 'hidden',
    ...shadows.glass,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  actionText: { flex: 1, color: theme.text, fontWeight: '700', fontSize: 15 },

  pressed: { opacity: 0.7 },

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    gap: 4,
  },
  footerText: { color: theme.mutedText, fontSize: 12, fontWeight: '600' },
  footerDisclaimer: { color: theme.mutedText, fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
});
