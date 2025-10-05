import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/auth-context';
import { DataProvider } from './contexts/data-context';
import { PreferencesProvider } from './contexts/preferences-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <DataProvider>
            <StatusBar style="light" />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="workout" options={{ title: 'Log Workout' }} />
              <Stack.Screen name="history" options={{ title: 'Workout History' }} />
              <Stack.Screen name="workout-detail" options={{ title: 'Workout Details' }} />
              <Stack.Screen name="exercise-picker" options={{ title: 'Select Exercise' }} />
              <Stack.Screen name="templates" options={{ title: 'Templates' }} />
              <Stack.Screen name="progress" options={{ title: 'Progress & Analytics' }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            </Stack>
          </DataProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
