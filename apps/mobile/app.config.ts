import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'My Fitness Trainer',
  slug: 'my-fitness-trainer',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'myfitnesstrainer',
  userInterfaceStyle: 'automatic',
  assetBundlePatterns: ['**/*'],
  jsEngine: 'hermes',
  updates: {
    fallbackToCacheTimeout: 0,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.myfitnesstrainer.app',
  },
  android: {
    package: 'com.myfitnesstrainer.app',
  },
  plugins: ['expo-router'],
});
