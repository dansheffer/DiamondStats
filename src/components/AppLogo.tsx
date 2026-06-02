import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function AppLogo() {
  return (
    <View style={styles.container}>
      <View style={styles.outerRing}>
        <View style={styles.innerRing}>
          <View style={styles.badge}>
            <View style={styles.mound} />
            <View style={styles.pitcherHead} />
            <View style={styles.pitcherTorso} />
            <View style={styles.pitcherThrowArm} />
            <View style={styles.pitcherGloveArm} />
            <View style={styles.pitcherBackLeg} />
            <View style={styles.pitcherFrontLeg} />
            <View style={styles.ball} />
          </View>
        </View>
      </View>
      <Text style={styles.wordmark}>Diamond Stats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 10,
  },
  outerRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#0f172a',
    borderColor: '#dbeafe',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  innerRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mound: {
    position: 'absolute',
    bottom: 9,
    width: 42,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#374151',
  },
  pitcherHead: {
    position: 'absolute',
    top: 16,
    left: 28,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  pitcherTorso: {
    position: 'absolute',
    top: 24,
    left: 30,
    width: 4,
    height: 17,
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '-16deg' }],
  },
  pitcherThrowArm: {
    position: 'absolute',
    top: 20,
    left: 12,
    width: 22,
    height: 3,
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '-22deg' }],
  },
  pitcherGloveArm: {
    position: 'absolute',
    top: 29,
    left: 31,
    width: 16,
    height: 3,
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '34deg' }],
  },
  pitcherBackLeg: {
    position: 'absolute',
    top: 40,
    left: 30,
    width: 3,
    height: 14,
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '8deg' }],
  },
  pitcherFrontLeg: {
    position: 'absolute',
    top: 42,
    left: 31,
    width: 19,
    height: 3,
    backgroundColor: '#f8fafc',
    transform: [{ rotate: '-28deg' }],
  },
  ball: {
    position: 'absolute',
    top: 11,
    left: 8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
  },
  wordmark: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
