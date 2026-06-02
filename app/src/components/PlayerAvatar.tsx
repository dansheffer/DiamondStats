import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { theme } from '../theme/colors';

interface PlayerAvatarProps {
  mlbId?: number;
  size?: number;
}

const PLACEHOLDER = require('../../../assets/player-placeholder.png');
const TIMEOUT_MS = 4000; // fall back to placeholder after 4 s

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ mlbId, size = 60 }) => {
  const [useFallback, setUseFallback] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mlbId) {
      setUseFallback(true);
      return;
    }
    // Start a timeout — if the image hasn't loaded/errored by TIMEOUT_MS, show placeholder
    timerRef.current = setTimeout(() => setUseFallback(true), TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mlbId]);

  const headshotUrl = mlbId
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/w_213,q_auto:best,f_auto/v1/people/${mlbId}/headshot/67/current`
    : null;

  const imageSrc =
    headshotUrl && !useFallback ? { uri: headshotUrl } : PLACEHOLDER;

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleError = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setUseFallback(true);
  };

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
        defaultSource={PLACEHOLDER}
        onLoad={handleLoad}
        onError={handleError}
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
