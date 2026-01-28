---
paths:
  - "apps/mobile/**/*"
---
# Mobile-Specific Patterns

## Styling
- Use React Native `StyleSheet.create()` - NOT Tailwind CSS
- NativeWind is NOT used in this project
- Use `expo-linear-gradient` for gradients
- Use `react-native-reanimated` for animations

## Navigation
- Expo Router (file-based routing) in `apps/mobile/app/`
- Tabs: `apps/mobile/app/(tabs)/`
- Use `useRouter()` and `useFocusEffect()` from `expo-router`
- Use `useFocusEffect` for screen-level data refreshes

## Platform APIs
- File system: `expo-file-system`
- Image picker: `expo-image-picker`
- Haptics: `expo-haptics` for feedback
- Network: `@react-native-community/netinfo` for connectivity

## Component Structure
- Use React Native components (`View`, `Text`, `ScrollView`, etc.)
- Keep components focused - extract complex logic to hooks or utilities
- Custom components in `apps/mobile/components/`
- App-specific components in `apps/mobile/app/_components/`
