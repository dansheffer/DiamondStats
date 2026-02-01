import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';

interface PlayerAvatarProps {
  mlbId?: number;
  size?: number;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ mlbId, size = 60 }) => {
  const [imageError, setImageError] = useState(false);

  // Generate MLB headshot URL
  // MLB provides headshots at: https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best,f_auto/v1/people/{mlbId}/headshot/67/current
  const headshotUrl = mlbId
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best,f_auto/v1/people/${mlbId}/headshot/67/current`
    : null;

  // Fallback to placeholder if mlbId is missing or image fails to load
  const imageSrc =
    headshotUrl && !imageError
      ? { uri: headshotUrl }
      : require('../../../assets/player-placeholder.png');

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Image
        source={imageSrc}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
        onError={() => setImageError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: theme.border,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  image: {
    resizeMode: 'cover',
  },
});

export default PlayerAvatar;
