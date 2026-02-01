import { View, StyleSheet } from 'react-native';
import ValueCard from '../src/components/ValueCard';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <ValueCard
        name="Sample Player"
        position="OF"
        team="NY"
        careerWar={32.4}
        seasonWar={4.1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
});