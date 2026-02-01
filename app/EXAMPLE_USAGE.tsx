import React from 'react';
import { SafeAreaView } from 'react-native';
import ValueCard from './src/components/valuecard';

/**
 * Example usage of the ValueCard component with Mets theme and MLB headshot integration
 * 
 * This demonstrates how to pass player data to the ValueCard component.
 * The component will automatically fetch the player's headshot from MLB using the mlbId.
 */

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Example 1: Using mlbId to fetch MLB headshot */}
      <ValueCard
        playerName="Pete Alonso"
        position="1B"
        team="New York Mets"
        careerWAR={18.5}
        seasonWAR={4.2}
        gamesPlayed={85}
        trend="Rising"
        mlbId={624413} // Pete Alonso's MLB ID
      />

      {/* Example 2: Using custom headshotUrl */}
      {/* 
      <ValueCard
        playerName="Francisco Lindor"
        position="SS"
        team="New York Mets"
        careerWAR={42.3}
        seasonWAR={5.8}
        gamesPlayed={100}
        trend="Stable"
        headshotUrl="https://example.com/custom-headshot.jpg"
      />
      */}

      {/* Example 3: Without headshot (will use placeholder) */}
      {/* 
      <ValueCard
        playerName="Unknown Player"
        position="DH"
        team="Unknown Team"
        careerWAR={10.0}
        seasonWAR={2.5}
        gamesPlayed={50}
        trend="Declining"
      />
      */}
    </SafeAreaView>
  );
}
