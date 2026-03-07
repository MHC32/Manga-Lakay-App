// src/components/ui/Skeleton.tsx
import React, {useEffect} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import {colors} from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const Skeleton = ({width = '100%', height = 16, borderRadius = 8, style}: SkeletonProps) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {duration: 1200, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      shimmer.value,
      [0, 1],
      [colors.bgElevated, colors.bgCard],
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        {width: width as number, height, borderRadius},
        animatedStyle,
        style,
      ]}
    />
  );
};

// Preset pour une carte manga verticale
export const MangaCardSkeleton = () => (
  <View style={skeletonStyles.card}>
    <Skeleton width="100%" height={160} borderRadius={10} />
    <Skeleton width="80%" height={14} style={{marginTop: 8}} />
    <Skeleton width="50%" height={12} style={{marginTop: 6}} />
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: 12,
  },
});

export default Skeleton;
