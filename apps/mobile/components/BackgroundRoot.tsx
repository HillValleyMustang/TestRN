/**
 * BackgroundRoot Component
 * Aurora background with 3 animated radial gradient blobs
 * Reference: docs/BACKGROUND_LAYER_SPEC_AURORA_REQUIRED_NOISE_OPTIONAL.md
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function BackgroundRoot() {
  // Base scale values that will be animated
  const scaleA = useRef(new Animated.Value(1)).current;
  const scaleB = useRef(new Animated.Value(1)).current;
  const scaleC = useRef(new Animated.Value(1)).current;

  // Blob specifications
  const blobA = {
    cx: -0.2 * SCREEN_WIDTH,
    cy: -0.25 * SCREEN_HEIGHT,
    baseRadius: 0.75 * SCREEN_WIDTH,
  };

  const blobB = {
    cx: 1.1 * SCREEN_WIDTH,
    cy: 0.1 * SCREEN_HEIGHT,
    baseRadius: 0.9 * SCREEN_WIDTH,
  };

  const blobC = {
    cx: 0.2 * SCREEN_WIDTH,
    cy: 1.1 * SCREEN_HEIGHT,
    baseRadius: 0.9 * SCREEN_WIDTH,
  };

  // Create interpolated radius values
  const radiusA = scaleA.interpolate({
    inputRange: [0.96, 1.06],
    outputRange: [blobA.baseRadius * 0.96, blobA.baseRadius * 1.06],
  });

  const radiusB = scaleB.interpolate({
    inputRange: [0.96, 1.06],
    outputRange: [blobB.baseRadius * 0.96, blobB.baseRadius * 1.06],
  });

  const radiusC = scaleC.interpolate({
    inputRange: [0.96, 1.06],
    outputRange: [blobC.baseRadius * 0.96, blobC.baseRadius * 1.06],
  });

  useEffect(() => {
    // Animation function that loops between 0.96 and 1.06
    // Delay is applied ONCE before the loop, not on every iteration
    const createAnimation = (
      animatedValue: Animated.Value,
      duration: number,
      delay: number
    ) => {
      const loopAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.06,
            duration: duration / 2,
            useNativeDriver: false, // SVG animations don't support native driver
          }),
          Animated.timing(animatedValue, {
            toValue: 0.96,
            duration: duration / 2,
            useNativeDriver: false,
          }),
        ])
      );

      // If there's a delay, apply it once before starting the loop
      if (delay > 0) {
        return Animated.sequence([
          Animated.delay(delay),
          loopAnimation,
        ]);
      }
      
      return loopAnimation;
    };

    // Start all animations
    const animA = createAnimation(scaleA, 15000, 0);
    const animB = createAnimation(scaleB, 16000, 4000);
    const animC = createAnimation(scaleC, 17000, 8000);

    animA.start();
    animB.start();
    animC.start();

    // Cleanup
    return () => {
      animA.stop();
      animB.stop();
      animC.stop();
    };
  }, [scaleA, scaleB, scaleC]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base Background */}
      <View style={styles.base} />

      {/* Aurora SVG Layer */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
      >
        <Defs>
          {/* Purple Radial Gradient */}
          <RadialGradient id="purpleGrad" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#A78BFA" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </RadialGradient>

          {/* Cyan Radial Gradient */}
          <RadialGradient id="cyanGrad" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#67E8F9" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#67E8F9" stopOpacity="0" />
          </RadialGradient>

          {/* Pink Radial Gradient */}
          <RadialGradient id="pinkGrad" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#FDA4AF" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FDA4AF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Blob A - Purple */}
        <AnimatedCircle
          cx={blobA.cx}
          cy={blobA.cy}
          r={radiusA}
          fill="url(#purpleGrad)"
        />

        {/* Blob B - Pink (top-right) */}
        <AnimatedCircle
          cx={blobB.cx}
          cy={blobB.cy}
          r={radiusB}
          fill="url(#pinkGrad)"
        />

        {/* Blob C - Cyan (bottom) */}
        <AnimatedCircle
          cx={blobC.cx}
          cy={blobC.cy}
          r={radiusC}
          fill="url(#cyanGrad)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAFAFA',
  },
});
