import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./_contexts/auth-context";
import { DataProvider } from "./_contexts/data-context";
import { PreferencesProvider } from "./_contexts/preferences-context";
import { SyncManagerInitializer } from "./_components/SyncManagerInitializer";
import { WorkoutFlowProvider } from "./_contexts/workout-flow-context";
import { UnsavedChangesModal } from "./_components/workout/UnsavedChangesModal";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <DataProvider>
            <WorkoutFlowProvider>
              <StatusBar style="light" />
              <SyncManagerInitializer />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="login"
                  options={{ headerShown: false, presentation: "modal" }}
                />
                <Stack.Screen
                  name="history"
                  options={{ headerShown: true, title: "Workout History" }}
                />
                <Stack.Screen
                  name="workout-detail"
                  options={{ headerShown: true, title: "Workout Details" }}
                />
                <Stack.Screen
                  name="exercise-picker"
                  options={{ headerShown: true, title: "Select Exercise" }}
                />
                <Stack.Screen
                  name="templates"
                  options={{ headerShown: true, title: "Templates" }}
                />
                <Stack.Screen
                  name="measurements"
                  options={{ headerShown: true, title: "Body Measurements" }}
                />
                <Stack.Screen
                  name="measurements-history"
                  options={{ headerShown: true, title: "Measurements History" }}
                />
                <Stack.Screen
                  name="gyms"
                  options={{ headerShown: true, title: "My Gyms" }}
                />
                <Stack.Screen
                  name="goals-list"
                  options={{ headerShown: true, title: "Goals" }}
                />
                <Stack.Screen
                  name="create-goal"
                  options={{ headerShown: true, title: "Create Goal" }}
                />
                <Stack.Screen
                  name="gym-photo-analyzer"
                  options={{ headerShown: true, title: "Analyze Gym" }}
                />
                <Stack.Screen
                  name="ai-program-generator"
                  options={{ headerShown: true, title: "AI Program Generator" }}
                />
              </Stack>
              <UnsavedChangesModal />
            </WorkoutFlowProvider>
          </DataProvider>
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
