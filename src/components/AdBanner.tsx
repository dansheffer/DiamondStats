import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { getAdsRemoved } from '../utils/store';

/**
 * A small banner ad shown at the bottom of the home screen.
 * Respects the user's "remove ads" purchase.
 * Gracefully degrades if google-mobile-ads is unavailable.
 */

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  BannerAd = admob.BannerAd;
  BannerAdSize = admob.BannerAdSize;
  TestIds = admob.TestIds;
} catch {
  /* Not available — render nothing */
}

// Replace with your real ad unit ID from AdMob before publishing
const AD_UNIT_ID = TestIds?.BANNER ?? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY';

export default function AdBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const removed = await getAdsRemoved();
      if (!cancelled) setShow(!removed);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show || !BannerAd) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize?.ANCHORED_ADAPTIVE_BANNER ?? 'BANNER'}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setShow(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: 0,
  },
});
