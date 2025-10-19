import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'My Fitness Trainer Mobile',
  slug: 'my-fitness-trainer-mobile',
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
    bundleIdentifier: 'com.myfitnesstrainer.mobile',
  },
  android: {
    package: 'com.myfitnesstrainer.mobile',
  },
  plugins: ['expo-router', 'expo-font'],
  fonts: [
    'Poppins_300Light',
    'Poppins_400Regular',
    'Poppins_500Medium',
    'Poppins_600SemiBold',
    'Poppins_700Bold',
  ],
});
