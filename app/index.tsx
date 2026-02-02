import React from "react";
import { View, StyleSheet } from "react-native";
import ValueCard from "./src/components/Valuecard";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ValueCard
        playerName="Juan Soto"
        position="RF"
        team="New York Mets"
        careerWAR={36.8}
        seasonWAR={5.2}
        gamesPlayed={110}
        trend="Rising"
        mlbId={665742}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});