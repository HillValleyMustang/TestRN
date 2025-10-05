import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './contexts/auth-context';
import { DataProvider } from './contexts/data-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <StatusBar style="light" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="workout" options={{ title: 'Log Workout' }} />
            <Stack.Screen name="history" options={{ title: 'Workout History' }} />
            <Stack.Screen name="workout-detail" options={{ title: 'Workout Details' }} />
            <Stack.Screen name="exercise-picker" options={{ title: 'Select Exercise' }} />
          </Stack>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
